"""The ``renderscope reference`` command.

Renders the ground-truth image a scene's quality metrics are measured against.

``BenchmarkRunner`` computes PSNR, SSIM, MSE and a convergence curve the moment
:meth:`SceneManager.get_reference_path` returns a file — and returns ``None``
until one exists. No reference has ever existed, so every published record has
either carried no quality block at all or compared a renderer against its own
higher-sample output, which measures convergence rather than accuracy.

This command produces that missing file, at the location the manifest declares
and the runner reads, so generating a reference and consuming one cannot drift
apart. A provenance sidecar is written beside it recording exactly what produced
it: a quality number is only meaningful if you know what it was measured against.

The manifest nominates a renderer and sample count per scene. Those are the
defaults, so independently generated references stay comparable unless a user
deliberately overrides them.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any

import typer
from rich.panel import Panel
from rich.text import Text

from renderscope.utils.console import console, err_console

if TYPE_CHECKING:
    from renderscope.core.scene import SceneInfo

# Sidecar recording what produced a reference, written beside the image itself.
_PROVENANCE_SUFFIX = ".json"


def _provenance_path(image_path: Path) -> Path:
    """Path of the sidecar describing how *image_path* was produced."""
    return image_path.with_suffix(_PROVENANCE_SUFFIX)


def _fmt_duration(seconds: float) -> str:
    """Format a render duration for display."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes, secs = divmod(seconds, 60)
    if minutes < 60:
        return f"{int(minutes)}m {secs:.0f}s"
    hours, minutes = divmod(int(minutes), 60)
    return f"{hours}h {minutes}m"


def _print_plan(
    scene: SceneInfo,
    renderer_name: str,
    samples: int,
    width: int,
    height: int,
    target: Path,
    scene_format: str,
) -> None:
    """Summarise what is about to be rendered."""
    lines = Text()
    for label, value in (
        ("Scene", f"{scene.name} ({scene.id}, {scene_format})"),
        ("Renderer", renderer_name),
        ("Samples", f"{samples:,} spp"),
        ("Resolution", f"{width}x{height}"),
        ("Writes to", str(target)),
    ):
        lines.append(f"{label:<11}", style="dim")
        lines.append(f"{value}\n")
    lines.append(
        "\nReference renders are deliberately slow — this is the image every\n"
        "quality metric for this scene will be measured against.",
        style="dim",
    )
    console.print()
    console.print(Panel(lines, title="Reference Render", border_style="bright_blue"))
    console.print()


def reference_cmd(
    scene: str = typer.Option(
        ...,
        "--scene",
        "-s",
        help="Scene ID to render a reference for (e.g. 'cornell-box').",
    ),
    renderer: str | None = typer.Option(
        None,
        "--renderer",
        "-r",
        help=(
            "Renderer to use. Defaults to the renderer the scene manifest "
            "nominates as ground truth."
        ),
    ),
    samples: int | None = typer.Option(
        None,
        "--samples",
        "--spp",
        help=(
            "Samples per pixel. Defaults to the manifest's reference sample "
            "count. Lower values converge faster but make a weaker reference."
        ),
    ),
    resolution: str = typer.Option(
        "1920x1080",
        "--resolution",
        help="Render resolution as WIDTHxHEIGHT.",
    ),
    scenes_dir: Path | None = typer.Option(
        None,
        "--scenes-dir",
        help="Directory holding downloaded scenes. Defaults to ~/.renderscope/scenes/.",
    ),
    timeout: float = typer.Option(
        86400.0,
        "--timeout",
        help="Absolute timeout in seconds. Defaults to 24 hours.",
    ),
    max_bounces: int = typer.Option(8, "--max-bounces", help="Maximum ray bounce depth."),
    force: bool = typer.Option(
        False,
        "--force",
        help="Overwrite an existing reference render.",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Show what would be rendered without rendering anything.",
    ),
) -> None:
    """Render the ground-truth image a scene's quality metrics compare against.

    Writes to the location the scene manifest declares, which is exactly where
    'renderscope benchmark' looks. Once it exists, every benchmark for that
    scene reports real PSNR, SSIM, and MSE instead of omitting quality.

    \b
    Examples:
        renderscope reference --scene cornell-box
        renderscope reference --scene cornell-box --renderer pbrt --samples 65536
        renderscope reference --scene cornell-box --dry-run
    """
    from renderscope.cli.benchmark import _parse_resolution
    from renderscope.core.registry import registry
    from renderscope.core.scene import SceneManager, SceneNotFoundError
    from renderscope.models.settings import RenderSettings

    width, height = _parse_resolution(resolution)
    scene_manager = SceneManager(scenes_dir=scenes_dir)

    try:
        scene_info = scene_manager.get_scene(scene)
    except SceneNotFoundError as exc:
        err_console.print(f"[error]{exc}[/error]")
        raise typer.Exit(code=1) from exc

    if scene_info.reference is None:
        err_console.print(
            f"[error]Scene '{scene}' declares no reference render.[/error]\n"
            "Add a 'reference' block to its manifest entry naming the renderer, "
            "sample count, and image path before generating one."
        )
        raise typer.Exit(code=1)

    target = scene_manager.reference_target_path(scene)
    assert target is not None  # guaranteed by the reference check above

    if not scene_manager.is_downloaded(scene):
        err_console.print(
            f"[error]Scene '{scene}' has not been downloaded.[/error]\n"
            f"Run 'renderscope download-scenes --scene {scene}' first."
        )
        raise typer.Exit(code=1)

    if target.is_file() and not force:
        err_console.print(
            f"[error]A reference render already exists:[/error] {target}\n"
            "Every quality metric for this scene is measured against it, so "
            "replacing it silently would change published numbers. Pass --force "
            "if that is what you intend."
        )
        raise typer.Exit(code=1)

    # The manifest's nomination is the default so independently generated
    # references stay comparable with one another.
    renderer_id = renderer or scene_info.reference.renderer
    sample_count = samples if samples is not None else scene_info.reference.samples

    adapter = registry.get(renderer_id)
    if adapter is None:
        err_console.print(
            f"[error]Renderer '{renderer_id}' is not registered.[/error]\n"
            "Run 'renderscope list' to see the available renderers."
        )
        raise typer.Exit(code=1)

    version = adapter.detect()
    if version is None:
        err_console.print(
            f"[error]Renderer '{renderer_id}' is not installed on this system.[/error]\n"
            f"Run 'renderscope info {renderer_id}' for installation instructions."
        )
        raise typer.Exit(code=1)

    scene_format = scene_manager.get_compatible_format(scene, adapter.supported_formats())
    if scene_format is None:
        err_console.print(
            f"[error]{adapter.display_name} cannot read any format of "
            f"'{scene}'.[/error]\n"
            f"Renderer supports: {', '.join(adapter.supported_formats())}\n"
            f"Scene provides: {', '.join(sorted(scene_info.formats))}"
        )
        raise typer.Exit(code=1)

    _print_plan(scene_info, adapter.display_name, sample_count, width, height, target, scene_format)

    if dry_run:
        console.print("[dim]Dry run — nothing rendered.[/dim]\n")
        raise typer.Exit(code=0)

    extra: dict[str, Any] = {"timeout": timeout, "max_bounces": max_bounces}
    if scene_info.camera is not None:
        extra.update(
            camera_position=scene_info.camera.position,
            camera_target=scene_info.camera.target,
            camera_up=scene_info.camera.up,
            camera_fov=scene_info.camera.fov,
        )

    settings = RenderSettings(
        width=width, height=height, samples=sample_count, gpu=False, extra=extra
    )

    target.parent.mkdir(parents=True, exist_ok=True)
    scene_path = scene_manager.get_scene_path(scene, scene_format)

    try:
        result = adapter.render(scene_path, target, settings)
    except Exception as exc:
        err_console.print(f"\n[error]Reference render failed:[/error] {exc}\n")
        raise typer.Exit(code=1) from exc

    rendered = Path(result.output_path)
    if not rendered.is_file() or rendered.stat().st_size == 0:
        err_console.print(
            f"\n[error]The renderer reported success but produced no image at {rendered}.[/error]\n"
        )
        raise typer.Exit(code=1)

    _write_provenance(
        image_path=rendered,
        scene_id=scene,
        renderer_id=renderer_id,
        renderer_version=version,
        samples=sample_count,
        width=width,
        height=height,
        max_bounces=max_bounces,
        render_seconds=result.render_time_seconds,
    )

    console.print(f"[success]✓ Reference render written to[/success] [bold]{rendered}[/bold]")
    console.print(
        f"  {adapter.display_name} {version}, {sample_count:,} spp, "
        f"{_fmt_duration(result.render_time_seconds)}"
    )
    console.print(f"  [dim]provenance: {_provenance_path(rendered)}[/dim]")
    console.print(
        "\n[dim]Benchmarks for this scene will now report PSNR, SSIM, and MSE against it.[/dim]\n"
    )


def _write_provenance(
    *,
    image_path: Path,
    scene_id: str,
    renderer_id: str,
    renderer_version: str,
    samples: int,
    width: int,
    height: int,
    max_bounces: int,
    render_seconds: float,
) -> None:
    """Record what produced a reference, beside the reference itself.

    A quality metric is only interpretable if the reader knows what it was
    measured against. Without this, a reference is an anonymous EXR and nobody
    can tell a 65,536-spp ground truth from a hurried 64-spp stand-in.
    """
    from renderscope.utils.hardware import detect_hardware

    hardware = detect_hardware()
    provenance = {
        "scene": scene_id,
        "renderer": renderer_id,
        "renderer_version": renderer_version,
        "samples": samples,
        "resolution": [width, height],
        "max_bounces": max_bounces,
        "render_time_seconds": round(render_seconds, 3),
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        "generated_on": {
            "cpu": hardware.cpu,
            "gpu": hardware.gpu,
            "os": hardware.os,
        },
    }
    _provenance_path(image_path).write_text(
        json.dumps(provenance, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
