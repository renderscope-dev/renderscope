"""The ``renderscope benchmark`` command.

Runs standardized benchmarks across installed rendering engines with
configurable scenes, sample counts, and time budgets.  Outputs structured
JSON results with timing, memory, and quality metrics.
"""

from __future__ import annotations

import sys
from pathlib import Path

import typer
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from renderscope.utils.console import console, err_console


def _parse_resolution(resolution: str) -> tuple[int, int]:
    """Parse a resolution string like '1920x1080' into (width, height)."""
    parts = resolution.lower().split("x")
    if len(parts) != 2:
        err_console.print(
            f"[error]Invalid resolution format: '{resolution}'.[/error]\n"
            "Expected format: WIDTHxHEIGHT (e.g., 1920x1080)."
        )
        raise typer.Exit(code=1)
    try:
        width, height = int(parts[0]), int(parts[1])
    except ValueError:
        err_console.print(
            f"[error]Resolution must be integers: '{resolution}'.[/error]\n"
            "Expected format: WIDTHxHEIGHT (e.g., 1920x1080)."
        )
        raise typer.Exit(code=1) from None

    if width <= 0 or height <= 0:
        err_console.print("[error]Resolution dimensions must be positive.[/error]")
        raise typer.Exit(code=1)
    return width, height


def _fmt_time(seconds: float) -> str:
    """Format seconds into a display string."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes}m {secs:.0f}s"


def _fmt_memory(mb: float) -> str:
    """Format megabytes into a display string."""
    if mb >= 1024:
        return f"{mb / 1024:.1f} GB"
    return f"{mb:.0f} MB"


def _print_pre_flight_summary(
    renderer_names: list[str],
    scene_ids: list[str],
    run_count: int,
    settings_desc: str,
    hardware_desc: str,
) -> None:
    """Print a summary panel before benchmarking starts."""
    lines = Text()
    lines.append("Renderers:  ", style="dim")
    lines.append(", ".join(renderer_names))
    lines.append("\n")
    lines.append("Scenes:     ", style="dim")
    lines.append(", ".join(scene_ids))
    lines.append("\n")
    lines.append("Settings:   ", style="dim")
    lines.append(settings_desc)
    lines.append("\n")
    lines.append("Total runs: ", style="dim")
    lines.append(str(run_count))
    lines.append("\n")
    lines.append("Hardware:   ", style="dim")
    lines.append(hardware_desc)

    console.print()
    console.print(Panel(lines, title="RenderScope Benchmark", border_style="bright_blue"))
    console.print()


def _print_result_summary(
    results: list[dict[str, object]],
) -> None:
    """Print a summary table of all benchmark results."""
    if not results:
        return

    table = Table(show_header=True, header_style="bold", padding=(0, 1))
    table.add_column("Renderer", style="cyan", min_width=12)
    table.add_column("Scene", min_width=14)
    table.add_column("Time", min_width=8, justify="right")
    table.add_column("Memory", min_width=8, justify="right")
    table.add_column("PSNR", min_width=10, justify="right")
    table.add_column("SSIM", min_width=8, justify="right")
    table.add_column("Status", min_width=6, justify="center")

    for entry in results:
        renderer = str(entry.get("renderer", ""))
        scene = str(entry.get("scene", ""))
        render_data = entry.get("results")
        quality_data = entry.get("quality_vs_reference")

        time_str = ""
        mem_str = ""
        if isinstance(render_data, dict):
            rt = render_data.get("render_time_seconds")
            if isinstance(rt, (int, float)):
                time_str = _fmt_time(float(rt))
            pm = render_data.get("peak_memory_mb")
            if isinstance(pm, (int, float)):
                mem_str = _fmt_memory(float(pm))

        psnr_str = ""
        ssim_str = ""
        if isinstance(quality_data, dict):
            pv = quality_data.get("psnr")
            if isinstance(pv, (int, float)):
                psnr_str = f"{float(pv):.1f} dB"
            sv = quality_data.get("ssim")
            if isinstance(sv, (int, float)):
                ssim_str = f"{float(sv):.4f}"

        table.add_row(renderer, scene, time_str, mem_str, psnr_str, ssim_str, "\u2705")

    console.print(Panel(table, title="Results Summary", border_style="bright_blue"))
    console.print()


def benchmark_cmd(
    scene: list[str] | None = typer.Option(
        None,
        "--scene",
        "-s",
        help="Scene ID(s) to benchmark. Use 'all' for all downloaded scenes.",
    ),
    renderer: list[str] | None = typer.Option(
        None,
        "--renderer",
        "-r",
        help="Renderer name(s) to benchmark. Use 'all' for all installed renderers.",
    ),
    samples: int = typer.Option(
        1024,
        "--samples",
        "--spp",
        help="Samples per pixel.",
    ),
    resolution: str = typer.Option(
        "1920x1080",
        "--resolution",
        help="Render resolution as WIDTHxHEIGHT.",
    ),
    time_budget: float | None = typer.Option(
        None,
        "--time-budget",
        help="Maximum seconds per render (alternative to --samples).",
    ),
    timeout: float = typer.Option(
        600.0,
        "--timeout",
        help="Absolute timeout per render in seconds.",
    ),
    output: Path = typer.Option(
        Path("benchmark-results.json"),
        "--output",
        "-o",
        help="Output file path for benchmark results (JSON).",
    ),
    append: bool = typer.Option(
        False,
        "--append",
        help="Append results to an existing output file instead of overwriting.",
    ),
    convergence: bool = typer.Option(
        False,
        "--convergence",
        help="Capture convergence data at multiple sample checkpoints.",
    ),
    no_warmup: bool = typer.Option(
        False,
        "--no-warmup",
        help="Skip the warm-up run (not recommended for fair benchmarks).",
    ),
    max_bounces: int = typer.Option(
        8,
        "--max-bounces",
        help="Maximum ray bounce depth.",
    ),
    gpu: bool | None = typer.Option(
        None,
        "--gpu/--no-gpu",
        help="Enable or disable GPU rendering where supported.",
    ),
    results_dir: Path = typer.Option(
        Path("renderscope-results"),
        "--results-dir",
        help="Directory for rendered images and artifacts.",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Show what would be benchmarked without running anything.",
    ),
) -> None:
    """Run standardized benchmarks across installed rendering engines.

    Executes renders for each renderer/scene combination, collects
    timing and memory data, computes quality metrics against reference
    images, and outputs structured JSON results.
    """
    # Validate required options.
    if not scene:
        err_console.print(
            "[error]No scenes specified.[/error]\n"
            "Use --scene <id> or --scene all to select scenes.\n"
            "Run 'renderscope download-scenes --list' to see available scenes."
        )
        raise typer.Exit(code=1)

    if not renderer:
        err_console.print(
            "[error]No renderers specified.[/error]\n"
            "Use --renderer <name> or --renderer all to select renderers.\n"
            "Run 'renderscope list --installed-only' to see installed renderers."
        )
        raise typer.Exit(code=1)

    # Parse resolution.
    width, height = _parse_resolution(resolution)

    # Build render settings.
    from renderscope.models.settings import RenderSettings

    settings = RenderSettings(
        width=width,
        height=height,
        samples=samples if time_budget is None else None,
        time_budget=time_budget,
        gpu=gpu if gpu is not None else False,
        extra={"timeout": timeout, "max_bounces": max_bounces},
    )

    # Initialize components.
    from renderscope.core.benchmark import BenchmarkRunner
    from renderscope.core.registry import registry
    from renderscope.core.scene import SceneManager

    scene_manager = SceneManager()
    runner = BenchmarkRunner(
        scene_manager=scene_manager,
        registry=registry,
        output_dir=results_dir,
    )

    # Pre-flight: check scenes are downloaded.
    scene_ids = list(scene)
    renderer_names = list(renderer)

    missing_scenes: list[str] = []
    if "all" not in scene_ids:
        for sid in scene_ids:
            try:
                scene_manager.get_scene(sid)
            except Exception:
                err_console.print(f"[warning]\u26a0  Unknown scene: '{sid}'[/warning]")
                continue
            if not scene_manager.is_downloaded(sid):
                missing_scenes.append(sid)

    if missing_scenes:
        for sid in missing_scenes:
            err_console.print(
                f"[warning]\u26a0  Scene '{sid}' is not downloaded. Skipping.[/warning]\n"
                f"   Run 'renderscope download-scenes --scene {sid}' to download it."
            )
        # Remove missing scenes from the list.
        scene_ids = [s for s in scene_ids if s not in missing_scenes]
        if not scene_ids:
            err_console.print(
                "\n[error]No requested scenes are available.[/error]\n"
                "Run 'renderscope download-scenes' to download benchmark scenes."
            )
            raise typer.Exit(code=1)

    # Pre-flight: check renderers are installed.
    if "all" not in renderer_names:
        not_installed: list[str] = []
        for rname in renderer_names:
            adapter = registry.get(rname)
            if adapter is None:
                err_console.print(
                    f"[warning]\u26a0  Renderer '{rname}' is not registered.[/warning]\n"
                    f"   Run 'renderscope list' to see available renderers."
                )
                not_installed.append(rname)
                continue
            version = adapter.detect()
            if version is None:
                err_console.print(
                    f"[warning]\u26a0  Renderer '{rname}' is not installed. Skipping.[/warning]\n"
                    f"   Run 'renderscope info {rname}' for installation details."
                )
                not_installed.append(rname)

        renderer_names = [r for r in renderer_names if r not in not_installed]
        if not renderer_names:
            err_console.print(
                "\n[error]No requested renderers are installed.[/error]\n"
                "Run 'renderscope list' to see which renderers are available."
            )
            raise typer.Exit(code=1)

    # Dry run: show the run matrix and exit.
    if dry_run:
        matrix = runner.build_run_matrix(scene_ids, renderer_names)

        if not matrix:
            console.print("[warning]No compatible renderer x scene pairs found.[/warning]")
            raise typer.Exit(code=0)

        table = Table(title="Benchmark Dry Run", show_header=True, header_style="bold")
        table.add_column("#", style="dim", justify="right", min_width=3)
        table.add_column("Renderer", style="cyan", min_width=14)
        table.add_column("Scene", min_width=14)
        table.add_column("Format", min_width=10)

        for idx, (_, display_name, sid, fmt) in enumerate(matrix, start=1):
            table.add_row(str(idx), display_name, sid, fmt)

        console.print()
        console.print(table)

        settings_desc = f"{width}\u00d7{height}, {samples} SPP, {max_bounces} bounces"
        console.print(f"\n  Settings: {settings_desc}")
        console.print(f"  Total runs: {len(matrix)}")
        if convergence:
            console.print("  Convergence tracking: enabled")
        console.print()
        raise typer.Exit(code=0)

    # Pre-flight summary.
    from renderscope.utils.hardware import detect_hardware

    hw = detect_hardware()
    hw_parts: list[str] = [hw.cpu]
    if hw.gpu:
        hw_parts.append(hw.gpu)
    hw_parts.append(f"{hw.ram_gb:.0f} GB RAM")
    hardware_desc = " \u2022 ".join(hw_parts)

    settings_desc = f"{width}\u00d7{height}, {samples} SPP, {max_bounces} bounces"

    # Get run matrix for the summary.
    matrix = runner.build_run_matrix(scene_ids, renderer_names)
    if not matrix:
        console.print("[warning]No compatible renderer x scene pairs found.[/warning]")
        raise typer.Exit(code=0)

    unique_renderers = sorted({display for _, display, _, _ in matrix})
    unique_scenes = sorted({sid for _, _, sid, _ in matrix})

    _print_pre_flight_summary(
        renderer_names=unique_renderers,
        scene_ids=unique_scenes,
        run_count=len(matrix),
        settings_desc=settings_desc,
        hardware_desc=hardware_desc,
    )

    # Execute benchmarks.
    completed_results: list[dict[str, object]] = []

    def _progress(label: str, current: int, total: int) -> None:
        console.print(f"[dim][{current}/{total}][/dim] {label}")

    try:
        results = runner.run(
            scenes=scene_ids,
            renderers=renderer_names,
            settings=settings,
            convergence=convergence,
            warmup=not no_warmup,
            progress_callback=_progress,
        )
    except KeyboardInterrupt:
        console.print()
        console.print(
            f"[warning]\u26a0  Benchmark interrupted. "
            f"{len(completed_results)} runs completed.[/warning]"
        )
        results = []

    if results:
        # Save results.
        runner.save_results(results, output, append=append)

        # Build summary data.
        for r in results:
            completed_results.append(r.model_dump(mode="json"))

        # Print summary.
        console.print()
        _print_result_summary(completed_results)
        console.print(f"Results saved to [bold]{output}[/bold] ({len(results)} entries)")
    else:
        console.print("[warning]No benchmark results were produced.[/warning]")
        sys.exit(1)

    sys.exit(0)
