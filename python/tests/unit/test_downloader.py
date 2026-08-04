"""Unit tests for scene downloading (``renderscope.core.downloader``).

The full download → verify → extract → install path is exercised offline using
``file://`` archive URLs, so these tests need no network access.
"""

from __future__ import annotations

import hashlib
import io
import tarfile
import zipfile
from pathlib import Path

import pytest

from renderscope.core.downloader import (
    BASE_URL_ENV as ENV,
)
from renderscope.core.downloader import (
    ArchiveExtractionError,
    ChecksumMismatchError,
    DownloadFailedError,
    SceneDownloader,
    SceneSourceUnavailableError,
)
from renderscope.core.scene import SceneManager, SceneManifest

# ---------------------------------------------------------------------------
# Archive + manifest helpers
# ---------------------------------------------------------------------------


def _make_targz(path: Path, files: dict[str, bytes]) -> None:
    """Write a .tar.gz containing ``files`` (member name -> bytes)."""
    with tarfile.open(path, "w:gz") as tar:
        for name, data in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))


def _make_zip(path: Path, files: dict[str, bytes]) -> None:
    """Write a .zip containing ``files`` (member name -> bytes)."""
    with zipfile.ZipFile(path, "w") as zf:
        for name, data in files.items():
            zf.writestr(name, data)


def _make_unsafe_targz(path: Path) -> None:
    """Write a .tar.gz with a member that escapes the extraction root."""
    with tarfile.open(path, "w:gz") as tar:
        data = b"pwned"
        info = tarfile.TarInfo("../escape.txt")
        info.size = len(data)
        tar.addfile(info, io.BytesIO(data))


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _scene(scene_id: str = "test-scene", **overrides: object) -> dict[str, object]:
    """Build a minimal manifest scene dict, with optional field overrides."""
    base: dict[str, object] = {
        "id": scene_id,
        "name": "Test Scene",
        "description": "A scene for downloader tests.",
        "source": "Test Suite",
        "source_url": "https://example.com/scene",
        "polygon_count": 10,
        "tests": ["global_illumination"],
        "complexity": "simple",
        "formats": {"obj": f"{scene_id}/model.obj"},
        "camera": {"position": [0, 0, 5], "target": [0, 0, 0], "up": [0, 1, 0], "fov": 45},
        "download_size_mb": 1.0,
    }
    base.update(overrides)
    return base


def _manager(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    scenes: list[dict[str, object]],
) -> SceneManager:
    """Create a SceneManager whose manifest is the given list of scene dicts."""
    manifest = {"version": "1.0", "scenes": scenes}

    @staticmethod  # type: ignore[misc]
    def _load() -> SceneManifest:
        return SceneManifest.model_validate(manifest)

    monkeypatch.setattr(SceneManager, "_load_manifest", _load)
    scenes_dir = tmp_path / "scenes"
    scenes_dir.mkdir()
    return SceneManager(scenes_dir=scenes_dir)


# ---------------------------------------------------------------------------
# URL resolution
# ---------------------------------------------------------------------------


class TestResolveUrl:
    def test_archive_url_takes_precedence(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url="file:///explicit.tgz")])
        dl = SceneDownloader(mgr, base_url="http://host/scenes")
        assert dl.resolve_url(mgr.get_scene("test-scene")) == "file:///explicit.tgz"

    def test_base_url_with_default_archive_name(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        dl = SceneDownloader(mgr, base_url="http://host/scenes/")
        assert dl.resolve_url(mgr.get_scene("test-scene")) == "http://host/scenes/test-scene.tar.gz"

    def test_base_url_with_explicit_archive_name(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive="custom.zip")])
        dl = SceneDownloader(mgr, base_url="http://host")
        assert dl.resolve_url(mgr.get_scene("test-scene")) == "http://host/custom.zip"

    def test_no_source_returns_none(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        dl = SceneDownloader(mgr, base_url=None)
        assert dl.resolve_url(mgr.get_scene("test-scene")) is None

    def test_base_url_from_environment(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv(ENV, "http://env-host/scenes")
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        dl = SceneDownloader(mgr)  # no explicit base_url
        assert dl.base_url == "http://env-host/scenes"
        assert dl.resolve_url(mgr.get_scene("test-scene")) == (
            "http://env-host/scenes/test-scene.tar.gz"
        )

    def test_explicit_base_url_overrides_environment(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv(ENV, "http://env-host/scenes")
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        dl = SceneDownloader(mgr, base_url="http://arg-host")
        assert dl.base_url == "http://arg-host"


# ---------------------------------------------------------------------------
# Successful download + extraction
# ---------------------------------------------------------------------------


class TestDownloadSuccess:
    def test_tar_archive_is_extracted_into_scene_dir(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        _make_targz(archive, {"model.obj": b"OBJ-DATA", "sub/extra.txt": b"extra"})
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=archive.as_uri())])
        dl = SceneDownloader(mgr)

        result = dl.download_scene("test-scene")

        assert mgr.is_downloaded("test-scene") is True
        assert result.scene_dir == mgr.scenes_dir / "test-scene"
        assert result.archive_bytes > 0
        assert result.verified is False  # no checksum declared
        assert (mgr.scenes_dir / "test-scene" / "model.obj").read_bytes() == b"OBJ-DATA"
        assert (mgr.scenes_dir / "test-scene" / "sub" / "extra.txt").read_bytes() == b"extra"
        # The extracted file is resolvable through the manager's public API.
        assert mgr.get_scene_path("test-scene", "obj") == (
            mgr.scenes_dir / "test-scene" / "model.obj"
        )

    def test_zip_archive_is_supported(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.zip"
        _make_zip(archive, {"model.obj": b"ZIP-OBJ"})
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=archive.as_uri())])

        SceneDownloader(mgr).download_scene("test-scene")

        assert mgr.is_downloaded("test-scene") is True
        assert (mgr.scenes_dir / "test-scene" / "model.obj").read_bytes() == b"ZIP-OBJ"

    def test_progress_callback_reports_bytes(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        _make_targz(archive, {"model.obj": b"X" * 4096})
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=archive.as_uri())])

        calls: list[tuple[int, int | None]] = []
        result = dl_result = SceneDownloader(mgr, chunk_size=512).download_scene(
            "test-scene", progress=lambda done, total: calls.append((done, total))
        )

        assert calls, "progress callback was never invoked"
        done_values = [done for done, _ in calls]
        assert done_values == sorted(done_values)  # monotonic non-decreasing
        assert done_values[-1] == result.archive_bytes
        # file:// responses expose Content-Length, so total should be known and final.
        assert calls[-1][1] == dl_result.archive_bytes


# ---------------------------------------------------------------------------
# Checksum verification
# ---------------------------------------------------------------------------


class TestChecksum:
    def test_matching_checksum_sets_verified(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        _make_targz(archive, {"model.obj": b"DATA"})
        digest = _sha256(archive)
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=archive.as_uri(), sha256=digest)])

        result = SceneDownloader(mgr).download_scene("test-scene")

        assert result.verified is True
        assert mgr.is_downloaded("test-scene") is True

    def test_checksum_is_case_insensitive(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        _make_targz(archive, {"model.obj": b"DATA"})
        digest = _sha256(archive).upper()
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=archive.as_uri(), sha256=digest)])

        assert SceneDownloader(mgr).download_scene("test-scene").verified is True

    def test_mismatched_checksum_raises_and_installs_nothing(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        _make_targz(archive, {"model.obj": b"DATA"})
        wrong = "0" * 64
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=archive.as_uri(), sha256=wrong)])

        with pytest.raises(ChecksumMismatchError):
            SceneDownloader(mgr).download_scene("test-scene")

        assert mgr.is_downloaded("test-scene") is False
        assert not (mgr.scenes_dir / "test-scene").exists()


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


class TestErrors:
    def test_missing_source_raises(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        with pytest.raises(SceneSourceUnavailableError):
            SceneDownloader(mgr).download_scene("test-scene")

    def test_unreachable_url_raises_download_failed(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        missing = (tmp_path / "does-not-exist.tar.gz").as_uri()
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=missing)])
        with pytest.raises(DownloadFailedError):
            SceneDownloader(mgr).download_scene("test-scene")
        assert mgr.is_downloaded("test-scene") is False

    def test_corrupt_archive_raises_extraction_error(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        archive.write_bytes(b"this is not a real archive")
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=archive.as_uri())])
        with pytest.raises(ArchiveExtractionError):
            SceneDownloader(mgr).download_scene("test-scene")
        assert mgr.is_downloaded("test-scene") is False
        assert not (mgr.scenes_dir / "test-scene").exists()

    def test_path_traversal_member_is_blocked(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "evil.tar.gz"
        _make_unsafe_targz(archive)
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=archive.as_uri())])

        with pytest.raises(ArchiveExtractionError):
            SceneDownloader(mgr).download_scene("test-scene")

        # Nothing escaped the scenes directory, and nothing was installed.
        assert mgr.is_downloaded("test-scene") is False
        assert not (mgr.scenes_dir.parent / "escape.txt").exists()
        assert not (mgr.scenes_dir / "escape.txt").exists()


# ---------------------------------------------------------------------------
# Re-download / atomic replace
# ---------------------------------------------------------------------------


class TestReDownload:
    def test_redownload_replaces_stale_files(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        _make_targz(archive, {"model.obj": b"v1", "stale.txt": b"old"})
        mgr = _manager(tmp_path, monkeypatch, [_scene(archive_url=archive.as_uri())])
        dl = SceneDownloader(mgr)

        dl.download_scene("test-scene")
        assert (mgr.scenes_dir / "test-scene" / "stale.txt").exists()

        # Re-publish the archive at the same URL without the stale file.
        _make_targz(archive, {"model.obj": b"v2"})
        dl.download_scene("test-scene")

        assert (mgr.scenes_dir / "test-scene" / "model.obj").read_bytes() == b"v2"
        assert not (mgr.scenes_dir / "test-scene" / "stale.txt").exists()
        assert mgr.is_downloaded("test-scene") is True


class TestPlainFileSources:
    """Not every scene is published as an archive.

    The Stanford Bunny ships as a bare ``bunny.obj``. Before ``filename``
    existed the downloader rejected it as an unsupported archive, so the scene
    could not be acquired at all.
    """

    def test_installs_a_bare_file_under_the_manifest_name(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        source = tmp_path / "bunny.obj"
        source.write_text("# OBJ file\nv 0 0 0\n", encoding="utf-8")

        manager = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    archive_url=source.as_uri(),
                    filename="stanford-bunny.obj",
                    formats={"obj": "test-scene/stanford-bunny.obj"},
                )
            ],
        )
        result = SceneDownloader(manager).download_scene("test-scene")

        installed = result.scene_dir / "stanford-bunny.obj"
        assert installed.is_file()
        assert installed.read_text(encoding="utf-8").startswith("# OBJ file")
        assert manager.is_downloaded("test-scene")

    def test_rejects_a_bare_file_with_no_declared_name(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        source = tmp_path / "mystery.bin"
        source.write_bytes(b"not an archive")

        manager = _manager(tmp_path, monkeypatch, [_scene(archive_url=source.as_uri())])
        with pytest.raises(ArchiveExtractionError, match="not a tar or zip"):
            SceneDownloader(manager).download_scene("test-scene")

    def test_refuses_a_filename_that_escapes_the_scene_directory(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        source = tmp_path / "payload.obj"
        source.write_text("v 0 0 0\n", encoding="utf-8")

        manager = _manager(
            tmp_path,
            monkeypatch,
            [_scene(archive_url=source.as_uri(), filename="../escaped.obj")],
        )
        with pytest.raises(ArchiveExtractionError, match="unsafe filename"):
            SceneDownloader(manager).download_scene("test-scene")
        assert not (tmp_path / "scenes" / "escaped.obj").exists()
