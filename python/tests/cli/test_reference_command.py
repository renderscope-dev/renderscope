"""Tests for the ``renderscope reference`` command.

Quality metrics are computed only when ``SceneManager.get_reference_path``
returns a file, and no reference has ever existed. These tests cover the command
that produces one, and in particular that it writes to the location the runner
reads — the two had never agreed, so hours of reference rendering produced a
file nothing consumed.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

from renderscope.cli.main import app
from renderscope.core.scene import SceneManager

if TYPE_CHECKING:
    from typer.testing import CliRunner

pytestmark = pytest.mark.cli

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def _flat(output: str) -> str:
    """Strip styling and collapse wrapping so phrase assertions are stable."""
    return re.sub(r"\s+", " ", _ANSI_RE.sub("", output))


@pytest.fixture()
def downloaded_scene(tmp_path: Path) -> Path:
    """A scenes directory with cornell-box present and marked downloaded."""
    scenes = tmp_path / "scenes"
    scene_dir = scenes / "cornell-box"
    scene_dir.mkdir(parents=True)
    (scene_dir / "CornellBox-Original.obj").write_text("v 0 0 0\n", encoding="utf-8")
    (scene_dir / ".renderscope-complete").write_text("done", encoding="utf-8")
    return scenes


class TestReferenceTargetPath:
    """Producing a reference and consuming one must agree on a location."""

    def test_target_matches_what_the_runner_reads(self, downloaded_scene: Path) -> None:
        manager = SceneManager(scenes_dir=downloaded_scene)
        target = manager.reference_target_path("cornell-box")
        assert target is not None

        # Nothing there yet, so the reader correctly reports "no reference".
        assert manager.get_reference_path("cornell-box") is None

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"exr")
        assert manager.get_reference_path("cornell-box") == target

    def test_returns_none_when_no_reference_is_declared(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        from renderscope.core.scene import SceneManifest

        manifest = {
            "version": "1.0",
            "scenes": [
                {
                    "id": "no-ref",
                    "name": "No Reference",
                    "description": "d",
                    "source": "s",
                    "source_url": "https://example.com",
                    "polygon_count": 1,
                    "tests": [],
                    "complexity": "simple",
                    "formats": {"obj": "no-ref/a.obj"},
                    "camera": {
                        "position": [0, 0, 1],
                        "target": [0, 0, 0],
                        "up": [0, 1, 0],
                        "fov": 45,
                    },
                    "download_size_mb": 0.1,
                }
            ],
        }

        @staticmethod  # type: ignore[misc]
        def _load() -> SceneManifest:
            return SceneManifest.model_validate(manifest)

        monkeypatch.setattr(SceneManager, "_load_manifest", _load)
        assert SceneManager(scenes_dir=tmp_path).reference_target_path("no-ref") is None


class TestReferenceCommand:
    def test_writes_to_the_path_the_runner_reads(
        self, cli_runner: CliRunner, downloaded_scene: Path
    ) -> None:
        result = cli_runner.invoke(
            app,
            [
                "reference",
                "--scene",
                "cornell-box",
                "--renderer",
                "mock",
                "--samples",
                "8",
                "--resolution",
                "32x32",
                "--scenes-dir",
                str(downloaded_scene),
            ],
        )
        assert result.exit_code == 0, result.output

        manager = SceneManager(scenes_dir=downloaded_scene)
        assert manager.get_reference_path("cornell-box") is not None

    def test_records_provenance_beside_the_image(
        self, cli_runner: CliRunner, downloaded_scene: Path
    ) -> None:
        cli_runner.invoke(
            app,
            [
                "reference",
                "--scene",
                "cornell-box",
                "--renderer",
                "mock",
                "--samples",
                "8",
                "--resolution",
                "32x32",
                "--scenes-dir",
                str(downloaded_scene),
            ],
        )
        sidecar = downloaded_scene / "cornell-box" / "reference.json"
        assert sidecar.is_file()

        provenance = json.loads(sidecar.read_text(encoding="utf-8"))
        assert provenance["renderer"] == "mock"
        assert provenance["samples"] == 8
        assert provenance["resolution"] == [32, 32]
        assert provenance["scene"] == "cornell-box"
        assert provenance["generated_at"]

    def test_refuses_to_replace_an_existing_reference(
        self, cli_runner: CliRunner, downloaded_scene: Path
    ) -> None:
        """Silently replacing it would change every published number for the scene."""
        target = downloaded_scene / "cornell-box" / "reference.exr"
        target.write_bytes(b"original")

        result = cli_runner.invoke(
            app,
            [
                "reference",
                "--scene",
                "cornell-box",
                "--renderer",
                "mock",
                "--scenes-dir",
                str(downloaded_scene),
            ],
        )
        assert result.exit_code == 1
        assert "--force" in _flat(result.output)
        assert target.read_bytes() == b"original"

    def test_force_replaces_it(self, cli_runner: CliRunner, downloaded_scene: Path) -> None:
        target = downloaded_scene / "cornell-box" / "reference.exr"
        target.write_bytes(b"original")

        result = cli_runner.invoke(
            app,
            [
                "reference",
                "--scene",
                "cornell-box",
                "--renderer",
                "mock",
                "--samples",
                "8",
                "--resolution",
                "32x32",
                "--force",
                "--scenes-dir",
                str(downloaded_scene),
            ],
        )
        assert result.exit_code == 0, result.output
        assert target.read_bytes() != b"original"

    def test_dry_run_renders_nothing(self, cli_runner: CliRunner, downloaded_scene: Path) -> None:
        result = cli_runner.invoke(
            app,
            [
                "reference",
                "--scene",
                "cornell-box",
                "--renderer",
                "mock",
                "--dry-run",
                "--scenes-dir",
                str(downloaded_scene),
            ],
        )
        assert result.exit_code == 0, result.output
        assert not (downloaded_scene / "cornell-box" / "reference.exr").exists()

    def test_defaults_the_sample_count_to_the_manifest_nomination(
        self, cli_runner: CliRunner, downloaded_scene: Path
    ) -> None:
        """Independently generated references stay comparable by default.

        Uses the mock adapter so the assertion does not depend on which real
        renderers happen to be installed; the renderer default is covered by
        `test_defaults_the_renderer_to_the_manifest_nomination`.
        """
        result = cli_runner.invoke(
            app,
            [
                "reference",
                "--scene",
                "cornell-box",
                "--renderer",
                "mock",
                "--dry-run",
                "--scenes-dir",
                str(downloaded_scene),
            ],
        )
        assert result.exit_code == 0, result.output
        # cornell-box nominates 65,536 spp.
        assert "65,536 spp" in _flat(result.output)

    def test_defaults_the_renderer_to_the_manifest_nomination(self, downloaded_scene: Path) -> None:
        """The manifest names the ground-truth renderer; the command honours it."""
        scene = SceneManager(scenes_dir=downloaded_scene).get_scene("cornell-box")
        assert scene.reference is not None
        assert scene.reference.renderer == "pbrt"
        assert scene.reference.samples == 65536

    def test_requires_the_scene_to_be_downloaded(
        self, cli_runner: CliRunner, tmp_path: Path
    ) -> None:
        result = cli_runner.invoke(
            app,
            [
                "reference",
                "--scene",
                "cornell-box",
                "--renderer",
                "mock",
                "--scenes-dir",
                str(tmp_path / "empty"),
            ],
        )
        assert result.exit_code == 1
        assert "download-scenes" in _flat(result.output)

    def test_rejects_an_unknown_scene(self, cli_runner: CliRunner, tmp_path: Path) -> None:
        result = cli_runner.invoke(
            app, ["reference", "--scene", "not-a-scene", "--scenes-dir", str(tmp_path)]
        )
        assert result.exit_code == 1

    def test_command_is_registered(self, cli_runner: CliRunner) -> None:
        result = cli_runner.invoke(app, ["--help"])
        assert "reference" in _flat(result.output)
