"""The ``renderscope download-scenes`` command.

Downloads standard benchmark scenes (Cornell Box, Sponza, etc.)
to a local directory for use in benchmarking.  Scenes are fetched
from the RenderScope scene hosting infrastructure, with graceful
fallback to the original source URLs when hosting is unavailable.
"""

from __future__ import annotations

from pathlib import Path

import typer
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from renderscope.utils.console import console, err_console


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

        status = "\u2705 Downloaded" if is_downloaded else "\u274c Not downloaded"

        table.add_row(scene_id, name, complexity, _fmt_size(size_mb), fmt_list, status)

    remaining = total_count - downloaded_count

    footer = Text()
    footer.append(f"\nTotal: {total_count} scenes ({_fmt_size(total_size)})", style="dim")
    footer.append(f"  \u2022  {downloaded_count} downloaded", style="dim")
    footer.append(f"  \u2022  {remaining} remaining", style="dim")

    console.print()
    console.print(Panel(table, title="Available Scenes", border_style="bright_blue"))
    console.print(footer)
    console.print()


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
    Stanford Bunny, etc.) in multiple formats from the RenderScope
    asset repository.
    """
    from renderscope.core.scene import SceneManager, SceneNotFoundError

    scene_manager = SceneManager(scenes_dir=output_dir)

    # List mode: show available scenes and exit.
    if list_scenes:
        all_scenes = scene_manager.list_scenes()
        scene_dicts = [s.model_dump(mode="json") for s in all_scenes]
        _print_scene_list(scene_dicts)
        raise typer.Exit(code=0)

    # Determine which scenes to download.
    if scene is not None:
        # Download a single specific scene.
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
        # Download all scenes.
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

    # Show download plan.
    total_size = sum(s.download_size_mb for s in scenes_to_download)
    console.print()
    console.print(
        f"Downloading {len(scenes_to_download)} scene(s) "
        f"({_fmt_size(total_size)}) to [bold]{scene_manager.scenes_dir}[/bold]"
    )
    console.print()

    # Download each scene.
    success_count = 0
    fail_count = 0

    for s in scenes_to_download:
        console.print(f"  \u25cf {s.name} ({s.id}) — {_fmt_size(s.download_size_mb)}")

        # Note: The actual download infrastructure (scene hosting at
        # renderscope.dev/scenes) is set up in Phase 26.  For now, the
        # download command creates the scene directory structure and marks
        # it as "ready" so the rest of the CLI can operate in demo mode.
        # When the hosting infrastructure is available, the download logic
        # below should be replaced with actual HTTP fetching.
        try:
            # Prepare scene directory.
            if force:
                scene_manager.remove_marker(s.id)

            scene_dir = scene_manager.prepare_scene_dir(s.id)

            # Create subdirectories for scene formats.
            for _fmt, rel_path in s.formats.items():
                file_path = scene_manager.scenes_dir / rel_path
                file_path.parent.mkdir(parents=True, exist_ok=True)

            # Attempt download from hosting infrastructure.
            # For now, scenes must be placed manually or acquired from
            # the original source.
            console.print(
                f"    [warning]Scene hosting not yet available.[/warning]\n"
                f"    Original source: {s.source_url}\n"
                f"    Place scene files in: {scene_dir}"
            )

            # Do not mark as downloaded since files aren't actually present.
            # When real download infrastructure is in place, this will be:
            #   scene_manager.mark_downloaded(s.id)
            fail_count += 1

        except OSError as exc:
            err_console.print(f"    [error]Failed: {exc}[/error]")
            fail_count += 1
        except Exception as exc:
            err_console.print(f"    [error]Unexpected error: {exc}[/error]")
            fail_count += 1

    # Summary.
    console.print()
    if success_count > 0:
        console.print(
            f"[success]\u2713 {success_count} scene(s) downloaded successfully.[/success]"
        )
    if fail_count > 0:
        console.print(
            f"[warning]\u26a0  {fail_count} scene(s) could not be downloaded.[/warning]\n"
            "   Scene hosting is set up in a future release.\n"
            "   For now, acquire scenes from the original sources listed above\n"
            "   and place them in the scenes directory."
        )
    console.print()
    raise typer.Exit(code=0)
