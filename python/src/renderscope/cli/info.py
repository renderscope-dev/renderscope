"""The ``renderscope info`` command — fully implemented.

Shows detailed information about a specific renderer including its
metadata from JSON data files and live detection status from the
adapter registry.
"""

from __future__ import annotations

import shutil

import typer
from rich.columns import Columns
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from renderscope.core.data_loader import get_renderer_ids, load_all_renderers, load_renderer
from renderscope.core.registry import registry
from renderscope.utils.console import (
    console,
    format_technique,
    get_status_style,
    get_technique_style,
)


def _fuzzy_match(query: str, candidates: list[str], max_results: int = 5) -> list[str]:
    """Simple fuzzy matching: prefer prefix match, then substring match.

    Args:
        query: The user's search string (case-insensitive).
        candidates: Available renderer IDs.
        max_results: Maximum number of suggestions to return.

    Returns:
        A list of matching candidates, sorted by relevance.
    """
    q = query.lower()
    prefix_matches: list[str] = []
    substring_matches: list[str] = []

    for candidate in candidates:
        c = candidate.lower()
        if c.startswith(q):
            prefix_matches.append(candidate)
        elif q in c:
            substring_matches.append(candidate)

    # Also check display names
    renderers = load_all_renderers()
    for r in renderers:
        name_lower = r.name.lower()
        if q in name_lower and r.id not in prefix_matches and r.id not in substring_matches:
            substring_matches.append(r.id)

    return (prefix_matches + substring_matches)[:max_results]


def _resolve_renderer_id(query: str) -> str | None:
    """Resolve a user query to a renderer ID.

    Tries exact match first (by ID), then by display name, then aliases.

    Returns:
        The renderer ID or ``None``.
    """
    all_ids = get_renderer_ids()

    # Exact ID match
    q = query.lower().strip()
    for rid in all_ids:
        if rid.lower() == q:
            return rid

    # Match by display name
    renderers = load_all_renderers()
    for r in renderers:
        if r.name.lower() == q:
            return r.id

    # Common aliases
    aliases: dict[str, str] = {
        "cycles": "blender-cycles",
        "blender": "blender-cycles",
        "eevee": "blender-eevee",
        "mitsuba": "mitsuba3",
        "gaussian-splatting": "3d-gaussian-splatting",
        "3dgs": "3d-gaussian-splatting",
        "pytorch3d": "pytorch3d",
        "luxcore": "luxcorerender",
        "embree": "embree",
    }
    if q in aliases:
        alias_target = aliases[q]
        if alias_target in all_ids:
            return alias_target

    return None


def info_cmd(
    renderer: str = typer.Argument(
        help="Renderer ID or name (e.g., 'pbrt', 'mitsuba3', 'blender-cycles').",
    ),
) -> None:
    """Show detailed information about a specific renderer.

    Displays the renderer's full profile: features, capabilities,
    links, editorial assessment, and installation status.
    """
    # Resolve renderer identity
    renderer_id = _resolve_renderer_id(renderer)

    if renderer_id is None:
        # Show helpful error with suggestions
        all_ids = get_renderer_ids()
        suggestions = _fuzzy_match(renderer, all_ids)

        console.print()
        console.print(f"[error]Renderer not found: '{renderer}'[/error]")

        if suggestions:
            console.print()
            console.print("[info]Did you mean one of these?[/info]")
            for s in suggestions:
                console.print(f"  [bold]{s}[/bold]")
        else:
            console.print()
            console.print("[muted]Use 'renderscope list' to see all available renderers.[/muted]")

        console.print()
        raise typer.Exit(code=1)

    # Load metadata
    metadata = load_renderer(renderer_id)
    if metadata is None:
        console.print(f"[error]Failed to load data for '{renderer_id}'.[/error]")
        raise typer.Exit(code=1)

    # Detect installation status
    detection = registry.detect_all()
    detected_version = detection.get(renderer_id)
    adapter = registry.get(renderer_id)

    # Find binary path if applicable
    binary_path: str | None = None
    if adapter is not None and detected_version is not None:
        find_fn = getattr(adapter, "_find_binary", None)
        if callable(find_fn):
            binary_name = find_fn()
            if binary_name:
                binary_path = shutil.which(binary_name)

    # Build the info display
    console.print()
    _print_header(metadata, detected_version, binary_path)
    _print_metadata_card(metadata)
    _print_editorial(metadata)
    _print_features(metadata)
    _print_links(metadata)
    console.print()


def _print_header(
    metadata: object,
    detected_version: str | None,
    binary_path: str | None,
) -> None:
    """Print the renderer name, status, and detection info."""
    from renderscope.models.renderer import RendererMetadata

    assert isinstance(metadata, RendererMetadata)

    # Status line
    if detected_version is not None:
        status_text = Text()
        status_text.append("✅ Installed", style="green bold")
        status_text.append(f" (version {detected_version})", style="green")
    else:
        status_text = Text()
        status_text.append("❌ Not Installed", style="red")

    primary = metadata.primary_technique
    technique_style = get_technique_style(primary)
    status_style = get_status_style(metadata.status)

    info_table = Table(show_header=False, box=None, padding=(0, 2), show_edge=False)
    info_table.add_column("Key", style="bold", no_wrap=True, width=16)
    info_table.add_column("Value")

    info_table.add_row("Status", status_text)
    if binary_path:
        info_table.add_row("Binary", f"[muted]{binary_path}[/muted]")
    info_table.add_row(
        "Technique",
        f"[{technique_style}]{format_technique(primary)}[/{technique_style}]",
    )
    info_table.add_row("Language", metadata.language)
    info_table.add_row("License", metadata.license)
    info_table.add_row(
        "Platforms",
        ", ".join(p.title() for p in metadata.platforms),
    )

    gpu_text = "Yes"
    if metadata.gpu_apis:
        gpu_text += f" ({', '.join(a.upper() for a in metadata.gpu_apis)})"
    info_table.add_row(
        "GPU Support",
        f"[green]{gpu_text}[/green]" if metadata.gpu_support else "[muted]No[/muted]",
    )
    info_table.add_row(
        "Project Status",
        f"[{status_style}]{metadata.status.title()}[/{status_style}]",
    )
    if metadata.github_stars is not None:
        info_table.add_row("GitHub Stars", f"⭐ {metadata.github_stars:,}")

    panel = Panel(
        info_table,
        title=f"[bold]{metadata.name}[/bold]",
        subtitle=metadata.description[:80] if metadata.description else None,
        border_style=technique_style,
        padding=(1, 2),
    )
    console.print(panel)


def _print_metadata_card(metadata: object) -> None:
    """Print scene formats, output formats, and install instructions."""
    from renderscope.models.renderer import RendererMetadata

    assert isinstance(metadata, RendererMetadata)

    table = Table(show_header=False, box=None, padding=(0, 2), show_edge=False)
    table.add_column("Key", style="bold", no_wrap=True, width=16)
    table.add_column("Value")

    if metadata.scene_formats:
        table.add_row("Scene Formats", ", ".join(f".{f}" for f in metadata.scene_formats))
    if metadata.output_formats:
        table.add_row("Output Formats", ", ".join(f".{f}" for f in metadata.output_formats))
    if metadata.install_command:
        table.add_row("Install", f"[info]{metadata.install_command}[/info]")

    if table.row_count > 0:
        console.print(Panel(table, title="Formats & Installation", border_style="dim"))


def _print_editorial(metadata: object) -> None:
    """Print strengths, limitations, and best-for summary."""
    from renderscope.models.renderer import RendererMetadata

    assert isinstance(metadata, RendererMetadata)

    parts: list[str] = []

    if metadata.best_for:
        parts.append(f"[bold]Best for:[/bold] {metadata.best_for}")

    if metadata.not_ideal_for:
        parts.append(f"[bold]Not ideal for:[/bold] {metadata.not_ideal_for}")

    if metadata.strengths:
        parts.append("")
        parts.append("[green bold]Strengths:[/green bold]")
        for s in metadata.strengths:
            parts.append(f"  [green]✓[/green] {s}")

    if metadata.limitations:
        parts.append("")
        parts.append("[yellow bold]Limitations:[/yellow bold]")
        for limitation in metadata.limitations:
            parts.append(f"  [yellow]-[/yellow] {limitation}")

    if parts:
        console.print(Panel("\n".join(parts), title="Assessment", border_style="dim"))


def _print_features(metadata: object) -> None:
    """Print feature flags in a compact grid."""
    from renderscope.models.renderer import RendererMetadata

    assert isinstance(metadata, RendererMetadata)

    if not metadata.features:
        return

    feature_items: list[str] = []
    for key, value in sorted(metadata.features.items()):
        label = key.replace("_", " ").title()
        if value is True:
            feature_items.append(f"[green]✓[/green] {label}")
        elif value is False:
            feature_items.append(f"[red]✗[/red] {label}")
        else:
            feature_items.append(f"[yellow]?[/yellow] {label}")

    if feature_items:
        columns = Columns(feature_items, column_first=True, padding=(0, 4))
        console.print(Panel(columns, title="Features", border_style="dim"))


def _print_links(metadata: object) -> None:
    """Print repository, docs, and paper links."""
    from renderscope.models.renderer import RendererMetadata

    assert isinstance(metadata, RendererMetadata)

    links: list[str] = []

    if metadata.repository:
        links.append(f"[bold]Repository:[/bold]  {metadata.repository}")
    if metadata.homepage:
        links.append(f"[bold]Homepage:[/bold]   {metadata.homepage}")
    if metadata.documentation:
        links.append(f"[bold]Docs:[/bold]        {metadata.documentation}")
    if metadata.paper:
        links.append(f"[bold]Paper:[/bold]       {metadata.paper}")

    if links:
        console.print(Panel("\n".join(links), title="Links", border_style="dim"))
