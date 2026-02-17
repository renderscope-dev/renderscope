"""The ``renderscope system-info`` command — fully implemented.

Detects and displays current system hardware and software information.
Important for benchmark reproducibility: every benchmark result should
include system specs.
"""

from __future__ import annotations

import json

import typer
from rich.panel import Panel
from rich.table import Table

from renderscope.utils.console import console
from renderscope.utils.hardware import detect_hardware


def system_info_cmd(
    output_format: str = typer.Option(
        "panel",
        "--format",
        "-f",
        help="Output format: 'panel' (styled Rich panel) or 'json' (machine-readable).",
    ),
) -> None:
    """Display system hardware and software information.

    Detects CPU, GPU, RAM, OS, Python version, and installed
    optional dependencies.  Useful for documenting the environment
    in which benchmarks are run.
    """
    hw = detect_hardware()

    # JSON output
    if output_format == "json":
        console.print_json(json.dumps(hw.model_dump(), indent=2))
        raise typer.Exit()

    # Rich panel output
    grid = Table.grid(padding=(0, 2))
    grid.add_column(style="bold cyan", justify="right", no_wrap=True)
    grid.add_column()

    grid.add_row("CPU", hw.cpu)
    grid.add_row("Cores", f"{hw.cpu_cores_physical} physical / {hw.cpu_cores_logical} logical")
    grid.add_row("RAM", f"{hw.ram_gb} GB")

    if hw.gpu:
        gpu_info = hw.gpu
        if hw.gpu_vram_gb:
            gpu_info += f" ({hw.gpu_vram_gb} GB VRAM)"
        grid.add_row("GPU", gpu_info)
    else:
        grid.add_row("GPU", "[dim]Not detected[/dim]")

    grid.add_row("OS", hw.os)
    grid.add_row("Python", hw.python_version)
    grid.add_row("RenderScope", hw.renderscope_version or "unknown")

    # Optional dependencies
    if hw.optional_deps:
        grid.add_row("Optional Deps", ", ".join(hw.optional_deps))
    else:
        grid.add_row("Optional Deps", "[dim]None installed[/dim]")

    panel = Panel(
        grid,
        title="[bold]System Information[/bold]",
        border_style="cyan",
        expand=False,
    )
    console.print()
    console.print(panel)
    console.print()
