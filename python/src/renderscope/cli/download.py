"""The ``renderscope download-scenes`` command.

Downloads standard benchmark scenes (Cornell Box, Sponza, etc.) to a local
directory for use in benchmarking.  Each *format* of a scene is fetched from its
own source declared in the bundled scene manifest — either an explicit ``url`` or
a base URL (``--base-url`` / ``RENDERSCOPE_SCENE_BASE_URL``) joined with the
format's archive name — then integrity-checked against its SHA-256 and extracted
into its own directory under the scenes directory.

Formats are independent because their publishers are: the Cornell Box's OBJ
comes from Morgan McGuire's archive, its PBRT and Mitsuba descriptions from
Benedikt Bitterli's resource pack.  Fetching one never disturbs another, and a
format with no configured source is reported with its original source URL and
the path to place files manually rather than being silently skipped.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import typer
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    DownloadColumn,
    Progress,
    SpinnerColumn,
    TaskID,
    TextColumn,
    TimeRemainingColumn,
    TransferSpeedColumn,
)
from rich.table import Table
from rich.text import Text

from renderscope.utils.console import console, err_console

if TYPE_CHECKING:
    from renderscope.core.downloader import ProgressCallback
    from renderscope.core.scene import SceneInfo


def _fmt_size(mb: float) -> str:
    """Format a size in megabytes for display."""
    if mb >= 1024:
        return f"{mb / 1024:.1f} GB"
    if mb >= 1:
        return f"{mb:.0f} MB"
    return f"{mb * 1024:.0f} KB"


def _format_status(scene: SceneInfo) -> str:
    """Render a scene's per-format install state as one table cell.

    A scene is no longer simply downloaded or not: the Cornell Box can have its
    OBJ and not its PBRT.  Marking each format individually is the only honest
    summary, and it tells the reader exactly what is left to fetch.
    """
    installed = set(scene.installed_formats)
    # One format per line: the names run to eleven characters ("mitsuba_xml"),
    # and joining them on a single row pushed the table past an 80-column
    # terminal, where Rich truncated the column and hid the ticks entirely.
    return "\n".join(
        f"[success]✓[/success] {fmt}" if fmt in installed else f"[dim]·[/dim] {fmt}"
        for fmt in sorted(scene.formats)
    )


def _print_scene_list(scenes: list[SceneInfo]) -> None:
    """Print a Rich table of available scenes with their per-format status."""
    # No minimum widths: Rich shrinks columns to the terminal, and a minimum it
    # cannot honour makes it truncate the row instead of wrapping.
    table = Table(show_header=True, header_style="bold", padding=(0, 1))
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Name")
    table.add_column("Complexity", no_wrap=True)
    table.add_column("Size", justify="right", no_wrap=True)
    table.add_column("Formats", no_wrap=True)

    total_size = 0.0
    complete = 0
    partial = 0

    for scene in scenes:
        total_size += scene.download_size_mb
        installed = len(scene.installed_formats)
        if installed and installed == len(scene.formats):
            complete += 1
        elif installed:
            partial += 1

        table.add_row(
            scene.id,
            scene.name,
            scene.complexity,
            _fmt_size(scene.download_size_mb),
            _format_status(scene),
        )

    remaining = len(scenes) - complete - partial

    footer = Text()
    footer.append(f"\nTotal: {len(scenes)} scenes ({_fmt_size(total_size)})", style="dim")
    footer.append(f"  •  {complete} complete", style="dim")
    if partial:
        footer.append(f"  •  {partial} partial", style="dim")
    footer.append(f"  •  {remaining} not downloaded", style="dim")

    console.print()
    console.print(Panel(table, title="Available Scenes", border_style="bright_blue"))
    console.print(footer)
    console.print()


def _make_progress_cb(progress: Progress, task_id: TaskID) -> ProgressCallback:
    """Build a download-progress callback bound to a specific progress task."""

    def _update(done: int, total: int | None) -> None:
        progress.update(task_id, completed=done, total=total)

    return _update


def download_scenes_cmd(
    scene: str | None = typer.Option(
        None,
        "--scene",
        "-s",
        help="Download a specific scene by ID (e.g., 'cornell-box', 'sponza').",
    ),
    formats: list[str] | None = typer.Option(
        None,
        "--format",
        "-f",
        help=(
            "Only download these formats (repeatable), e.g. '--format pbrt'. "
            "Defaults to every format a scene declares."
        ),
    ),
    output_dir: Path | None = typer.Option(
        None,
        "--output-dir",
        "-o",
        help="Directory to download scenes into. Defaults to ~/.renderscope/scenes/.",
    ),
    base_url: str | None = typer.Option(
        None,
        "--base-url",
        help=(
            "Base URL hosting the scene archives. Overrides the "
            "RENDERSCOPE_SCENE_BASE_URL environment variable."
        ),
    ),
    list_scenes: bool = typer.Option(
        False,
        "--list",
        "-l",
        help="List available scenes with per-format download status.",
    ),
    force: bool = typer.Option(
        False,
        "--force",
        help="Re-download formats that already exist locally.",
    ),
) -> None:
    """Download standard benchmark scenes for use with renderscope.

    Fetches canonical test scenes (Cornell Box, Sponza Atrium, Stanford Bunny,
    etc.), verifies their integrity, and installs them into the scenes
    directory. Each format has its own source and its own directory, so you can
    fetch just the one your renderer reads.

    \b
    Examples:
        renderscope download-scenes --list
        renderscope download-scenes --scene cornell-box
        renderscope download-scenes --scene cornell-box --format pbrt
    """
    from renderscope.core.downloader import (
        SceneDownloader,
        SceneDownloadError,
        SceneSourceUnavailableError,
    )
    from renderscope.core.scene import SceneManager, SceneNotFoundError

    scene_manager = SceneManager(scenes_dir=output_dir)

    # List mode: show available scenes and exit.
    if list_scenes:
        _print_scene_list(scene_manager.list_scenes())
        raise typer.Exit(code=0)

    # Determine which scenes to consider.
    if scene is not None:
        try:
            scenes_to_download = [scene_manager.get_scene(scene)]
        except SceneNotFoundError:
            err_console.print(f"[error]Unknown scene: '{scene}'[/error]")
            available = scene_manager.get_scene_ids()
            if available:
                err_console.print(f"Available scenes: {', '.join(available)}")
            raise typer.Exit(code=1) from None
    else:
        scenes_to_download = scene_manager.list_scenes()

    if not scenes_to_download:
        console.print("[warning]No scenes available to download.[/warning]")
        raise typer.Exit(code=0)

    requested_formats = list(formats) if formats else None
    if requested_formats is not None:
        unknown = sorted(
            {
                fmt
                for fmt in requested_formats
                if not any(fmt in s.formats for s in scenes_to_download)
            }
        )
        if unknown:
            declared = sorted({f for s in scenes_to_download for f in s.formats})
            err_console.print(
                f"[error]No selected scene offers: {', '.join(unknown)}[/error]\n"
                f"Available formats: {', '.join(declared)}"
            )
            raise typer.Exit(code=1)

    downloader = SceneDownloader(scene_manager, base_url=base_url)

    # Expand the request into concrete (scene, format) jobs, dropping what is
    # already installed and recording what has no source to fetch from.
    jobs: list[tuple[SceneInfo, str]] = []
    no_source: list[tuple[SceneInfo, str]] = []
    for s in scenes_to_download:
        wanted = [
            f for f in sorted(s.formats) if requested_formats is None or f in requested_formats
        ]
        for fmt in wanted:
            if not force and scene_manager.is_format_downloaded(s.id, fmt):
                continue
            if downloader.resolve_url(s, fmt):
                jobs.append((s, fmt))
            else:
                no_source.append((s, fmt))

    if not jobs and not no_source:
        console.print(
            "[success]All requested formats are already downloaded.[/success]\n"
            "Use --force to re-download."
        )
        raise typer.Exit(code=0)

    # Show the download plan.
    total_size = sum(s.formats[fmt].size_mb for s, fmt in jobs)
    scene_count = len({s.id for s, _ in jobs})
    console.print()
    if jobs:
        console.print(
            f"Downloading {len(jobs)} format(s) across {scene_count} scene(s) "
            f"({_fmt_size(total_size)}) to [bold]{scene_manager.scenes_dir}[/bold]"
        )
        if downloader.base_url:
            console.print(f"Source: [bold]{downloader.base_url}[/bold]")
    console.print()

    success_count = 0
    failures: list[tuple[str, str, Exception]] = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        DownloadColumn(),
        TransferSpeedColumn(),
        TimeRemainingColumn(),
        console=console,
    ) as progress:
        for s, fmt in jobs:
            label = f"{s.name} ({s.id}/{fmt})"
            task_id = progress.add_task(label, total=None)
            try:
                downloader.download_format(s.id, fmt, progress=_make_progress_cb(progress, task_id))
                progress.update(task_id, description=f"[success]✓ {label}[/success]")
                success_count += 1
            except SceneSourceUnavailableError:
                progress.update(
                    task_id,
                    description=f"[warning]• {label} — no source[/warning]",
                    total=1,
                    completed=1,
                )
                no_source.append((s, fmt))
            except SceneDownloadError as exc:
                progress.update(
                    task_id,
                    description=f"[error]✗ {label}[/error]",
                    total=1,
                    completed=1,
                )
                failures.append((s.id, fmt, exc))

    # Summary.
    console.print()
    if success_count > 0:
        console.print(f"[success]✓ {success_count} format(s) downloaded successfully.[/success]")

    if no_source:
        console.print(
            f"\n[warning]⚠  {len(no_source)} format(s) have no download source "
            f"configured.[/warning]\n"
            "   Set --base-url / RENDERSCOPE_SCENE_BASE_URL, or acquire them manually:"
        )
        for s, fmt in no_source:
            console.print(
                f"     • [bold]{s.id}[/bold] ({fmt}) — {s.source_url}\n"
                f"       place files in: {scene_manager.format_dir(s.id, fmt)}"
            )

    if failures:
        err_console.print(f"\n[error]✗ {len(failures)} format(s) failed to download.[/error]")
        for scene_id, fmt, error in failures:
            err_console.print(f"     • [bold]{scene_id}[/bold] ({fmt}): {error}")

    console.print()
    raise typer.Exit(code=1 if failures else 0)
