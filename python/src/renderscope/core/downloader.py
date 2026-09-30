"""Scene archive downloading, verification, and extraction.

:class:`SceneDownloader` fetches the per-format sources declared in the scene
manifest, verifies their integrity via SHA-256, and extracts them atomically
into the local scenes directory managed by :class:`~renderscope.core.scene.SceneManager`.
On success it writes a completion marker so the rest of the CLI recognizes the
format as available for benchmarking.

Only the Python standard library is used (``urllib``, ``hashlib``, ``tarfile``,
``zipfile``), so the package gains no new runtime dependencies.  ``file://``
URLs are fully supported, which keeps the entire download path testable without
a network connection.

**One source per format.**  A scene is rarely published as a single archive
containing every format: the Cornell Box's OBJ comes from Morgan McGuire's
archive, its PBRT and Mitsuba descriptions from Benedikt Bitterli's resource
pack.  Each format is therefore fetched, checksummed and installed on its own.

**Archive contract.**  A format's archive is extracted *into* its own directory
(``<scenes_dir>/<scene_id>/<format>/``); its members are treated as paths
relative to that directory, which is what the manifest's ``path`` is relative to.
Formats never share a directory, so installing one can neither clobber nor be
clobbered by another.

**Source resolution.**  A format is downloaded from, in order of precedence:

1. its ``url`` (a fully-qualified ``http(s)://`` / ``file://`` URL), or
2. a configured base URL joined with the format's ``archive`` name (defaulting
   to ``<scene_id>-<format>.tar.gz``).  The base URL comes from the ``base_url``
   argument or the ``RENDERSCOPE_SCENE_BASE_URL`` environment variable.

If neither source is available the format is reported as unavailable rather than
silently skipped, so callers can tell a missing download from a missing source.
"""

from __future__ import annotations

import hashlib
import logging
import os
import shutil
import sys
import tarfile
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from renderscope.core.scene import SceneFormat, SceneInfo, SceneManager

logger = logging.getLogger(__name__)

# Environment variable supplying the base URL for scene archives when a format
# declares a relative ``archive`` rather than a fully-qualified ``url``.
BASE_URL_ENV = "RENDERSCOPE_SCENE_BASE_URL"

_DEFAULT_CHUNK_SIZE = 1 << 16  # 64 KiB
_DEFAULT_TIMEOUT_S = 30.0

# Progress callback invoked as ``progress(bytes_downloaded, total_bytes_or_None)``.
ProgressCallback = Callable[[int, "int | None"], None]

# Progress callback for a whole scene, invoked as
# ``progress(format_id, bytes_downloaded, total_bytes_or_None)``.
SceneProgressCallback = Callable[[str, int, "int | None"], None]


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class SceneDownloadError(Exception):
    """Base class for all scene-download failures."""


class SceneSourceUnavailableError(SceneDownloadError):
    """Raised when no format of a scene has a download source configured."""

    def __init__(self, scene_id: str, formats: list[str] | None = None) -> None:
        self.scene_id = scene_id
        self.formats = formats or []
        where = f" ({', '.join(self.formats)})" if self.formats else ""
        super().__init__(
            f"No download source is configured for scene '{scene_id}'{where}.\n"
            f"Set the {BASE_URL_ENV} environment variable to a scene host, add a "
            f"'url' to the format's entry in data/scenes/, or place the files manually."
        )


class DownloadFailedError(SceneDownloadError):
    """Raised when a source could not be fetched."""

    def __init__(self, scene_id: str, fmt: str, url: str, reason: str) -> None:
        self.scene_id = scene_id
        self.format = fmt
        self.url = url
        self.reason = reason
        super().__init__(f"Failed to download scene '{scene_id}' ({fmt}) from {url}: {reason}")


class ChecksumMismatchError(SceneDownloadError):
    """Raised when a download's SHA-256 doesn't match the manifest."""

    def __init__(self, scene_id: str, fmt: str, expected: str, actual: str) -> None:
        self.scene_id = scene_id
        self.format = fmt
        self.expected = expected
        self.actual = actual
        super().__init__(
            f"Checksum mismatch for scene '{scene_id}' ({fmt}).\n"
            f"  expected sha256: {expected}\n"
            f"  actual   sha256: {actual}\n"
            "The download may be corrupt or the manifest out of date; nothing was installed."
        )


class ArchiveExtractionError(SceneDownloadError):
    """Raised when an archive is unsupported, corrupt, or contains unsafe paths."""

    def __init__(self, scene_id: str, fmt: str, reason: str) -> None:
        self.scene_id = scene_id
        self.format = fmt
        self.reason = reason
        super().__init__(f"Could not extract the {fmt} archive for scene '{scene_id}': {reason}")


class SceneFileMissingError(SceneDownloadError):
    """Raised when an archive installed cleanly but lacks the promised file.

    A checksum proves the bytes arrived intact; it says nothing about the
    archive's internal layout.  Catching a wrong ``path`` here — before the
    marker is written — keeps a format from being reported as installed when
    nothing can actually read it.
    """

    def __init__(self, scene_id: str, fmt: str, expected: str) -> None:
        self.scene_id = scene_id
        self.format = fmt
        self.expected = expected
        super().__init__(
            f"The {fmt} archive for scene '{scene_id}' does not contain '{expected}'.\n"
            "The upstream archive's layout has probably changed; the declared "
            "path needs updating in data/scenes/."
        )


# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FormatDownloadResult:
    """Outcome of successfully installing one format of a scene."""

    scene_id: str
    format: str
    url: str
    archive_bytes: int
    verified: bool  # True only if a checksum was present in the manifest and matched.
    format_dir: Path
    scene_path: Path  # The file the manifest promises, now known to exist.


@dataclass(frozen=True)
class DownloadResult:
    """Outcome of downloading a scene: one entry per format installed."""

    scene_id: str
    scene_dir: Path
    formats: tuple[FormatDownloadResult, ...]
    # Formats that were requested but have no configured source. Reported rather
    # than raised, so one unhostable format cannot block the rest of a scene.
    without_source: tuple[str, ...] = ()

    @property
    def archive_bytes(self) -> int:
        """Total bytes downloaded across every format."""
        return sum(fmt.archive_bytes for fmt in self.formats)

    @property
    def verified(self) -> bool:
        """True when every installed format was checksum-verified."""
        return bool(self.formats) and all(fmt.verified for fmt in self.formats)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _bind_format(progress: SceneProgressCallback, fmt: str) -> ProgressCallback:
    """Adapt a whole-scene progress callback to one format's download."""

    def _report(done: int, total: int | None) -> None:
        progress(fmt, done, total)

    return _report


def _is_within(base: Path, target: Path) -> bool:
    """Return True if ``target`` is the same as, or nested under, ``base``."""
    try:
        target.relative_to(base)
        return True
    except ValueError:
        return False


# ---------------------------------------------------------------------------
# SceneDownloader
# ---------------------------------------------------------------------------


class SceneDownloader:
    """Downloads, verifies, and installs benchmark-scene archives.

    Args:
        manager: The :class:`~renderscope.core.scene.SceneManager` whose
            ``scenes_dir`` the archives are installed into and whose manifest
            supplies download sources.
        base_url: Base URL for scenes that declare a relative ``archive``.
            Falls back to the ``RENDERSCOPE_SCENE_BASE_URL`` environment
            variable when ``None``.
        chunk_size: Read/hash chunk size in bytes.
        timeout: Per-request network timeout in seconds.
    """

    def __init__(
        self,
        manager: SceneManager,
        *,
        base_url: str | None = None,
        chunk_size: int = _DEFAULT_CHUNK_SIZE,
        timeout: float = _DEFAULT_TIMEOUT_S,
    ) -> None:
        self._manager = manager
        self._base_url = base_url if base_url is not None else os.environ.get(BASE_URL_ENV)
        self._chunk_size = chunk_size
        self._timeout = timeout

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def base_url(self) -> str | None:
        """The configured base URL for relative scene archives, if any."""
        return self._base_url

    def resolve_url(self, scene: SceneInfo, fmt: str) -> str | None:
        """Resolve the download URL for one format, or ``None`` if none is configured.

        Raises:
            FormatNotAvailableError: If the scene doesn't declare ``fmt``.
        """
        from renderscope.core.scene import FormatNotAvailableError

        source = scene.formats.get(fmt)
        if source is None:
            raise FormatNotAvailableError(scene.id, fmt, sorted(scene.formats))
        if source.url:
            return source.url
        if not self._base_url:
            return None
        archive_name = source.archive or f"{scene.id}-{fmt}.tar.gz"
        return f"{self._base_url.rstrip('/')}/{archive_name.lstrip('/')}"

    def downloadable_formats(self, scene: SceneInfo) -> list[str]:
        """Formats of ``scene`` that have a resolvable source, sorted."""
        return [fmt for fmt in sorted(scene.formats) if self.resolve_url(scene, fmt)]

    def download_format(
        self,
        scene_id: str,
        fmt: str,
        *,
        progress: ProgressCallback | None = None,
    ) -> FormatDownloadResult:
        """Download, verify, and install a single format of a scene.

        Replaces any existing local copy of that format atomically: the new
        files only take its place after a successful download, checksum check
        (when a checksum is declared), extraction, and a check that the file the
        manifest promises is actually there.  Other formats are untouched.

        Raises:
            SceneNotFoundError: If ``scene_id`` is not in the manifest.
            FormatNotAvailableError: If the scene doesn't declare ``fmt``.
            SceneSourceUnavailableError: If no download source is configured.
            DownloadFailedError: If the source cannot be fetched.
            ChecksumMismatchError: If the download's SHA-256 doesn't match.
            ArchiveExtractionError: If the archive is unsupported/corrupt/unsafe.
            SceneFileMissingError: If the archive lacks the declared file.
        """
        scene = self._manager.get_scene(scene_id)
        url = self.resolve_url(scene, fmt)
        if not url:
            raise SceneSourceUnavailableError(scene_id, [fmt])
        source = scene.formats[fmt]

        with tempfile.TemporaryDirectory(prefix="renderscope-dl-") as tmp:
            archive_path = Path(tmp) / self._archive_filename(url, scene_id, fmt)
            archive_bytes, digest = self._fetch(scene_id, fmt, url, archive_path, progress)

            verified = False
            if source.sha256:
                if digest.lower() != source.sha256.lower():
                    raise ChecksumMismatchError(scene_id, fmt, source.sha256, digest)
                verified = True
                logger.debug("Verified sha256 for scene '%s' (%s).", scene_id, fmt)

            format_dir = self._install(scene, fmt, source, archive_path)

        # Files are in place; record completion so is_format_downloaded() is True.
        self._manager.mark_format_downloaded(scene_id, fmt)
        logger.info(
            "Installed scene '%s' (%s, %d bytes) into %s",
            scene_id,
            fmt,
            archive_bytes,
            format_dir,
        )
        return FormatDownloadResult(
            scene_id=scene_id,
            format=fmt,
            url=url,
            archive_bytes=archive_bytes,
            verified=verified,
            format_dir=format_dir,
            scene_path=format_dir / source.path,
        )

    def download_scene(
        self,
        scene_id: str,
        *,
        formats: list[str] | None = None,
        progress: SceneProgressCallback | None = None,
    ) -> DownloadResult:
        """Download every requested format of a scene.

        Args:
            scene_id: Scene identifier.
            formats: Formats to fetch. Defaults to every format the scene
                declares. Unknown formats raise rather than being ignored.
            progress: Called as ``progress(format_id, done_bytes, total_bytes)``.

        Raises:
            SceneNotFoundError: If ``scene_id`` is not in the manifest.
            FormatNotAvailableError: If a requested format isn't declared.
            SceneSourceUnavailableError: If *no* requested format has a source.
            SceneDownloadError: Any per-format failure, raised on the first one.
        """
        from renderscope.core.scene import FormatNotAvailableError

        scene = self._manager.get_scene(scene_id)
        requested = sorted(scene.formats) if formats is None else list(dict.fromkeys(formats))
        for fmt in requested:
            if fmt not in scene.formats:
                raise FormatNotAvailableError(scene_id, fmt, sorted(scene.formats))

        wanted = [fmt for fmt in requested if self.resolve_url(scene, fmt)]
        without_source = tuple(fmt for fmt in requested if fmt not in wanted)
        if not wanted:
            raise SceneSourceUnavailableError(scene_id, list(without_source))

        installed: list[FormatDownloadResult] = []
        for fmt in wanted:
            per_format = None if progress is None else _bind_format(progress, fmt)
            installed.append(self.download_format(scene_id, fmt, progress=per_format))

        return DownloadResult(
            scene_id=scene_id,
            scene_dir=self._manager.scene_dir(scene_id),
            formats=tuple(installed),
            without_source=without_source,
        )

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    @staticmethod
    def _archive_filename(url: str, scene_id: str, fmt: str) -> str:
        """Derive a local filename for the download from its URL."""
        name = Path(urllib.parse.urlparse(url).path).name
        return name or f"{scene_id}-{fmt}.tar.gz"

    def _fetch(
        self,
        scene_id: str,
        fmt: str,
        url: str,
        dest: Path,
        progress: ProgressCallback | None,
    ) -> tuple[int, str]:
        """Stream a URL to ``dest`` while computing its SHA-256.

        Returns ``(bytes_written, sha256_hexdigest)``.
        """
        from renderscope import __version__

        request = urllib.request.Request(
            url,
            headers={"User-Agent": f"renderscope/{__version__}"},
        )
        hasher = hashlib.sha256()
        written = 0
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                total = self._content_length(response)
                if progress is not None:
                    progress(0, total)
                with dest.open("wb") as handle:
                    while True:
                        chunk = response.read(self._chunk_size)
                        if not chunk:
                            break
                        handle.write(chunk)
                        hasher.update(chunk)
                        written += len(chunk)
                        if progress is not None:
                            progress(written, total)
        except urllib.error.URLError as exc:
            raise DownloadFailedError(scene_id, fmt, url, str(exc.reason)) from exc
        except OSError as exc:
            raise DownloadFailedError(scene_id, fmt, url, str(exc)) from exc

        return written, hasher.hexdigest()

    @staticmethod
    def _content_length(response: object) -> int | None:
        """Extract a positive Content-Length from a urllib response, if present."""
        headers = getattr(response, "headers", None)
        if headers is None:
            return None
        raw = headers.get("Content-Length")
        if raw is None or not str(raw).isdigit():
            return None
        value = int(raw)
        return value if value > 0 else None

    def _install(
        self,
        scene: SceneInfo,
        fmt: str,
        source: SceneFormat,
        archive_path: Path,
    ) -> Path:
        """Extract ``archive_path`` into the format's directory atomically."""
        scene_dir = self._manager.scene_dir(scene.id)
        scene_dir.mkdir(parents=True, exist_ok=True)
        final_dir = self._manager.format_dir(scene.id, fmt)

        # Stage in a temp directory on the same filesystem so the final swap is
        # atomic, and inside the scene directory so a crash leaves the debris
        # somewhere `remove_scene` will clean up.
        staging = Path(tempfile.mkdtemp(prefix=f".{fmt}-staging-", dir=scene_dir))
        try:
            self._extract(archive_path, staging, scene.id, fmt, source.filename)
            if not (staging / source.path).is_file():
                raise SceneFileMissingError(scene.id, fmt, source.path)
            if final_dir.exists():
                shutil.rmtree(final_dir)
            os.replace(staging, final_dir)
        except BaseException:
            shutil.rmtree(staging, ignore_errors=True)
            raise
        return final_dir

    def _extract(
        self,
        archive_path: Path,
        dest: Path,
        scene_id: str,
        fmt: str,
        plain_filename: str | None = None,
    ) -> None:
        """Install a downloaded source into ``dest``.

        Archives are unpacked with path-traversal guards.  Sources published as
        a single loose file — the Stanford Bunny ships as a bare ``bunny.obj``,
        not an archive — are copied in under the format's ``filename``.
        """
        dest.mkdir(parents=True, exist_ok=True)
        if tarfile.is_tarfile(archive_path):
            with tarfile.open(archive_path) as tar:
                self._extract_tar(tar, dest, scene_id, fmt)
        elif zipfile.is_zipfile(archive_path):
            with zipfile.ZipFile(archive_path) as zf:
                self._extract_zip(zf, dest, scene_id, fmt)
        elif plain_filename:
            target = (dest / plain_filename).resolve()
            if not _is_within(dest.resolve(), target):
                raise ArchiveExtractionError(
                    scene_id, fmt, f"unsafe filename in manifest: '{plain_filename}'"
                )
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(archive_path, target)
        else:
            raise ArchiveExtractionError(
                scene_id,
                fmt,
                f"'{archive_path.name}' is not a tar or zip archive. If this "
                "source is a single file, set 'filename' on the format's entry "
                "to the name it should be saved as.",
            )

    @staticmethod
    def _extract_tar(tar: tarfile.TarFile, dest: Path, scene_id: str, fmt: str) -> None:
        base = dest.resolve()
        for member in tar.getmembers():
            target = (base / member.name).resolve()
            if not _is_within(base, target):
                raise ArchiveExtractionError(
                    scene_id, fmt, f"unsafe path in archive: '{member.name}'"
                )
            if member.issym() or member.islnk():
                link_target = (target.parent / member.linkname).resolve()
                if not _is_within(base, link_target):
                    raise ArchiveExtractionError(
                        scene_id,
                        fmt,
                        f"unsafe link in archive: '{member.name}' -> '{member.linkname}'",
                    )
        # Members validated above; use the hardened data filter where available.
        if sys.version_info >= (3, 12):
            tar.extractall(dest, filter="data")
        else:
            tar.extractall(dest)

    @staticmethod
    def _extract_zip(zf: zipfile.ZipFile, dest: Path, scene_id: str, fmt: str) -> None:
        base = dest.resolve()
        for name in zf.namelist():
            target = (base / name).resolve()
            if not _is_within(base, target):
                raise ArchiveExtractionError(scene_id, fmt, f"unsafe path in archive: '{name}'")
        zf.extractall(dest)
