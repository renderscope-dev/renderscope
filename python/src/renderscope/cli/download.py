"""The ``renderscope download-scenes`` command — stub for Phase 18.

Will download standard benchmark scenes (Cornell Box, Sponza, etc.)
to a local directory for use in benchmarking.
"""

from __future__ import annotations

from pathlib import Path

import typer
from rich.panel import Panel

from renderscope.utils.console import console


def download_scenes_cmd(
    scene: str | None = typer.Option(
        None,
        "--scene",
        help="Download a specific scene by name (e.g., 'cornell-box', 'sponza').",
    ),
    output_dir: Path | None = typer.Option(
        None,
        "--output-dir",
        "-o",
        help="Directory to download scenes into. Defaults to ~/.renderscope/scenes/.",
    ),
) -> None:
    """Download standard benchmark scenes for use with renderscope.

    Fetches canonical test scenes (Cornell Box, Sponza Atrium,
    Stanford Bunny, etc.) in multiple formats from the RenderScope
    asset repository.
    """
    console.print()
    console.print(
        Panel(
            "[yellow]This command is under development.[/yellow]\n\n"
            "The [bold]download-scenes[/bold] command will:\n"
            "\u2022 Download standard benchmark scenes from the RenderScope repository\n"
            "\u2022 Support multiple scene formats (PBRT, Mitsuba XML, glTF, OBJ)\n"
            "\u2022 Cache downloaded scenes in ~/.renderscope/scenes/\n"
            "\u2022 Show download progress with a Rich progress bar\n\n"
            "[dim]Track progress: https://github.com/renderscope-dev/renderscope[/dim]",
            title="renderscope download-scenes",
            border_style="yellow",
        )
    )
    raise typer.Exit(code=0)
