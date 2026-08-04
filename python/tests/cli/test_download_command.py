"""Tests for the ``renderscope download-scenes`` CLI command.

End-to-end downloads are exercised offline by hosting test archives on the
local filesystem and pointing ``--base-url`` at a ``file://`` directory URI.
"""

from __future__ import annotations

import hashlib
import io
import re
import tarfile
from pathlib import Path

import pytest
from typer.testing import CliRunner

from renderscope.cli.main import app
from renderscope.core.scene import SceneManager, SceneManifest

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def _flatten(output: str) -> str:
    """Strip styling and collapse wrapping so phrase assertions are stable."""
    return re.sub(r"\s+", " ", _ANSI_RE.sub("", output))


pytestmark = pytest.mark.cli

runner = CliRunner()

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def _strip_ansi(text: str) -> str:
    return _ANSI_RE.sub("", text)


def _scene(scene_id: str = "test-scene", **overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "id": scene_id,
        "name": "Test Scene",
        "description": "A scene for CLI download tests.",
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


def _install_manifest(monkeypatch: pytest.MonkeyPatch, scenes: list[dict[str, object]]) -> None:
    manifest = {"version": "1.0", "scenes": scenes}

    @staticmethod  # type: ignore[misc]
    def _load() -> SceneManifest:
        return SceneManifest.model_validate(manifest)

    monkeypatch.setattr(SceneManager, "_load_manifest", _load)


def _host_archive(host_dir: Path, scene_id: str, files: dict[str, bytes]) -> Path:
    """Write ``<host_dir>/<scene_id>.tar.gz`` and return its path."""
    host_dir.mkdir(parents=True, exist_ok=True)
    archive = host_dir / f"{scene_id}.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        for name, data in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return archive


# ---------------------------------------------------------------------------
# Listing
# ---------------------------------------------------------------------------


class TestListScenes:
    def test_list_shows_scenes_and_status(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _install_manifest(monkeypatch, [_scene("cornell-box"), _scene("sponza")])
        # Point at an empty temp dir so download status is deterministic.
        result = runner.invoke(
            app, ["download-scenes", "--list", "--output-dir", str(tmp_path / "scenes")]
        )
        assert result.exit_code == 0
        out = _strip_ansi(result.output)
        assert "cornell-box" in out
        assert "sponza" in out
        assert "2 scenes" in out
        assert "0 downloaded" in out


# ---------------------------------------------------------------------------
# Downloading
# ---------------------------------------------------------------------------


class TestDownload:
    def test_download_single_scene_from_base_url(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        _host_archive(host, "test-scene", {"model.obj": b"OBJ"})
        _install_manifest(monkeypatch, [_scene("test-scene")])
        scenes_dir = tmp_path / "scenes"

        result = runner.invoke(
            app,
            [
                "download-scenes",
                "--scene",
                "test-scene",
                "--output-dir",
                str(scenes_dir),
                "--base-url",
                host.as_uri(),
            ],
        )

        assert result.exit_code == 0, result.output
        assert "downloaded successfully" in _strip_ansi(result.output)
        assert (scenes_dir / "test-scene" / "model.obj").read_bytes() == b"OBJ"
        assert (scenes_dir / "test-scene" / ".renderscope-complete").is_file()

    def test_download_verifies_checksum(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        archive = _host_archive(host, "test-scene", {"model.obj": b"OBJ"})
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        _install_manifest(monkeypatch, [_scene("test-scene", sha256=digest)])
        scenes_dir = tmp_path / "scenes"

        result = runner.invoke(
            app,
            [
                "download-scenes",
                "-s",
                "test-scene",
                "-o",
                str(scenes_dir),
                "--base-url",
                host.as_uri(),
            ],
        )
        assert result.exit_code == 0, result.output
        assert (scenes_dir / "test-scene" / "model.obj").exists()

    def test_checksum_mismatch_fails_with_nonzero_exit(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        _host_archive(host, "test-scene", {"model.obj": b"OBJ"})
        _install_manifest(monkeypatch, [_scene("test-scene", sha256="0" * 64)])
        scenes_dir = tmp_path / "scenes"

        result = runner.invoke(
            app,
            [
                "download-scenes",
                "-s",
                "test-scene",
                "-o",
                str(scenes_dir),
                "--base-url",
                host.as_uri(),
            ],
        )
        assert result.exit_code == 1
        assert not (scenes_dir / "test-scene").exists()

    def test_no_source_reports_guidance_and_succeeds(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _install_manifest(monkeypatch, [_scene("test-scene")])
        scenes_dir = tmp_path / "scenes"

        # No --base-url and no archive_url -> no source configured.
        result = runner.invoke(
            app,
            ["download-scenes", "-s", "test-scene", "-o", str(scenes_dir)],
        )
        assert result.exit_code == 0, result.output
        out = _strip_ansi(result.output)
        assert "no download source" in out.lower()
        assert "example.com/scene" in out  # original source_url surfaced
        assert not (scenes_dir / "test-scene" / ".renderscope-complete").exists()

    def test_unknown_scene_errors(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_manifest(monkeypatch, [_scene("test-scene")])
        result = runner.invoke(app, ["download-scenes", "--scene", "nonexistent"])
        assert result.exit_code == 1

    def test_already_downloaded_is_skipped(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        _host_archive(host, "test-scene", {"model.obj": b"OBJ"})
        _install_manifest(monkeypatch, [_scene("test-scene")])
        scenes_dir = tmp_path / "scenes"

        # Pre-mark the scene as downloaded.
        SceneManager(scenes_dir=scenes_dir).mark_downloaded("test-scene")

        result = runner.invoke(
            app,
            [
                "download-scenes",
                "-s",
                "test-scene",
                "-o",
                str(scenes_dir),
                "--base-url",
                host.as_uri(),
            ],
        )
        assert result.exit_code == 0
        assert "already downloaded" in _strip_ansi(result.output).lower()

    def test_force_redownloads_existing_scene(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        _host_archive(host, "test-scene", {"model.obj": b"FRESH"})
        _install_manifest(monkeypatch, [_scene("test-scene")])
        scenes_dir = tmp_path / "scenes"
        SceneManager(scenes_dir=scenes_dir).mark_downloaded("test-scene")

        result = runner.invoke(
            app,
            [
                "download-scenes",
                "-s",
                "test-scene",
                "-o",
                str(scenes_dir),
                "--base-url",
                host.as_uri(),
                "--force",
            ],
        )
        assert result.exit_code == 0, result.output
        assert (scenes_dir / "test-scene" / "model.obj").read_bytes() == b"FRESH"


class TestBenchmarkScenesDir:
    """`download-scenes --output-dir` and `benchmark` must agree on a location.

    `benchmark` previously constructed a bare SceneManager, so it only ever
    looked in ~/.renderscope/scenes/. Downloading anywhere else produced scenes
    the benchmark runner reported as missing.
    """

    def test_option_is_documented(self, cli_runner: CliRunner) -> None:
        result = cli_runner.invoke(app, ["benchmark", "--help"])
        assert result.exit_code == 0
        assert "--scenes-dir" in _flatten(result.output)

    def test_benchmark_reads_scenes_from_the_given_directory(
        self, cli_runner: CliRunner, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        scenes_dir = tmp_path / "elsewhere"
        scene_dir = scenes_dir / "cornell-box"
        scene_dir.mkdir(parents=True)
        (scene_dir / "CornellBox-Original.obj").write_text("v 0 0 0\n", encoding="utf-8")
        (scene_dir / ".renderscope-complete").write_text("done", encoding="utf-8")

        result = cli_runner.invoke(
            app,
            [
                "benchmark",
                "--scene",
                "cornell-box",
                "--renderer",
                "mock",
                "--dry-run",
                "--scenes-dir",
                str(scenes_dir),
            ],
        )

        assert result.exit_code == 0, result.output
        flat = _flatten(result.output)
        assert "cornell-box" in flat
        assert "not downloaded" not in flat.lower()
