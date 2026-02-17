#!/usr/bin/env python3
"""
RenderScope Scene Acquisition Script

Downloads standard benchmark scenes from their official public sources into
the assets/scenes/ directory. Scenes are used by the benchmark runner to
produce fair, apples-to-apples visual and performance comparisons.

Usage:
    python scripts/acquire_scenes.py                     # Download all scenes
    python scripts/acquire_scenes.py --scene cornell-box # Download one scene
    python scripts/acquire_scenes.py --list              # Show status table
    python scripts/acquire_scenes.py --dry-run           # Preview downloads
    python scripts/acquire_scenes.py --force             # Re-download all

Exit codes:
    0 = All requested downloads succeeded (or --list / --dry-run)
    1 = One or more downloads failed
"""

from __future__ import annotations

import argparse
import hashlib
import io
import shutil
import sys
import tarfile
import tempfile
import time
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# Ensure stdout can handle unicode on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package is required. Install with: pip install requests")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.progress import (
        BarColumn,
        DownloadColumn,
        Progress,
        TextColumn,
        TimeRemainingColumn,
        TransferSpeedColumn,
    )
    from rich.table import Table

    HAS_RICH = True
except ImportError:
    HAS_RICH = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "assets" / "scenes"
SCENE_COMPLETE_MARKER = ".scene-complete"

MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 4  # seconds: 1, 4, 16
DOWNLOAD_TIMEOUT = 60  # seconds per request
CHUNK_SIZE = 8192
MIN_DISK_SPACE_MB = 500

console = Console() if HAS_RICH else None


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class DownloadEntry:
    """A single file to download for a scene."""

    url: str
    filename: str
    sha256: Optional[str] = None
    extract: bool = False


@dataclass
class SceneSource:
    """Registry entry describing how to acquire a specific scene."""

    id: str
    name: str
    urls: list[DownloadEntry] = field(default_factory=list)
    post_download: Optional[str] = None
    expected_files: list[str] = field(default_factory=list)
    total_size_mb: float = 0.0


@dataclass
class DownloadResult:
    """Result of downloading a single scene."""

    scene_id: str
    success: bool
    bytes_downloaded: int = 0
    time_seconds: float = 0.0
    error: Optional[str] = None
    skipped: bool = False


# ---------------------------------------------------------------------------
# Scene source registry
# ---------------------------------------------------------------------------

# Each entry defines where to download a scene from and what files to expect.
# URLs point to public, freely available resources.
# SHA-256 hashes are provided where known; None means skip hash verification.

SCENE_SOURCES: list[SceneSource] = [
    SceneSource(
        id="cornell-box",
        name="Cornell Box",
        urls=[
            DownloadEntry(
                url="https://casual-effects.com/g3d/data10/common/model/CornellBox/CornellBox.zip",
                filename="CornellBox.zip",
                extract=True,
            ),
        ],
        expected_files=["CornellBox-Original.obj"],
        total_size_mb=0.3,
    ),
    SceneSource(
        id="sponza",
        name="Sponza Atrium",
        urls=[
            DownloadEntry(
                url="https://casual-effects.com/g3d/data10/common/model/crytek_sponza/sponza.zip",
                filename="sponza.zip",
                extract=True,
            ),
        ],
        expected_files=["sponza.obj"],
        total_size_mb=76.0,
    ),
    SceneSource(
        id="stanford-bunny",
        name="Stanford Bunny",
        urls=[
            DownloadEntry(
                url="https://graphics.stanford.edu/~mdfisher/Data/Meshes/bunny.obj",
                filename="stanford-bunny.obj",
            ),
        ],
        expected_files=["stanford-bunny.obj"],
        total_size_mb=0.2,
    ),
    SceneSource(
        id="classroom",
        name="Classroom",
        urls=[
            DownloadEntry(
                url="https://download.blender.org/demo/test/classroom.zip",
                filename="classroom.zip",
                extract=True,
            ),
        ],
        expected_files=["classroom.blend"],
        total_size_mb=67.0,
    ),
    SceneSource(
        id="bmw",
        name="BMW M6",
        urls=[
            DownloadEntry(
                url="https://download.blender.org/demo/test/BMW27.blend.zip",
                filename="bmw.zip",
                extract=True,
            ),
        ],
        expected_files=["BMW27.blend"],
        total_size_mb=2.9,
    ),
    SceneSource(
        id="san-miguel",
        name="San Miguel",
        urls=[
            DownloadEntry(
                url="https://casual-effects.com/g3d/data10/research/model/San_Miguel/San_Miguel.zip",
                filename="San_Miguel.zip",
                extract=True,
            ),
        ],
        expected_files=["San_Miguel.obj"],
        total_size_mb=510.0,
    ),
    SceneSource(
        id="veach-mis",
        name="Veach MIS",
        urls=[
            DownloadEntry(
                url="https://benedikt-bitterli.me/resources/pbrt-v4/veach-mis.zip",
                filename="veach-mis.zip",
                extract=True,
            ),
        ],
        expected_files=["scene-v4.pbrt"],
        total_size_mb=1.9,
    ),
]

SCENE_SOURCE_MAP: dict[str, SceneSource] = {s.id: s for s in SCENE_SOURCES}


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------


def _log(msg: str, style: str = "") -> None:
    """Print a message, optionally styled with Rich."""
    if console and style:
        console.print(msg, style=style)
    else:
        print(msg)


def _log_error(msg: str) -> None:
    _log(f"  [ERROR] {msg}", style="bold red")


def _log_warn(msg: str) -> None:
    _log(f"  [WARN]  {msg}", style="yellow")


def _log_info(msg: str) -> None:
    _log(f"  [INFO]  {msg}", style="dim")


def _log_ok(msg: str) -> None:
    _log(f"  [OK]    {msg}", style="green")


def check_disk_space(path: Path, required_mb: float) -> bool:
    """Check if there is enough disk space at the given path."""
    try:
        usage = shutil.disk_usage(path if path.exists() else path.parent)
        free_mb = usage.free / (1024 * 1024)
        if free_mb < required_mb:
            _log_warn(
                f"Low disk space: {free_mb:.0f} MB free, "
                f"need at least {required_mb:.0f} MB"
            )
            return False
    except OSError:
        pass  # Can't check disk space — proceed anyway
    return True


def compute_sha256(path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(CHUNK_SIZE), b""):
            h.update(chunk)
    return h.hexdigest()


def download_file(
    url: str,
    dest: Path,
    desc: str = "",
) -> int:
    """Download a file from a URL to a local path with retry logic.

    Returns the number of bytes downloaded.
    Raises RuntimeError on failure after all retries.
    """
    last_error: Optional[Exception] = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(
                url,
                stream=True,
                timeout=DOWNLOAD_TIMEOUT,
                headers={"User-Agent": "RenderScope-SceneAcquirer/1.0"},
            )
            response.raise_for_status()

            total_size = int(response.headers.get("content-length", 0))

            if HAS_RICH and total_size > 0:
                with Progress(
                    TextColumn("[bold blue]{task.description}"),
                    BarColumn(),
                    DownloadColumn(),
                    TransferSpeedColumn(),
                    TimeRemainingColumn(),
                    console=console,
                ) as progress:
                    task = progress.add_task(
                        desc or dest.name, total=total_size
                    )
                    bytes_written = 0
                    with open(dest, "wb") as f:
                        for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                            f.write(chunk)
                            bytes_written += len(chunk)
                            progress.update(task, advance=len(chunk))
                    return bytes_written
            else:
                # Fallback: no Rich or unknown content length
                bytes_written = 0
                with open(dest, "wb") as f:
                    for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                        f.write(chunk)
                        bytes_written += len(chunk)
                if not HAS_RICH:
                    print(f"    Downloaded {bytes_written:,} bytes")
                return bytes_written

        except (requests.RequestException, OSError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                wait = RETRY_BACKOFF_BASE ** (attempt - 1)
                _log_warn(
                    f"Download failed (attempt {attempt}/{MAX_RETRIES}): {exc}. "
                    f"Retrying in {wait}s..."
                )
                time.sleep(wait)
            else:
                # Clean up partial download
                if dest.exists():
                    dest.unlink()

    raise RuntimeError(
        f"Download failed after {MAX_RETRIES} attempts: {last_error}"
    )


def extract_archive(archive_path: Path, dest_dir: Path) -> list[str]:
    """Extract a zip or tar archive into dest_dir.

    Returns a list of extracted file names.
    """
    extracted: list[str] = []

    if zipfile.is_zipfile(archive_path):
        with zipfile.ZipFile(archive_path, "r") as zf:
            zf.extractall(dest_dir)
            extracted = zf.namelist()
    elif tarfile.is_tarfile(archive_path):
        with tarfile.open(archive_path, "r:*") as tf:
            tf.extractall(dest_dir, filter="data")
            extracted = tf.getnames()
    else:
        raise RuntimeError(
            f"Unknown archive format: {archive_path.name}. "
            f"Expected .zip or .tar.gz"
        )

    return extracted


def is_scene_downloaded(scene_dir: Path) -> bool:
    """Check if a scene has been successfully downloaded."""
    marker = scene_dir / SCENE_COMPLETE_MARKER
    return marker.exists()


def mark_scene_complete(scene_dir: Path) -> None:
    """Write a marker file indicating successful download."""
    marker = scene_dir / SCENE_COMPLETE_MARKER
    marker.write_text(
        f"Scene download completed successfully.\n"
        f"Timestamp: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n"
    )


# ---------------------------------------------------------------------------
# Core download logic
# ---------------------------------------------------------------------------


def download_scene(
    scene: SceneSource,
    output_dir: Path,
    force: bool = False,
    dry_run: bool = False,
    verbose: bool = False,
) -> DownloadResult:
    """Download a single scene.

    Steps:
    1. Create output directory if needed.
    2. Check if already downloaded (skip unless --force).
    3. Check disk space.
    4. Download each file entry.
    5. Verify SHA-256 hashes where provided.
    6. Extract archives if needed.
    7. Verify expected files exist.
    8. Write completion marker.
    """
    scene_dir = output_dir / scene.id
    start_time = time.monotonic()

    # Check if already downloaded
    if not force and is_scene_downloaded(scene_dir):
        if verbose:
            _log_info(f"{scene.name}: Already downloaded, skipping")
        return DownloadResult(
            scene_id=scene.id,
            success=True,
            skipped=True,
        )

    if dry_run:
        total_mb = scene.total_size_mb
        _log_info(
            f"{scene.name}: Would download ~{total_mb:.1f} MB "
            f"({len(scene.urls)} file{'s' if len(scene.urls) != 1 else ''}) "
            f"to {scene_dir}"
        )
        return DownloadResult(scene_id=scene.id, success=True, skipped=True)

    # Check disk space
    check_disk_space(output_dir, scene.total_size_mb + MIN_DISK_SPACE_MB)

    # Create scene directory
    scene_dir.mkdir(parents=True, exist_ok=True)

    total_bytes = 0

    for entry in scene.urls:
        dest_path = scene_dir / entry.filename
        desc = f"{scene.name} / {entry.filename}"

        # Skip if file already exists and not forcing
        if not force and dest_path.exists() and dest_path.stat().st_size > 0:
            if verbose:
                _log_info(f"  {entry.filename}: Already exists, skipping")
            continue

        _log(f"  Downloading {entry.filename}...")

        try:
            bytes_dl = download_file(entry.url, dest_path, desc=desc)
            total_bytes += bytes_dl
        except RuntimeError as exc:
            _log_error(f"Failed to download {entry.filename}: {exc}")
            return DownloadResult(
                scene_id=scene.id,
                success=False,
                bytes_downloaded=total_bytes,
                time_seconds=time.monotonic() - start_time,
                error=str(exc),
            )

        # Verify SHA-256 hash if provided
        if entry.sha256:
            actual_hash = compute_sha256(dest_path)
            if actual_hash != entry.sha256:
                _log_warn(
                    f"  Hash mismatch for {entry.filename}. "
                    f"Expected: {entry.sha256[:16]}..., "
                    f"Got: {actual_hash[:16]}... "
                    f"(file may have been updated at source)"
                )

        # Extract archive if needed
        if entry.extract:
            _log(f"  Extracting {entry.filename}...")
            try:
                extracted = extract_archive(dest_path, scene_dir)
                if verbose:
                    _log_info(f"  Extracted {len(extracted)} items")
            except RuntimeError as exc:
                _log_error(f"Failed to extract {entry.filename}: {exc}")
                return DownloadResult(
                    scene_id=scene.id,
                    success=False,
                    bytes_downloaded=total_bytes,
                    time_seconds=time.monotonic() - start_time,
                    error=str(exc),
                )

    # Verify expected files exist
    missing_files: list[str] = []
    if scene.expected_files:
        for expected in scene.expected_files:
            # Search recursively in case extraction created subdirectories
            found = (
                (scene_dir / expected).exists()
                or any(scene_dir.rglob(expected))
            )
            if not found:
                missing_files.append(expected)

        if missing_files:
            _log_warn(
                f"  Expected files not found: {', '.join(missing_files)}. "
                f"The archive structure may differ from expectations. "
                f"Check {scene_dir} manually."
            )

    # Mark scene as complete
    mark_scene_complete(scene_dir)

    elapsed = time.monotonic() - start_time
    _log_ok(
        f"{scene.name}: Downloaded {total_bytes:,} bytes in {elapsed:.1f}s"
    )

    return DownloadResult(
        scene_id=scene.id,
        success=True,
        bytes_downloaded=total_bytes,
        time_seconds=elapsed,
    )


# ---------------------------------------------------------------------------
# List command
# ---------------------------------------------------------------------------


def list_scenes(output_dir: Path) -> None:
    """Print a table of all scenes with their download status."""
    if HAS_RICH:
        table = Table(title="RenderScope Standard Benchmark Scenes")
        table.add_column("Scene", style="bold")
        table.add_column("Complexity", style="dim")
        table.add_column("Size", justify="right")
        table.add_column("Status")
        table.add_column("Formats", style="dim")

        for scene in SCENE_SOURCES:
            scene_dir = output_dir / scene.id
            downloaded = is_scene_downloaded(scene_dir)

            status = "[green]Downloaded[/green]" if downloaded else "[red]Not found[/red]"
            size_str = (
                f"< 1 MB" if scene.total_size_mb < 1
                else f"{scene.total_size_mb:.0f} MB"
            )

            # Determine available formats from existing files
            if downloaded:
                extensions = {
                    p.suffix.lstrip(".")
                    for p in scene_dir.rglob("*")
                    if p.is_file() and p.suffix and p.name != SCENE_COMPLETE_MARKER
                }
                formats = ", ".join(sorted(extensions)) or "N/A"
            else:
                formats = "\u2014"

            table.add_row(scene.name, _get_complexity(scene.id), size_str, status, formats)

        # Summary row
        downloaded_count = sum(
            1 for s in SCENE_SOURCES
            if is_scene_downloaded(output_dir / s.id)
        )
        downloaded_mb = sum(
            s.total_size_mb for s in SCENE_SOURCES
            if is_scene_downloaded(output_dir / s.id)
        )
        remaining_count = len(SCENE_SOURCES) - downloaded_count
        remaining_mb = sum(
            s.total_size_mb for s in SCENE_SOURCES
            if not is_scene_downloaded(output_dir / s.id)
        )

        if console:
            console.print(table)
            console.print(
                f"\n  Total: {downloaded_count}/{len(SCENE_SOURCES)} downloaded "
                f"(~{downloaded_mb:.0f} MB), "
                f"{remaining_count} remaining (~{remaining_mb:.0f} MB)"
            )
    else:
        # Fallback plain text
        print("\nRenderScope Standard Benchmark Scenes")
        print("=" * 60)
        print(f"  {'Scene':<20} {'Complexity':<10} {'Size':>8}   {'Status'}")
        print(f"  {'-'*20} {'-'*10} {'-'*8}   {'-'*12}")
        for scene in SCENE_SOURCES:
            scene_dir = output_dir / scene.id
            downloaded = is_scene_downloaded(scene_dir)
            status = "Downloaded" if downloaded else "Not found"
            size_str = (
                "< 1 MB" if scene.total_size_mb < 1
                else f"{scene.total_size_mb:.0f} MB"
            )
            complexity = _get_complexity(scene.id)
            print(f"  {scene.name:<20} {complexity:<10} {size_str:>8}   {status}")


def _get_complexity(scene_id: str) -> str:
    """Get the complexity string for a scene from the metadata JSON."""
    import json

    scene_json = PROJECT_ROOT / "data" / "scenes" / f"{scene_id}.json"
    if scene_json.exists():
        try:
            with open(scene_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("complexity", "unknown")
        except (json.JSONDecodeError, OSError):
            pass
    return "unknown"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download standard benchmark scenes for RenderScope.",
        epilog=(
            "Scenes are downloaded into assets/scenes/ by default. "
            "Each scene is stored in its own subdirectory."
        ),
    )
    parser.add_argument(
        "--scene", "-s",
        action="append",
        dest="scenes",
        metavar="ID",
        help=(
            "Download a specific scene by ID (e.g., cornell-box). "
            "Can be repeated. If omitted, downloads all scenes."
        ),
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR.relative_to(PROJECT_ROOT)})",
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        dest="list_scenes",
        help="List all available scenes with download status, then exit.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if scene files already exist locally.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be downloaded without actually downloading.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging.",
    )

    args = parser.parse_args()

    # Handle --list
    if args.list_scenes:
        list_scenes(args.output_dir)
        return 0

    # Determine which scenes to download
    if args.scenes:
        scenes_to_download: list[SceneSource] = []
        for sid in args.scenes:
            if sid not in SCENE_SOURCE_MAP:
                _log_error(
                    f"Unknown scene ID: '{sid}'. "
                    f"Available: {', '.join(SCENE_SOURCE_MAP.keys())}"
                )
                return 1
            scenes_to_download.append(SCENE_SOURCE_MAP[sid])
    else:
        scenes_to_download = list(SCENE_SOURCES)

    # Create output directory
    args.output_dir.mkdir(parents=True, exist_ok=True)

    # Download scenes
    _log(f"\nDownloading {len(scenes_to_download)} scene(s)...\n", style="bold")

    results: list[DownloadResult] = []
    for i, scene in enumerate(scenes_to_download, 1):
        _log(
            f"[{i}/{len(scenes_to_download)}] {scene.name}",
            style="bold cyan",
        )
        result = download_scene(
            scene=scene,
            output_dir=args.output_dir,
            force=args.force,
            dry_run=args.dry_run,
            verbose=args.verbose,
        )
        results.append(result)
        print()  # Blank line between scenes

    # Print summary
    succeeded = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success)
    skipped = sum(1 for r in results if r.skipped)
    total_bytes = sum(r.bytes_downloaded for r in results)
    total_time = sum(r.time_seconds for r in results)

    _log("Summary", style="bold")
    _log(f"  Succeeded: {succeeded}", style="green" if succeeded else "")
    if skipped:
        _log(f"  Skipped:   {skipped}", style="dim")
    if failed:
        _log(f"  Failed:    {failed}", style="red")
        for r in results:
            if not r.success:
                _log(f"    - {r.scene_id}: {r.error}", style="red")
    if total_bytes > 0:
        _log(f"  Downloaded: {total_bytes / (1024 * 1024):.1f} MB in {total_time:.1f}s")

    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
