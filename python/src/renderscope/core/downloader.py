"""Scene archive downloading, verification, and extraction.

:class:`SceneDownloader` fetches the per-scene archives declared in the scene
manifest, verifies their integrity via SHA-256, and extracts them atomically
into the local scenes directory managed by :class:`~renderscope.core.scene.SceneManager`.
On success it writes the completion marker so the rest of the CLI recognizes
the scene as available for benchmarking.

Only the Python standard library is used (``urllib``, ``hashlib``, ``tarfile``,
``zipfile``), so the package gains no new runtime dependencies.  ``file://``
URLs are fully supported, which keeps the entire download path testable without
a network connection.

**Archive contract.**  An archive is extracted *into* the scene's directory
(``<scenes_dir>/<scene_id>/``); its members are treated as paths relative to
that directory.  This matches the manifest's ``formats`` paths, which already
carry the ``<scene_id>/`` prefix relative to ``scenes_dir``.

**Source resolution.**  A scene is downloaded from, in order of precedence:

1. its manifest ``archive_url`` (a fully-qualified ``http(s)://`` / ``file://`` URL), or
2. a configured base URL joined with the scene's ``archive`` filename
   (defaulting to ``<scene_id>.tar.gz``).  The base URL comes from the
   ``base_url`` argument or the ``RENDERSCOPE_SCENE_BASE_URL`` environment
   variable.

If neither source is available, :class:`SceneSourceUnavailableError` is raised
so callers can report it accurately rather than silently succeeding.
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
    from renderscope.core.scene import SceneInfo, SceneManager

logger = logging.getLogger(__name__)

# Environment variable supplying the base URL for scene archives when a scene
# declares a relative ``archive`` rather than a fully-qualified ``archive_url``.
BASE_URL_ENV = "RENDERSCOPE_SCENE_BASE_URL"

_DEFAULT_CHUNK_SIZE = 1 << 16  # 64 KiB
_DEFAULT_TIMEOUT_S = 30.0

# Progress callback invoked as ``progress(bytes_downloaded, total_bytes_or_None)``.
ProgressCallback = Callable[[int, "int | None"], None]


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class SceneDownloadError(Exception):
    """Base class for all scene-download failures."""


class SceneSourceUnavailableError(SceneDownloadError):
    """Raised when no download source is configured for a scene."""

    def __init__(self, scene_id: str) -> None:
        self.scene_id = scene_id
        super().__init__(
            f"No download source is configured for scene '{scene_id}'.\n"
            f"Set the {BASE_URL_ENV} environment variable to a scene host, add an "
            f"'archive_url' to the manifest entry, or place the scene files manually."
        )


class DownloadFailedError(SceneDownloadError):
    """Raised when the archive could not be fetched from its source."""

    def __init__(self, scene_id: str, url: str, reason: str) -> None:
        self.scene_id = scene_id
        self.url = url
        self.reason = reason
        super().__init__(f"Failed to download scene '{scene_id}' from {url}: {reason}")


class ChecksumMismatchError(SceneDownloadError):
    """Raised when a downloaded archive's SHA-256 doesn't match the manifest."""

    def __init__(self, scene_id: str, expected: str, actual: str) -> None:
        self.scene_id = scene_id
        self.expected = expected
        self.actual = actual
        super().__init__(
            f"Checksum mismatch for scene '{scene_id}'.\n"
            f"  expected sha256: {expected}\n"
            f"  actual   sha256: {actual}\n"
            "The download may be corrupt or the manifest out of date; nothing was installed."
        )


class ArchiveExtractionError(SceneDownloadError):
    """Raised when an archive is unsupported, corrupt, or contains unsafe paths."""

    def __init__(self, scene_id: str, reason: str) -> None:
        self.scene_id = scene_id
        self.reason = reason
        super().__init__(f"Could not extract archive for scene '{scene_id}': {reason}")


# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DownloadResult:
    """Outcome of a successful scene download."""

    scene_id: str
    url: str
    archive_bytes: int
    verified: bool  # True only if a checksum was present in the manifest and matched.
    scene_dir: Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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

    def resolve_url(self, scene: SceneInfo) -> str | None:
        """Resolve the download URL for a scene, or ``None`` if none is configured."""
        if scene.archive_url:
            return scene.archive_url
        if not self._base_url:
            return None
        archive_name = scene.archive or f"{scene.id}.tar.gz"
        return f"{self._base_url.rstrip('/')}/{archive_name.lstrip('/')}"

    def download_scene(
        self,
        scene_id: str,
        *,
        progress: ProgressCallback | None = None,
    ) -> DownloadResult:
        """Download, verify, and install a single scene.

        Replaces any existing local copy of the scene atomically: the new files
        only take the scene's place after a successful download, checksum check
        (when a checksum is declared), and extraction.

        Raises:
            SceneNotFoundError: If ``scene_id`` is not in the manifest.
            SceneSourceUnavailableError: If no download source is configured.
            DownloadFailedError: If the archive cannot be fetched.
            ChecksumMismatchError: If the archive's SHA-256 doesn't match.
            ArchiveExtractionError: If the archive is unsupported/corrupt/unsafe.
        """
        scene = self._manager.get_scene(scene_id)
        url = self.resolve_url(scene)
        if not url:
            raise SceneSourceUnavailableError(scene_id)

        with tempfile.TemporaryDirectory(prefix="renderscope-dl-") as tmp:
            archive_path = Path(tmp) / self._archive_filename(url, scene_id)
            archive_bytes, digest = self._fetch(scene_id, url, archive_path, progress)

            verified = False
            if scene.sha256:
                if digest.lower() != scene.sha256.lower():
                    raise ChecksumMismatchError(scene_id, scene.sha256, digest)
                verified = True
                logger.debug("Verified sha256 for scene '%s'.", scene_id)

            scene_dir = self._install(scene, archive_path)

        # Files are in place; record completion so SceneManager.is_downloaded() is True.
        self._manager.mark_downloaded(scene_id)
        logger.info("Installed scene '%s' (%d bytes) into %s", scene_id, archive_bytes, scene_dir)
        return DownloadResult(
            scene_id=scene_id,
            url=url,
            archive_bytes=archive_bytes,
            verified=verified,
            scene_dir=scene_dir,
        )

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    @staticmethod
    def _archive_filename(url: str, scene_id: str) -> str:
        """Derive a local filename for the downloaded archive from its URL."""
        name = Path(urllib.parse.urlparse(url).path).name
        return name or f"{scene_id}.tar.gz"

    def _fetch(
        self,
        scene_id: str,
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
            raise DownloadFailedError(scene_id, url, str(exc.reason)) from exc
        except OSError as exc:
            raise DownloadFailedError(scene_id, url, str(exc)) from exc

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

    def _install(self, scene: SceneInfo, archive_path: Path) -> Path:
        """Extract ``archive_path`` into the scene's directory atomically."""
        scenes_dir = self._manager.scenes_dir
        scenes_dir.mkdir(parents=True, exist_ok=True)
        final_dir = scenes_dir / scene.id

        # Stage in a temp directory on the same filesystem so the final swap is atomic.
        staging = Path(tempfile.mkdtemp(prefix=f".{scene.id}-staging-", dir=scenes_dir))
        try:
            self._extract(archive_path, staging, scene.id, scene.filename)
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
        plain_filename: str | None = None,
    ) -> None:
        """Install a downloaded source into ``dest``.

        Archives are unpacked with path-traversal guards.  Sources published as
        a single loose file — the Stanford Bunny ships as a bare ``bunny.obj``,
        not an archive — are copied in under the scene's ``filename``.
        """
        dest.mkdir(parents=True, exist_ok=True)
        if tarfile.is_tarfile(archive_path):
            with tarfile.open(archive_path) as tar:
                self._extract_tar(tar, dest, scene_id)
        elif zipfile.is_zipfile(archive_path):
            with zipfile.ZipFile(archive_path) as zf:
                self._extract_zip(zf, dest, scene_id)
        elif plain_filename:
            target = (dest / plain_filename).resolve()
            if not _is_within(dest.resolve(), target):
                raise ArchiveExtractionError(
                    scene_id, f"unsafe filename in manifest: '{plain_filename}'"
                )
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(archive_path, target)
        else:
            raise ArchiveExtractionError(
                scene_id,
                f"'{archive_path.name}' is not a tar or zip archive. If this "
                "source is a single file, set 'filename' on the manifest entry "
                "to the name it should be saved as.",
            )

    @staticmethod
    def _extract_tar(tar: tarfile.TarFile, dest: Path, scene_id: str) -> None:
        base = dest.resolve()
        for member in tar.getmembers():
            target = (base / member.name).resolve()
            if not _is_within(base, target):
                raise ArchiveExtractionError(scene_id, f"unsafe path in archive: '{member.name}'")
            if member.issym() or member.islnk():
                link_target = (target.parent / member.linkname).resolve()
                if not _is_within(base, link_target):
                    raise ArchiveExtractionError(
                        scene_id, f"unsafe link in archive: '{member.name}' -> '{member.linkname}'"
                    )
        # Members validated above; use the hardened data filter where available.
        if sys.version_info >= (3, 12):
            tar.extractall(dest, filter="data")
        else:
            tar.extractall(dest)

    @staticmethod
    def _extract_zip(zf: zipfile.ZipFile, dest: Path, scene_id: str) -> None:
        base = dest.resolve()
        for name in zf.namelist():
            target = (base / name).resolve()
            if not _is_within(base, target):
                raise ArchiveExtractionError(scene_id, f"unsafe path in archive: '{name}'")
        zf.extractall(dest)
