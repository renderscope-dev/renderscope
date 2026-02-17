"""The ``renderscope list`` command — fully implemented.

Reads bundled renderer JSON data and displays a Rich-formatted table
with filtering, sorting, and JSON output support.  Shows live
installation status via the adapter registry.
"""

from __future__ import annotations

import json

import typer
from rich.table import Table

from renderscope.core.data_loader import load_all_renderers
from renderscope.core.registry import registry
from renderscope.utils.console import (
    console,
    format_technique,
    get_status_style,
    get_technique_style,
)


def list_cmd(
    technique: str | None = typer.Option(
        None,
        "--technique",
        "-t",
        help="Filter by rendering technique (e.g., path_tracing, neural, rasterization).",
    ),
    language: str | None = typer.Option(
        None,
        "--language",
        "-l",
        help="Filter by primary language (case-insensitive substring match).",
    ),
    status: str | None = typer.Option(
        None,
        "--status",
        "-s",
        help="Filter by project status (active, maintenance, inactive, archived).",
    ),
    output_format: str = typer.Option(
        "table",
        "--format",
        "-f",
        help="Output format: 'table' (Rich table) or 'json' (machine-readable).",
    ),
    installed_only: bool = typer.Option(
        False,
        "--installed-only",
        "-i",
        help="Show only renderers detected on this system.",
    ),
    show_all: bool = typer.Option(
        False,
        "--all",
        "-a",
        help="Show all renderers (default behavior; reserved for future use).",
    ),
) -> None:
    """List known rendering engines from the RenderScope catalog.

    Displays a formatted table of all cataloged renderers with
    technique, language, license, status, and GitHub star count.
    Supports filtering by technique, language, and project status.
    """
    renderers = load_all_renderers()

    # Detect installed renderers
    detection = registry.detect_all()

    # Apply filters
    if technique:
        renderers = [r for r in renderers if r.matches_technique(technique)]
    if language:
        renderers = [r for r in renderers if r.matches_language(language)]
    if status:
        renderers = [r for r in renderers if r.matches_status(status)]
    if installed_only:
        renderers = [r for r in renderers if detection.get(r.id) is not None]

    if not renderers:
        console.print("[warning]No renderers match the given filters.[/warning]")
        raise typer.Exit()

    # JSON output
    if output_format == "json":
        data = []
        for r in renderers:
            summary = r.to_summary_dict()
            version = detection.get(r.id)
            summary["installed"] = version is not None
            summary["installed_version"] = version
            data.append(summary)
        console.print_json(json.dumps(data, indent=2))
        raise typer.Exit()

    # Rich table output
    active_filters: list[str] = []
    if technique:
        active_filters.append(f"technique={technique}")
    if language:
        active_filters.append(f"language={language}")
    if status:
        active_filters.append(f"status={status}")
    if installed_only:
        active_filters.append("installed-only")

    caption = f"Filters: {', '.join(active_filters)}" if active_filters else None

    table = Table(
        title=f"RenderScope — {len(renderers)} renderer{'s' if len(renderers) != 1 else ''}",
        caption=caption,
        show_lines=False,
        pad_edge=True,
        expand=False,
    )
    table.add_column("Name", style="bold", no_wrap=True)
    table.add_column("Installed", justify="center", no_wrap=True)
    table.add_column("Technique", no_wrap=True)
    table.add_column("Language")
    table.add_column("License")
    table.add_column("Status", justify="center")
    table.add_column("Stars", justify="right", width=10)

    for renderer in renderers:
        primary = renderer.primary_technique
        technique_style = get_technique_style(primary)
        status_style = get_status_style(renderer.status)

        name_styled = f"[{technique_style}]{renderer.name}[/{technique_style}]"
        technique_styled = f"[{technique_style}]{format_technique(primary)}[/{technique_style}]"
        status_styled = f"[{status_style}]{renderer.status}[/{status_style}]"

        version = detection.get(renderer.id)
        if version is not None:
            installed_styled = f"[green]✅ {version}[/green]"
        else:
            installed_styled = "[muted]—[/muted]"

        table.add_row(
            name_styled,
            installed_styled,
            technique_styled,
            renderer.language,
            renderer.license,
            status_styled,
            renderer.stars_display,
        )

    console.print()
    console.print(table)
    console.print()
