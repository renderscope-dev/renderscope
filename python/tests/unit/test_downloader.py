"""Unit tests for scene downloading (``renderscope.core.downloader``).

The full download -> verify -> extract -> install path is exercised offline using
``file://`` archive URLs, so these tests need no network access.
"""

from __future__ import annotations

import hashlib
import io
import re
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
    SceneFileMissingError,
    SceneSourceUnavailableError,
)
from renderscope.core.scene import FormatNotAvailableError, SceneManager, SceneManifest

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


def _scene(
    scene_id: str = "test-scene",
    *,
    formats: dict[str, dict[str, object]] | None = None,
    **overrides: object,
) -> dict[str, object]:
    """Build a minimal manifest scene dict, with optional field overrides."""
    base: dict[str, object] = {
        "id": scene_id,
        "name": "Test Scene",
        "description": "A scene for downloader tests.",
        "source": "Test Suite",
        "source_url": "https://example.com/scene",
        "polygon_count": 10,
        "tests": ["global_illumination"],
        "complexity": "trivial",
        "formats": formats if formats is not None else {"obj": {"path": "model.obj"}},
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


def _obj_archive(tmp_path: Path, name: str = "scene.tar.gz", body: bytes = b"OBJ-DATA") -> Path:
    """Write an archive containing the default scene's declared file."""
    archive = tmp_path / name
    _make_targz(archive, {"model.obj": body})
    return archive


# ---------------------------------------------------------------------------
# URL resolution
# ---------------------------------------------------------------------------


class TestResolveUrl:
    def test_explicit_url_takes_precedence(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": "file:///explicit.tgz"}})],
        )
        dl = SceneDownloader(mgr, base_url="http://host/scenes")
        assert dl.resolve_url(mgr.get_scene("test-scene"), "obj") == "file:///explicit.tgz"

    def test_base_url_with_default_archive_name(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        dl = SceneDownloader(mgr, base_url="http://host/scenes/")
        assert dl.resolve_url(mgr.get_scene("test-scene"), "obj") == (
            "http://host/scenes/test-scene-obj.tar.gz"
        )

    def test_base_url_with_explicit_archive_name(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "archive": "custom.zip"}})],
        )
        dl = SceneDownloader(mgr, base_url="http://host")
        assert dl.resolve_url(mgr.get_scene("test-scene"), "obj") == "http://host/custom.zip"

    def test_no_source_returns_none(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        dl = SceneDownloader(mgr, base_url=None)
        assert dl.resolve_url(mgr.get_scene("test-scene"), "obj") is None

    def test_undeclared_format_raises(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        dl = SceneDownloader(mgr)
        with pytest.raises(FormatNotAvailableError, match="pbrt"):
            dl.resolve_url(mgr.get_scene("test-scene"), "pbrt")

    def test_base_url_from_environment(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv(ENV, "http://env-host/scenes")
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        dl = SceneDownloader(mgr)  # no explicit base_url
        assert dl.base_url == "http://env-host/scenes"
        assert dl.resolve_url(mgr.get_scene("test-scene"), "obj") == (
            "http://env-host/scenes/test-scene-obj.tar.gz"
        )

    def test_explicit_base_url_overrides_environment(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv(ENV, "http://env-host/scenes")
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        dl = SceneDownloader(mgr, base_url="http://arg-host")
        assert dl.base_url == "http://arg-host"

    def test_downloadable_formats_lists_only_fetchable_ones(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    formats={
                        "obj": {"path": "model.obj", "url": "file:///a.tgz"},
                        "pbrt": {"path": "scene.pbrt"},
                    }
                )
            ],
        )
        dl = SceneDownloader(mgr)
        assert dl.downloadable_formats(mgr.get_scene("test-scene")) == ["obj"]


# ---------------------------------------------------------------------------
# Successful download + extraction
# ---------------------------------------------------------------------------


class TestDownloadSuccess:
    def test_tar_archive_is_extracted_into_the_format_dir(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        _make_targz(archive, {"model.obj": b"OBJ-DATA", "sub/extra.txt": b"extra"})
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": archive.as_uri()}})],
        )
        dl = SceneDownloader(mgr)

        result = dl.download_format("test-scene", "obj")

        assert mgr.is_format_downloaded("test-scene", "obj") is True
        assert mgr.is_downloaded("test-scene") is True
        assert result.format_dir == mgr.scenes_dir / "test-scene" / "obj"
        assert result.archive_bytes > 0
        assert result.verified is False  # no checksum declared
        assert result.scene_path.read_bytes() == b"OBJ-DATA"
        assert (result.format_dir / "sub" / "extra.txt").read_bytes() == b"extra"
        # The extracted file is resolvable through the manager's public API.
        assert mgr.get_scene_path("test-scene", "obj") == result.scene_path

    def test_zip_archive_is_supported(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.zip"
        _make_zip(archive, {"model.obj": b"ZIP-OBJ"})
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": archive.as_uri()}})],
        )

        SceneDownloader(mgr).download_format("test-scene", "obj")

        assert mgr.get_scene_path("test-scene", "obj").read_bytes() == b"ZIP-OBJ"

    def test_progress_callback_reports_bytes(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = _obj_archive(tmp_path, body=b"X" * 4096)
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": archive.as_uri()}})],
        )

        calls: list[tuple[int, int | None]] = []
        result = SceneDownloader(mgr, chunk_size=512).download_format(
            "test-scene", "obj", progress=lambda done, total: calls.append((done, total))
        )

        assert calls, "progress callback was never invoked"
        done_values = [done for done, _ in calls]
        assert done_values == sorted(done_values)  # monotonic non-decreasing
        assert done_values[-1] == result.archive_bytes
        # file:// responses expose Content-Length, so total should be known and final.
        assert calls[-1][1] == result.archive_bytes


# ---------------------------------------------------------------------------
# Multiple formats
# ---------------------------------------------------------------------------


class TestMultipleFormats:
    """A scene's formats come from unrelated publishers and install separately."""

    @staticmethod
    def _two_format_manager(
        tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> tuple[SceneManager, Path, Path]:
        obj_archive = tmp_path / "obj.tar.gz"
        _make_targz(obj_archive, {"model.obj": b"OBJ"})
        pbrt_archive = tmp_path / "pbrt.zip"
        _make_zip(pbrt_archive, {"nested/scene.pbrt": b"PBRT"})
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    formats={
                        "obj": {"path": "model.obj", "url": obj_archive.as_uri()},
                        "pbrt": {"path": "nested/scene.pbrt", "url": pbrt_archive.as_uri()},
                    }
                )
            ],
        )
        return mgr, obj_archive, pbrt_archive

    def test_download_scene_installs_every_declared_format(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr, _, _ = self._two_format_manager(tmp_path, monkeypatch)

        result = SceneDownloader(mgr).download_scene("test-scene")

        assert [fmt.format for fmt in result.formats] == ["obj", "pbrt"]
        assert result.without_source == ()
        assert mgr.installed_formats("test-scene") == ["obj", "pbrt"]
        assert mgr.get_scene_path("test-scene", "obj").read_bytes() == b"OBJ"
        assert mgr.get_scene_path("test-scene", "pbrt").read_bytes() == b"PBRT"

    def test_formats_can_be_requested_individually(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr, _, _ = self._two_format_manager(tmp_path, monkeypatch)

        SceneDownloader(mgr).download_scene("test-scene", formats=["pbrt"])

        assert mgr.installed_formats("test-scene") == ["pbrt"]

    def test_re_downloading_one_format_leaves_the_other_intact(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The reason each format owns a directory: installs cannot collide."""
        mgr, obj_archive, _ = self._two_format_manager(tmp_path, monkeypatch)
        dl = SceneDownloader(mgr)
        dl.download_scene("test-scene")

        _make_targz(obj_archive, {"model.obj": b"OBJ-v2"})
        dl.download_format("test-scene", "obj")

        assert mgr.get_scene_path("test-scene", "obj").read_bytes() == b"OBJ-v2"
        assert mgr.get_scene_path("test-scene", "pbrt").read_bytes() == b"PBRT"

    def test_a_format_without_a_source_is_reported_not_raised(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """One unhostable format must not block the rest of a scene."""
        archive = _obj_archive(tmp_path)
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    formats={
                        "obj": {"path": "model.obj", "url": archive.as_uri()},
                        "pbrt": {"path": "scene.pbrt"},
                    }
                )
            ],
        )

        result = SceneDownloader(mgr).download_scene("test-scene")

        assert [fmt.format for fmt in result.formats] == ["obj"]
        assert result.without_source == ("pbrt",)
        assert mgr.installed_formats("test-scene") == ["obj"]

    def test_requesting_an_undeclared_format_raises(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr, _, _ = self._two_format_manager(tmp_path, monkeypatch)
        with pytest.raises(FormatNotAvailableError, match="usd"):
            SceneDownloader(mgr).download_scene("test-scene", formats=["usd"])

    def test_aggregate_result_sums_and_verifies(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        obj_archive = tmp_path / "obj.tar.gz"
        _make_targz(obj_archive, {"model.obj": b"OBJ"})
        pbrt_archive = tmp_path / "pbrt.tar.gz"
        _make_targz(pbrt_archive, {"scene.pbrt": b"PBRT"})
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    formats={
                        "obj": {
                            "path": "model.obj",
                            "url": obj_archive.as_uri(),
                            "sha256": _sha256(obj_archive),
                        },
                        "pbrt": {
                            "path": "scene.pbrt",
                            "url": pbrt_archive.as_uri(),
                            "sha256": _sha256(pbrt_archive),
                        },
                    }
                )
            ],
        )

        result = SceneDownloader(mgr).download_scene("test-scene")

        assert result.verified is True
        assert result.archive_bytes == sum(f.archive_bytes for f in result.formats)
        assert result.scene_dir == mgr.scenes_dir / "test-scene"

    def test_scene_progress_callback_names_each_format(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr, _, _ = self._two_format_manager(tmp_path, monkeypatch)
        seen: list[str] = []

        SceneDownloader(mgr).download_scene(
            "test-scene", progress=lambda fmt, done, total: seen.append(fmt)
        )

        assert set(seen) == {"obj", "pbrt"}


# ---------------------------------------------------------------------------
# Checksum verification
# ---------------------------------------------------------------------------


class TestChecksum:
    def test_matching_checksum_sets_verified(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = _obj_archive(tmp_path, body=b"DATA")
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    formats={
                        "obj": {
                            "path": "model.obj",
                            "url": archive.as_uri(),
                            "sha256": _sha256(archive),
                        }
                    }
                )
            ],
        )

        result = SceneDownloader(mgr).download_format("test-scene", "obj")

        assert result.verified is True
        assert mgr.is_format_downloaded("test-scene", "obj") is True

    def test_checksum_is_case_insensitive(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = _obj_archive(tmp_path, body=b"DATA")
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    formats={
                        "obj": {
                            "path": "model.obj",
                            "url": archive.as_uri(),
                            "sha256": _sha256(archive).upper(),
                        }
                    }
                )
            ],
        )

        assert SceneDownloader(mgr).download_format("test-scene", "obj").verified is True

    def test_mismatched_checksum_raises_and_installs_nothing(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = _obj_archive(tmp_path, body=b"DATA")
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    formats={
                        "obj": {"path": "model.obj", "url": archive.as_uri(), "sha256": "0" * 64}
                    }
                )
            ],
        )

        with pytest.raises(ChecksumMismatchError, match="obj"):
            SceneDownloader(mgr).download_format("test-scene", "obj")

        assert mgr.is_downloaded("test-scene") is False
        assert not (mgr.scenes_dir / "test-scene" / "obj").exists()


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


class TestErrors:
    def test_missing_source_raises(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        with pytest.raises(SceneSourceUnavailableError):
            SceneDownloader(mgr).download_format("test-scene", "obj")

    def test_scene_with_no_fetchable_format_raises(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        mgr = _manager(tmp_path, monkeypatch, [_scene()])
        with pytest.raises(SceneSourceUnavailableError, match="obj"):
            SceneDownloader(mgr).download_scene("test-scene")

    def test_unreachable_url_raises_download_failed(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        missing = (tmp_path / "does-not-exist.tar.gz").as_uri()
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": missing}})],
        )
        with pytest.raises(DownloadFailedError):
            SceneDownloader(mgr).download_format("test-scene", "obj")
        assert mgr.is_downloaded("test-scene") is False

    def test_corrupt_archive_raises_extraction_error(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        archive.write_bytes(b"this is not a real archive")
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": archive.as_uri()}})],
        )
        with pytest.raises(ArchiveExtractionError):
            SceneDownloader(mgr).download_format("test-scene", "obj")
        assert mgr.is_downloaded("test-scene") is False
        assert not (mgr.scenes_dir / "test-scene" / "obj").exists()

    def test_archive_without_the_declared_file_is_refused(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A checksum proves the bytes; it says nothing about the layout.

        Installing an archive whose contents moved would mark the format present
        while leaving nothing a renderer can open.
        """
        archive = tmp_path / "scene.tar.gz"
        _make_targz(archive, {"somewhere-else.obj": b"OBJ"})
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": archive.as_uri()}})],
        )

        with pytest.raises(SceneFileMissingError, match=re.escape("model.obj")):
            SceneDownloader(mgr).download_format("test-scene", "obj")

        assert mgr.is_format_downloaded("test-scene", "obj") is False
        assert not (mgr.scenes_dir / "test-scene" / "obj").exists()

    def test_path_traversal_member_is_blocked(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "evil.tar.gz"
        _make_unsafe_targz(archive)
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": archive.as_uri()}})],
        )

        with pytest.raises(ArchiveExtractionError):
            SceneDownloader(mgr).download_format("test-scene", "obj")

        # Nothing escaped the scenes directory, and nothing was installed.
        assert mgr.is_downloaded("test-scene") is False
        assert not (mgr.scenes_dir.parent / "escape.txt").exists()
        assert not (mgr.scenes_dir / "escape.txt").exists()
        assert not (mgr.scenes_dir / "test-scene" / "escape.txt").exists()

    def test_a_failed_format_leaves_an_installed_one_alone(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        good = tmp_path / "good.tar.gz"
        _make_targz(good, {"model.obj": b"OBJ"})
        bad = tmp_path / "bad.tar.gz"
        bad.write_bytes(b"not an archive")
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    formats={
                        "obj": {"path": "model.obj", "url": good.as_uri()},
                        "pbrt": {"path": "scene.pbrt", "url": bad.as_uri()},
                    }
                )
            ],
        )
        dl = SceneDownloader(mgr)

        with pytest.raises(ArchiveExtractionError):
            dl.download_scene("test-scene")

        assert mgr.installed_formats("test-scene") == ["obj"]


# ---------------------------------------------------------------------------
# Re-download / atomic replace
# ---------------------------------------------------------------------------


class TestReDownload:
    def test_redownload_replaces_stale_files(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        archive = tmp_path / "scene.tar.gz"
        _make_targz(archive, {"model.obj": b"v1", "stale.txt": b"old"})
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": archive.as_uri()}})],
        )
        dl = SceneDownloader(mgr)

        dl.download_format("test-scene", "obj")
        format_dir = mgr.format_dir("test-scene", "obj")
        assert (format_dir / "stale.txt").exists()

        # Re-publish the archive at the same URL without the stale file.
        _make_targz(archive, {"model.obj": b"v2"})
        dl.download_format("test-scene", "obj")

        assert (format_dir / "model.obj").read_bytes() == b"v2"
        assert not (format_dir / "stale.txt").exists()
        assert mgr.is_format_downloaded("test-scene", "obj") is True

    def test_staging_debris_is_not_mistaken_for_a_format(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Staging happens inside the scene directory; it must stay invisible."""
        archive = _obj_archive(tmp_path)
        mgr = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": archive.as_uri()}})],
        )
        SceneDownloader(mgr).download_format("test-scene", "obj")

        children = sorted(p.name for p in (mgr.scenes_dir / "test-scene").iterdir())
        assert children == ["obj"]


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
                    formats={
                        "obj": {
                            "path": "stanford-bunny.obj",
                            "filename": "stanford-bunny.obj",
                            "url": source.as_uri(),
                        }
                    }
                )
            ],
        )
        result = SceneDownloader(manager).download_format("test-scene", "obj")

        assert result.scene_path == result.format_dir / "stanford-bunny.obj"
        assert result.scene_path.read_text(encoding="utf-8").startswith("# OBJ file")
        assert manager.is_format_downloaded("test-scene", "obj")

    def test_rejects_a_bare_file_with_no_declared_name(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        source = tmp_path / "mystery.bin"
        source.write_bytes(b"not an archive")

        manager = _manager(
            tmp_path,
            monkeypatch,
            [_scene(formats={"obj": {"path": "model.obj", "url": source.as_uri()}})],
        )
        with pytest.raises(ArchiveExtractionError, match="not a tar or zip"):
            SceneDownloader(manager).download_format("test-scene", "obj")

    def test_refuses_a_filename_that_escapes_the_format_directory(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        source = tmp_path / "payload.obj"
        source.write_text("v 0 0 0\n", encoding="utf-8")

        manager = _manager(
            tmp_path,
            monkeypatch,
            [
                _scene(
                    formats={
                        "obj": {
                            "path": "model.obj",
                            "filename": "../escaped.obj",
                            "url": source.as_uri(),
                        }
                    }
                )
            ],
        )
        with pytest.raises(ArchiveExtractionError, match="unsafe filename"):
            SceneDownloader(manager).download_format("test-scene", "obj")
        assert not (tmp_path / "scenes" / "escaped.obj").exists()
        assert not (tmp_path / "scenes" / "test-scene" / "escaped.obj").exists()
