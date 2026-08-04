"""The ``renderscope download-scenes`` command.

Downloads standard benchmark scenes (Cornell Box, Sponza, etc.) to a local
directory for use in benchmarking.  Each scene is fetched from the source
declared in the bundled scene manifest — either a per-scene ``archive_url`` or a
base URL (``--base-url`` / ``RENDERSCOPE_SCENE_BASE_URL``) joined with the
scene's archive name — then integrity-checked against its manifest SHA-256 and
extracted into the scenes directory.

Scenes that don't yet have a download source configured are reported with their
original source URL and the path to place files manually, rather than being
silently skipped.
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


def _fmt_size(mb: float) -> str:
    """Format a size in megabytes for display."""
    if mb >= 1024:
        return f"{mb / 1024:.1f} GB"
    if mb >= 1:
        return f"{mb:.0f} MB"
    return f"{mb * 1024:.0f} KB"


def _print_scene_list(
    scenes: list[dict[str, object]],
) -> None:
    """Print a Rich table of available scenes with their download status."""
    table = Table(show_header=True, header_style="bold", padding=(0, 2))
    table.add_column("ID", style="cyan", min_width=16)
    table.add_column("Name", min_width=16)
    table.add_column("Complexity", min_width=10)
    table.add_column("Size", min_width=8, justify="right")
    table.add_column("Formats", min_width=10)
    table.add_column("Status", min_width=18)

    total_size = 0.0
    downloaded_count = 0
    total_count = len(scenes)

    for scene in scenes:
        scene_id = str(scene.get("id", ""))
        name = str(scene.get("name", ""))
        complexity = str(scene.get("complexity", ""))
        raw_size = scene.get("download_size_mb", 0)
        size_mb = float(raw_size) if isinstance(raw_size, (int, float, str)) else 0.0
        formats = scene.get("formats")
        is_downloaded = bool(scene.get("is_downloaded", False))

        total_size += size_mb
        if is_downloaded:
            downloaded_count += 1

        fmt_list = ""
        if isinstance(formats, dict):
            fmt_list = ", ".join(sorted(formats.keys()))

        status = "✅ Downloaded" if is_downloaded else "❌ Not downloaded"

        table.add_row(scene_id, name, complexity, _fmt_size(size_mb), fmt_list, status)

    remaining = total_count - downloaded_count

    footer = Text()
    footer.append(f"\nTotal: {total_count} scenes ({_fmt_size(total_size)})", style="dim")
    footer.append(f"  •  {downloaded_count} downloaded", style="dim")
    footer.append(f"  •  {remaining} remaining", style="dim")

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
        help="List available scenes with download status.",
    ),
    force: bool = typer.Option(
        False,
        "--force",
        help="Re-download scenes even if they already exist locally.",
    ),
) -> None:
    """Download standard benchmark scenes for use with renderscope.

    Fetches canonical test scenes (Cornell Box, Sponza Atrium,
    Stanford Bunny, etc.) in multiple formats, verifies their integrity,
    and installs them into the scenes directory.
    """
    from renderscope.core.downloader import (
        ArchiveExtractionError,
        ChecksumMismatchError,
        DownloadFailedError,
        SceneDownloader,
        SceneSourceUnavailableError,
    )
    from renderscope.core.scene import SceneInfo, SceneManager, SceneNotFoundError

    scene_manager = SceneManager(scenes_dir=output_dir)

    # List mode: show available scenes and exit.
    if list_scenes:
        all_scenes = scene_manager.list_scenes()
        scene_dicts = [s.model_dump(mode="json") for s in all_scenes]
        _print_scene_list(scene_dicts)
        raise typer.Exit(code=0)

    # Determine which scenes to download.
    if scene is not None:
        try:
            scene_info = scene_manager.get_scene(scene)
        except SceneNotFoundError:
            err_console.print(f"[error]Unknown scene: '{scene}'[/error]")
            available = scene_manager.get_scene_ids()
            if available:
                err_console.print(f"Available scenes: {', '.join(available)}")
            raise typer.Exit(code=1) from None

        scenes_to_download = [scene_info]
    else:
        scenes_to_download = scene_manager.list_scenes()

    if not scenes_to_download:
        console.print("[warning]No scenes available to download.[/warning]")
        raise typer.Exit(code=0)

    # Filter already-downloaded scenes (unless --force).
    if not force:
        scenes_to_download = [
            s for s in scenes_to_download if not scene_manager.is_downloaded(s.id)
        ]
        if not scenes_to_download:
            console.print(
                "[success]All requested scenes are already downloaded.[/success]\n"
                "Use --force to re-download."
            )
            raise typer.Exit(code=0)

    downloader = SceneDownloader(scene_manager, base_url=base_url)

    # Show the download plan.
    total_size = sum(s.download_size_mb for s in scenes_to_download)
    console.print()
    console.print(
        f"Downloading {len(scenes_to_download)} scene(s) "
        f"({_fmt_size(total_size)}) to [bold]{scene_manager.scenes_dir}[/bold]"
    )
    if downloader.base_url:
        console.print(f"Source: [bold]{downloader.base_url}[/bold]")
    console.print()

    success_count = 0
    no_source: list[SceneInfo] = []
    failures: list[tuple[SceneInfo, Exception]] = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        DownloadColumn(),
        TransferSpeedColumn(),
        TimeRemainingColumn(),
        console=console,
    ) as progress:
        for s in scenes_to_download:
            task_id = progress.add_task(f"{s.name} ({s.id})", total=None)
            try:
                downloader.download_scene(s.id, progress=_make_progress_cb(progress, task_id))
                progress.update(task_id, description=f"[success]✓ {s.name} ({s.id})[/success]")
                success_count += 1
            except SceneSourceUnavailableError:
                progress.update(
                    task_id,
                    description=f"[warning]• {s.name} ({s.id}) — no source[/warning]",
                    total=1,
                    completed=1,
                )
                no_source.append(s)
            except (DownloadFailedError, ChecksumMismatchError, ArchiveExtractionError) as exc:
                progress.update(
                    task_id,
                    description=f"[error]✗ {s.name} ({s.id})[/error]",
                    total=1,
                    completed=1,
                )
                failures.append((s, exc))

    # Summary.
    console.print()
    if success_count > 0:
        console.print(f"[success]✓ {success_count} scene(s) downloaded successfully.[/success]")

    if no_source:
        console.print(
            f"\n[warning]⚠  {len(no_source)} scene(s) have no download source configured.[/warning]\n"
            "   Set --base-url / RENDERSCOPE_SCENE_BASE_URL, or acquire them manually:"
        )
        for s in no_source:
            console.print(
                f"     • [bold]{s.id}[/bold] — {s.source_url}\n"
                f"       place files in: {scene_manager.scenes_dir / s.id}"
            )

    if failures:
        err_console.print(f"\n[error]✗ {len(failures)} scene(s) failed to download.[/error]")
        for failed_scene, error in failures:
            err_console.print(f"     • [bold]{failed_scene.id}[/bold]: {error}")

    console.print()
    raise typer.Exit(code=1 if failures else 0)
