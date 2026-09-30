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


def _scene(
    scene_id: str = "test-scene",
    *,
    formats: dict[str, dict[str, object]] | None = None,
    **overrides: object,
) -> dict[str, object]:
    base: dict[str, object] = {
        "id": scene_id,
        "name": "Test Scene",
        "description": "A scene for CLI download tests.",
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


def _install_manifest(monkeypatch: pytest.MonkeyPatch, scenes: list[dict[str, object]]) -> None:
    manifest = {"version": "1.0", "scenes": scenes}

    @staticmethod  # type: ignore[misc]
    def _load() -> SceneManifest:
        return SceneManifest.model_validate(manifest)

    monkeypatch.setattr(SceneManager, "_load_manifest", _load)


def _host_archive(host_dir: Path, scene_id: str, files: dict[str, bytes], fmt: str = "obj") -> Path:
    """Write the archive a base URL serves for one format, and return its path."""
    host_dir.mkdir(parents=True, exist_ok=True)
    archive = host_dir / f"{scene_id}-{fmt}.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        for name, data in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return archive


def _preinstall(
    scenes_dir: Path, scene_id: str, fmt: str, path: str, body: bytes = b"CACHED"
) -> Path:
    """Put a format on disk the way a completed download leaves it."""
    target = scenes_dir / scene_id / fmt / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(body)
    (scenes_dir / scene_id / fmt / ".renderscope-complete").write_text("done", encoding="utf-8")
    return target


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
        assert "0 complete" in out
        assert "2 not downloaded" in out


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
        assert (scenes_dir / "test-scene" / "obj" / "model.obj").read_bytes() == b"OBJ"
        assert (scenes_dir / "test-scene" / "obj" / ".renderscope-complete").is_file()

    def test_download_verifies_checksum(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        archive = _host_archive(host, "test-scene", {"model.obj": b"OBJ"})
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        _install_manifest(
            monkeypatch,
            [_scene("test-scene", formats={"obj": {"path": "model.obj", "sha256": digest}})],
        )
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
        assert (scenes_dir / "test-scene" / "obj" / "model.obj").exists()

    def test_checksum_mismatch_fails_with_nonzero_exit(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        _host_archive(host, "test-scene", {"model.obj": b"OBJ"})
        _install_manifest(
            monkeypatch,
            [_scene("test-scene", formats={"obj": {"path": "model.obj", "sha256": "0" * 64}})],
        )
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
        assert not (scenes_dir / "test-scene" / "obj").exists()

    def test_no_source_reports_guidance_and_succeeds(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _install_manifest(monkeypatch, [_scene("test-scene")])
        scenes_dir = tmp_path / "scenes"

        # No --base-url and no per-format url -> no source configured.
        result = runner.invoke(
            app,
            ["download-scenes", "-s", "test-scene", "-o", str(scenes_dir)],
        )
        assert result.exit_code == 0, result.output
        out = _strip_ansi(result.output)
        assert "no download source" in out.lower()
        assert "example.com/scene" in out  # original source_url surfaced
        assert not (scenes_dir / "test-scene" / "obj" / ".renderscope-complete").exists()

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
        _preinstall(scenes_dir, "test-scene", "obj", "model.obj", b"CACHED")

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
        assert (scenes_dir / "test-scene" / "obj" / "model.obj").read_bytes() == b"CACHED"

    def test_force_redownloads_existing_scene(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        _host_archive(host, "test-scene", {"model.obj": b"FRESH"})
        _install_manifest(monkeypatch, [_scene("test-scene")])
        scenes_dir = tmp_path / "scenes"
        _preinstall(scenes_dir, "test-scene", "obj", "model.obj", b"STALE")

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
        assert (scenes_dir / "test-scene" / "obj" / "model.obj").read_bytes() == b"FRESH"


class TestFormatSelection:
    """Formats are fetched independently, so they can be asked for independently.

    San Miguel's OBJ is half a gigabyte; a user who only needs the Cornell Box's
    PBRT description should not have to take everything a scene offers.
    """

    @staticmethod
    def _two_format_scene() -> dict[str, object]:
        return _scene(
            "test-scene",
            formats={"obj": {"path": "model.obj"}, "pbrt": {"path": "scene.pbrt"}},
        )

    def test_only_the_requested_format_is_fetched(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        _host_archive(host, "test-scene", {"model.obj": b"OBJ"}, fmt="obj")
        _host_archive(host, "test-scene", {"scene.pbrt": b"PBRT"}, fmt="pbrt")
        _install_manifest(monkeypatch, [self._two_format_scene()])
        scenes_dir = tmp_path / "scenes"

        result = runner.invoke(
            app,
            [
                "download-scenes",
                "-s",
                "test-scene",
                "-f",
                "pbrt",
                "-o",
                str(scenes_dir),
                "--base-url",
                host.as_uri(),
            ],
        )

        assert result.exit_code == 0, result.output
        assert (scenes_dir / "test-scene" / "pbrt" / "scene.pbrt").read_bytes() == b"PBRT"
        assert not (scenes_dir / "test-scene" / "obj").exists()

    def test_every_format_is_fetched_by_default(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        host = tmp_path / "host"
        _host_archive(host, "test-scene", {"model.obj": b"OBJ"}, fmt="obj")
        _host_archive(host, "test-scene", {"scene.pbrt": b"PBRT"}, fmt="pbrt")
        _install_manifest(monkeypatch, [self._two_format_scene()])
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
        assert (scenes_dir / "test-scene" / "obj" / "model.obj").exists()
        assert (scenes_dir / "test-scene" / "pbrt" / "scene.pbrt").exists()

    def test_unknown_format_errors_with_the_available_ones(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _install_manifest(monkeypatch, [self._two_format_scene()])

        result = runner.invoke(
            app,
            [
                "download-scenes",
                "-s",
                "test-scene",
                "-f",
                "usd",
                "-o",
                str(tmp_path / "scenes"),
            ],
        )

        assert result.exit_code == 1
        out = _strip_ansi(result.output)
        assert "usd" in out
        assert "obj" in out and "pbrt" in out

    def test_list_marks_each_format_separately(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _install_manifest(monkeypatch, [self._two_format_scene()])
        scenes_dir = tmp_path / "scenes"
        _preinstall(scenes_dir, "test-scene", "obj", "model.obj", b"OBJ")

        result = runner.invoke(app, ["download-scenes", "--list", "--output-dir", str(scenes_dir)])

        assert result.exit_code == 0
        out = _flatten(result.output)
        assert "1 partial" in out
        assert "obj" in out and "pbrt" in out


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
        _preinstall(scenes_dir, "cornell-box", "obj", "CornellBox-Original.obj", b"v 0 0 0\n")

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
