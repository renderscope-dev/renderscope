"""Typer application entry point for the ``renderscope`` CLI.

This is the single entry point registered in ``pyproject.toml`` as
``renderscope = "renderscope.cli.main:app"``.  It registers all
sub-commands (both implemented and stubs) and configures the version
callback.
"""

from __future__ import annotations

import typer

from renderscope.cli.benchmark import benchmark_cmd
from renderscope.cli.compare import compare_cmd
from renderscope.cli.download import download_scenes_cmd
from renderscope.cli.info import info_cmd
from renderscope.cli.list_renderers import list_cmd
from renderscope.cli.report import report_cmd
from renderscope.cli.system_info import system_info_cmd
from renderscope.utils.console import console

app = typer.Typer(
    name="renderscope",
    help="An open-source platform for cataloging, comparing, and benchmarking rendering engines.",
    add_completion=True,
    rich_markup_mode="rich",
    no_args_is_help=True,
)


def _version_callback(value: bool) -> None:
    if value:
        from renderscope import __version__

        console.print(f"RenderScope v{__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: bool | None = typer.Option(
        None,
        "--version",
        "-v",
        help="Show version and exit.",
        callback=_version_callback,
        is_eager=True,
    ),
) -> None:
    """RenderScope — CLI tool for cataloging, comparing, and benchmarking rendering engines."""


# Register all commands
app.command(name="list", help="List known rendering engines.")(list_cmd)
app.command(name="system-info", help="Display system hardware information.")(system_info_cmd)
app.command(name="info", help="Show detailed information about a specific renderer.")(info_cmd)
app.command(name="benchmark", help="Run standardized benchmarks across rendering engines.")(
    benchmark_cmd
)
app.command(name="compare", help="Compute image quality metrics between rendered images.")(
    compare_cmd
)
app.command(name="report", help="Generate comparison reports from benchmark results.")(report_cmd)
app.command(name="download-scenes", help="Download standard benchmark scenes.")(download_scenes_cmd)
