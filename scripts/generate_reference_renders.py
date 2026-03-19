#!/usr/bin/env python3
"""RenderScope reference render generator.

Produces high-quality reference images (65 536 SPP by default) using the
reference renderer specified in the scene manifest or overridden via CLI.
Reference images are the "ground truth" that PSNR/SSIM quality metrics are
computed against.

Each scene in the manifest declares its own reference renderer (e.g. PBRT
for cornell-box, blender-cycles for classroom).  When ``--renderer`` is not
specified, the per-scene reference renderer is used automatically.

These renders are *slow* -potentially 10–100× slower than standard 1024 SPP
renders.  Run this script overnight or on dedicated hardware.

Usage examples::

    # Generate reference renders for all scenes (uses per-scene renderer)
    python scripts/generate_reference_renders.py

    # Generate for specific scenes only
    python scripts/generate_reference_renders.py --scene cornell-box sponza

    # Override renderer for all scenes
    python scripts/generate_reference_renders.py --renderer mitsuba3

    # Override SPP
    python scripts/generate_reference_renders.py --samples 32768

    # Skip scenes that already have reference renders
    python scripts/generate_reference_renders.py --skip-existing

    # Dry run -show what would be generated
    python scripts/generate_reference_renders.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent

# ---------------------------------------------------------------------------
# Third-party imports
# ---------------------------------------------------------------------------
try:
    import yaml
except ImportError:
    sys.exit("ERROR: PyYAML is required.  pip install pyyaml")

try:
    from rich.console import Console
    from rich.progress import (
        BarColumn,
        Progress,
        SpinnerColumn,
        TextColumn,
        TimeElapsedColumn,
    )
    from rich.table import Table
except ImportError:
    sys.exit("ERROR: Rich is required.  pip install rich")

console = Console()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _fmt_time(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    if minutes < 60:
        return f"{minutes}m {secs:.0f}s"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h {mins}m"


def _load_config(config_path: Path) -> dict:
    """Load benchmark_config.yaml and return the raw dict."""
    if not config_path.is_file():
        console.print(f"[red]Config file not found: {config_path}[/red]")
        sys.exit(1)
    with open(config_path, encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def _load_scene_manifest() -> dict[str, dict]:
    """Load the scene manifest and return a dict keyed by scene ID.

    The manifest is embedded in the Python package at
    ``python/src/renderscope/data/scenes/manifest.json``.
    Falls back to ``data/scenes/`` JSON files if the package manifest
    is not found.
    """
    # Try package manifest first.
    pkg_manifest = (
        _REPO_ROOT / "python" / "src" / "renderscope" / "data" / "scenes" / "manifest.json"
    )
    if pkg_manifest.is_file():
        raw = json.loads(pkg_manifest.read_text(encoding="utf-8"))
        scenes_list = raw.get("scenes", [])
        return {s["id"]: s for s in scenes_list if isinstance(s, dict) and "id" in s}

    # Fallback: individual scene JSONs in data/scenes/.
    scenes_dir = _REPO_ROOT / "data" / "scenes"
    manifest: dict[str, dict] = {}
    if scenes_dir.is_dir():
        for json_file in sorted(scenes_dir.glob("*.json")):
            try:
                scene = json.loads(json_file.read_text(encoding="utf-8"))
                if isinstance(scene, dict) and "id" in scene:
                    manifest[scene["id"]] = scene
            except (json.JSONDecodeError, OSError):
                pass
    return manifest


def _get_scene_ref_renderer(scene_id: str, manifest: dict[str, dict]) -> str | None:
    """Get the reference renderer for a scene from the manifest."""
    scene = manifest.get(scene_id)
    if scene is None:
        return None
    ref = scene.get("reference", {})
    return ref.get("renderer") if isinstance(ref, dict) else None


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate high-SPP reference renders for quality metric computation.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python scripts/generate_reference_renders.py\n"
            "  python scripts/generate_reference_renders.py --scene cornell-box\n"
            "  python scripts/generate_reference_renders.py --renderer mitsuba3 --samples 32768\n"
            "  python scripts/generate_reference_renders.py --skip-existing --dry-run\n"
        ),
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=_SCRIPT_DIR / "benchmark_config.yaml",
        help="Path to benchmark config YAML (default: scripts/benchmark_config.yaml).",
    )
    parser.add_argument(
        "--scene",
        nargs="*",
        metavar="ID",
        help="Generate reference for these scene(s) only.  Omit for all enabled.",
    )
    parser.add_argument(
        "--renderer",
        type=str,
        default=None,
        help=(
            "Override the reference renderer for ALL scenes.  "
            "If omitted, uses each scene's own reference renderer from the manifest."
        ),
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=None,
        help="Override the reference SPP (default: from config, usually 65536).",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip scenes that already have a reference EXR.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without running anything.",
    )
    parser.add_argument(
        "--gpu",
        action="store_true",
        help="Enable GPU rendering (CUDA/OptiX for NVIDIA GPUs).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show renderer stdout/stderr.",
    )
    return parser


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    # ── Load config ──────────────────────────────────────────────────────
    raw_config = _load_config(args.config)

    # Reference settings.
    ref_section = raw_config.get("reference", {})
    renderer_override = args.renderer  # None means use per-scene renderer
    fallback_renderer = str(ref_section.get("renderer", "pbrt"))
    ref_spp = args.samples or int(ref_section.get("samples_per_pixel", 65536))
    ref_timeout = int(ref_section.get("timeout_seconds", 86400))

    # Default resolution.
    defaults = raw_config.get("defaults", {})
    resolution = defaults.get("resolution", [1920, 1080])
    max_bounces = int(defaults.get("max_bounces", 8))

    # Load scene manifest for per-scene reference renderer info.
    manifest = _load_scene_manifest()

    # Scenes.
    scenes_raw = raw_config.get("scenes", [])
    scenes = [
        s["id"]
        for s in scenes_raw
        if isinstance(s, dict) and s.get("enabled", True)
    ]

    if args.scene:
        scenes = [s for s in scenes if s in args.scene]

    if not scenes:
        console.print("[yellow]No scenes to process.[/yellow]")
        sys.exit(0)

    # Output dir.
    output_section = raw_config.get("output", {})
    renders_dir = _REPO_ROOT / str(output_section.get("renders_dir", "assets/renders"))

    # ── Plan ─────────────────────────────────────────────────────────────
    # Each plan entry: (scene_id, renderer_for_this_scene, ref_exr_path)
    plans: list[tuple[str, str, Path]] = []
    for scene_id in scenes:
        # Determine renderer: CLI override > manifest > config fallback.
        if renderer_override:
            renderer = renderer_override
        else:
            renderer = _get_scene_ref_renderer(scene_id, manifest) or fallback_renderer

        scene_renders_dir = renders_dir / scene_id
        ref_exr = scene_renders_dir / f"{renderer}_reference.exr"
        plans.append((scene_id, renderer, ref_exr))

    # Filter existing.
    if args.skip_existing:
        filtered: list[tuple[str, str, Path]] = []
        for scene_id, renderer, ref_exr in plans:
            if ref_exr.is_file():
                console.print(f"  [dim]Skipping {scene_id} -reference exists: {ref_exr.name}[/dim]")
                continue
            filtered.append((scene_id, renderer, ref_exr))
        plans = filtered

    if not plans:
        console.print("[green]All reference renders already exist.[/green]")
        sys.exit(0)

    # ── Dry run ──────────────────────────────────────────────────────────
    if args.dry_run:
        table = Table(
            title="Reference Render Plan (Dry Run)",
            show_header=True,
            header_style="bold",
        )
        table.add_column("#", justify="right", style="dim")
        table.add_column("Scene")
        table.add_column("Renderer", style="cyan")
        table.add_column("SPP", justify="right")
        table.add_column("Resolution")
        table.add_column("Timeout")
        table.add_column("Output EXR")

        for idx, (scene_id, renderer, ref_exr) in enumerate(plans, 1):
            table.add_row(
                str(idx),
                scene_id,
                renderer,
                f"{ref_spp:,}",
                f"{resolution[0]}x{resolution[1]}",
                _fmt_time(float(ref_timeout)),
                str(ref_exr.relative_to(_REPO_ROOT)),
            )

        console.print()
        console.print(table)
        console.print(
            f"\n  Total scenes: {len(plans)}"
            f"\n  Estimated time: [yellow]many hours[/yellow] (reference renders are very slow)"
        )
        console.print()
        return

    # ── Check renderer availability ──────────────────────────────────────
    if shutil.which("renderscope") is None:
        console.print(
            "[red]renderscope CLI not found.[/red]\n"
            "Install with: cd python && pip install -e ."
        )
        sys.exit(1)

    # ── Execute ──────────────────────────────────────────────────────────
    console.print()
    console.print("[bold bright_blue]RenderScope Reference Render Generator[/bold bright_blue]")
    console.print(f"  SPP:        {ref_spp:,}")
    console.print(f"  Resolution: {resolution[0]}x{resolution[1]}")
    console.print(f"  Scenes:     {len(plans)}")
    console.print(f"  Timeout:    {_fmt_time(float(ref_timeout))} per render")
    console.print(f"  GPU:        {'enabled' if args.gpu else 'disabled (use --gpu to enable)'}")
    if renderer_override:
        console.print(f"  Renderer:   {renderer_override} (override for all scenes)")
    else:
        console.print("  Renderer:   per-scene (from manifest)")
    console.print()

    results: list[tuple[str, str, float]] = []  # (scene_id, status, elapsed)

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}[/bold blue]"),
        BarColumn(bar_width=30),
        TextColumn("{task.completed}/{task.total}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Reference renders...", total=len(plans))

        for scene_id, renderer, ref_exr in plans:
            progress.update(task, description=f"Rendering {scene_id} ({renderer})")
            ref_exr.parent.mkdir(parents=True, exist_ok=True)

            w, h = resolution
            # The benchmark runner saves images to:
            #   {results_dir}/{scene_id}/{renderer}_{spp}spp.exr
            # We need to rename that to {renderer}_reference.exr afterward.
            actual_output = renders_dir / scene_id / f"{renderer}_{ref_spp}spp.exr"
            json_output = renders_dir / scene_id / f"{renderer}_reference.json"

            cmd = [
                "renderscope",
                "benchmark",
                "--renderer",
                renderer,
                "--scene",
                scene_id,
                "--samples",
                str(ref_spp),
                "--resolution",
                f"{w}x{h}",
                "--max-bounces",
                str(max_bounces),
                "--timeout",
                str(ref_timeout),
                "--no-warmup",
                "--results-dir",
                str(renders_dir),
                "--output",
                str(json_output),
            ]
            if args.gpu:
                cmd.append("--gpu")

            start = time.monotonic()
            try:
                proc = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=ref_timeout,
                    cwd=str(_REPO_ROOT),
                )
                elapsed = time.monotonic() - start

                if args.verbose:
                    if proc.stdout.strip():
                        console.print(f"[dim]{proc.stdout.strip()[:500]}[/dim]")
                    if proc.stderr.strip():
                        console.print(f"[dim]{proc.stderr.strip()[:500]}[/dim]")

                # The runner saves to {renderer}_{spp}spp.exr -rename to
                # {renderer}_reference.exr so downstream tools can find it.
                if actual_output.is_file() and actual_output.stat().st_size > 0:
                    actual_output.replace(ref_exr)

                # Verify BOTH exit code and actual output file existence.
                if proc.returncode == 0 and ref_exr.is_file() and ref_exr.stat().st_size > 0:
                    results.append((scene_id, "success", elapsed))
                    console.print(
                        f"  [green]OK[/green] {scene_id} ({renderer}): {_fmt_time(elapsed)}"
                    )

                    # Also generate a web-optimised WebP of the reference.
                    web_images_script = _SCRIPT_DIR / "generate_web_images.py"
                    if web_images_script.is_file():
                        subprocess.run(
                            [
                                sys.executable,
                                str(web_images_script),
                                "--renders-dir",
                                str(renders_dir),
                                "--scene",
                                scene_id,
                                "--renderer",
                                renderer,
                            ],
                            cwd=str(_REPO_ROOT),
                            capture_output=True,
                        )
                elif proc.returncode == 0:
                    # CLI exited 0 but no output file -silent failure.
                    results.append((scene_id, "failed", elapsed))
                    console.print(
                        f"  [red]FAIL[/red] {scene_id} ({renderer}): "
                        f"no output produced (format incompatible or render failed silently)"
                    )
                    if proc.stderr.strip():
                        # Show stderr for diagnostic clues.
                        console.print(f"    {proc.stderr.strip()[:300]}")
                else:
                    results.append((scene_id, "failed", elapsed))
                    console.print(
                        f"  [red]FAIL[/red] {scene_id} ({renderer}): exit code {proc.returncode}"
                    )
                    if proc.stderr.strip():
                        console.print(f"    {proc.stderr.strip()[:300]}")

            except subprocess.TimeoutExpired:
                elapsed = time.monotonic() - start
                results.append((scene_id, "timeout", elapsed))
                console.print(
                    f"  [yellow]TIMEOUT[/yellow] {scene_id}: timed out after {_fmt_time(elapsed)}"
                )

            except KeyboardInterrupt:
                console.print("\n[yellow]Interrupted.[/yellow]")
                break

            progress.advance(task)

    # ── Summary ──────────────────────────────────────────────────────────
    console.print()
    succeeded = sum(1 for _, s, _ in results if s == "success")
    total_time = sum(t for _, _, t in results)
    console.print(
        f"[bold]Reference renders complete:[/bold] "
        f"[green]{succeeded}[/green]/{len(results)} succeeded, "
        f"total time {_fmt_time(total_time)}"
    )

    if succeeded < len(results):
        failed_scenes = [sid for sid, s, _ in results if s != "success"]
        console.print(
            f"\n[yellow]Failed scenes: {', '.join(failed_scenes)}[/yellow]"
            "\nUse --verbose to see renderer output for debugging."
        )


if __name__ == "__main__":
    main()
