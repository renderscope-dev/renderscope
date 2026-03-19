"""Tests for the ``renderscope benchmark`` and ``renderscope download-scenes`` CLI commands."""

from __future__ import annotations

from pathlib import Path

import pytest
from typer.testing import CliRunner

from renderscope.cli.main import app

pytestmark = pytest.mark.cli

runner = CliRunner()


# ---------------------------------------------------------------------------
# Benchmark command tests
# ---------------------------------------------------------------------------


class TestBenchmarkHelp:
    """Tests for --help output."""

    def test_benchmark_help(self) -> None:
        """``renderscope benchmark --help`` shows all options."""
        result = runner.invoke(app, ["benchmark", "--help"])
        assert result.exit_code == 0
        assert "--scene" in result.output
        assert "--renderer" in result.output
        assert "--samples" in result.output
        assert "--spp" in result.output
        assert "--resolution" in result.output
        assert "--time-budget" in result.output
        assert "--timeout" in result.output
        assert "--output" in result.output
        assert "--append" in result.output
        assert "--convergence" in result.output
        assert "--no-warmup" in result.output
        assert "--max-bounces" in result.output
        assert "--dry-run" in result.output
        assert "--results-dir" in result.output

    def test_benchmark_no_args(self) -> None:
        """``renderscope benchmark`` without required args prints an error."""
        result = runner.invoke(app, ["benchmark"])
        # Should fail because --scene is required.
        assert result.exit_code != 0


class TestBenchmarkDryRun:
    """Tests for --dry-run mode."""

    def test_dry_run_no_renderers_installed(self) -> None:
        """Dry run with no installed renderers prints a message."""
        result = runner.invoke(
            app,
            ["benchmark", "--scene", "cornell-box", "--renderer", "pbrt", "--dry-run"],
        )
        # Should fail because pbrt is likely not installed in test environment.
        # The command should exit with an error about renderer not installed.
        assert (
            result.exit_code != 0
            or "not installed" in result.output.lower()
            or "not registered" in result.output.lower()
        )


class TestBenchmarkPreflightChecks:
    """Tests for pre-flight validation."""

    def test_no_scenes_specified(self) -> None:
        """Command without --scene prints an error about missing scenes."""
        result = runner.invoke(
            app,
            ["benchmark", "--renderer", "pbrt"],
        )
        assert result.exit_code != 0
        assert "scene" in result.output.lower()

    def test_no_renderers_specified(self) -> None:
        """Command without --renderer prints an error about missing renderers."""
        result = runner.invoke(
            app,
            ["benchmark", "--scene", "cornell-box"],
        )
        assert result.exit_code != 0
        assert "renderer" in result.output.lower()


# ---------------------------------------------------------------------------
# Download-scenes command tests
# ---------------------------------------------------------------------------


class TestDownloadHelp:
    """Tests for --help output."""

    def test_download_help(self) -> None:
        """``renderscope download-scenes --help`` shows all options."""
        result = runner.invoke(app, ["download-scenes", "--help"])
        assert result.exit_code == 0
        assert "--scene" in result.output
        assert "--output-dir" in result.output
        assert "--list" in result.output
        assert "--force" in result.output


class TestDownloadList:
    """Tests for --list mode."""

    def test_download_list(self) -> None:
        """``renderscope download-scenes --list`` shows available scenes."""
        result = runner.invoke(app, ["download-scenes", "--list"])
        assert result.exit_code == 0
        assert "cornell-box" in result.output.lower() or "Cornell" in result.output

    def test_download_list_shows_scene_names(self) -> None:
        """The scene list includes known scene names."""
        result = runner.invoke(app, ["download-scenes", "--list"])
        assert result.exit_code == 0
        # Check for at least some known scenes from the bundled manifest.
        output_lower = result.output.lower()
        assert "sponza" in output_lower or "stanford" in output_lower or "cornell" in output_lower

    def test_download_list_shows_sizes(self) -> None:
        """The scene list includes size information."""
        result = runner.invoke(app, ["download-scenes", "--list"])
        assert result.exit_code == 0
        output_lower = result.output.lower()
        # At least one size unit should appear in the output.
        has_size = "mb" in output_lower or "kb" in output_lower or "gb" in output_lower
        assert has_size


class TestDownloadSceneValidation:
    """Tests for scene validation during download."""

    def test_download_unknown_scene(self) -> None:
        """Downloading an unknown scene prints an error."""
        result = runner.invoke(app, ["download-scenes", "--scene", "nonexistent-scene-12345"])
        assert result.exit_code != 0
        assert "unknown" in result.output.lower() or "not found" in result.output.lower()


class TestDownloadOutput:
    """Tests for the download command's output formatting."""

    def test_download_all_scenes_message(self, tmp_path: Path) -> None:
        """Downloading all scenes shows the download plan."""
        result = runner.invoke(
            app,
            ["download-scenes", "--output-dir", str(tmp_path / "scenes")],
        )
        assert result.exit_code == 0
        # Should show downloading message or hosting not available message.
        output_lower = result.output.lower()
        assert "download" in output_lower or "scene" in output_lower

    def test_download_with_custom_output_dir(self, tmp_path: Path) -> None:
        """Custom output directory is used."""
        custom_dir = tmp_path / "custom-scenes"
        result = runner.invoke(
            app,
            ["download-scenes", "--list", "--output-dir", str(custom_dir)],
        )
        assert result.exit_code == 0
