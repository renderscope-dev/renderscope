"""Tests for the ``renderscope compare`` CLI command."""

from __future__ import annotations

import json
import re
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from pathlib import Path
import pytest
from PIL import Image
from typer.testing import CliRunner

from renderscope.cli.main import app

runner = CliRunner()

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def _strip_ansi(text: str) -> str:
    """Remove ANSI escape codes from Rich/Typer output."""
    return _ANSI_RE.sub("", text)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def image_pair(tmp_path: Path) -> tuple[Path, Path]:
    """Create a pair of slightly different 64x64 test images."""
    rng = np.random.default_rng(42)
    ref_data = (rng.random((64, 64, 3)) * 255).astype(np.uint8)

    noise = rng.integers(-5, 6, size=(64, 64, 3), dtype=np.int16)
    test_data = np.clip(ref_data.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    ref_path = tmp_path / "reference.png"
    test_path = tmp_path / "test.png"

    Image.fromarray(ref_data, mode="RGB").save(str(ref_path))
    Image.fromarray(test_data, mode="RGB").save(str(test_path))

    return ref_path, test_path


@pytest.fixture()
def identical_pair(tmp_path: Path) -> tuple[Path, Path]:
    """Create a pair of identical 32x32 test images."""
    data = np.full((32, 32, 3), 128, dtype=np.uint8)

    ref_path = tmp_path / "ref.png"
    test_path = tmp_path / "test.png"

    Image.fromarray(data, mode="RGB").save(str(ref_path))
    Image.fromarray(data, mode="RGB").save(str(test_path))

    return ref_path, test_path


@pytest.fixture()
def image_dirs(tmp_path: Path) -> tuple[Path, Path]:
    """Create two directories with matching image pairs for recursive tests."""
    dir_a = tmp_path / "dir_a"
    dir_b = tmp_path / "dir_b"
    dir_a.mkdir()
    dir_b.mkdir()

    rng = np.random.default_rng(123)

    for name in ("scene1", "scene2", "scene3"):
        ref_data = (rng.random((32, 32, 3)) * 255).astype(np.uint8)
        noise = rng.integers(-3, 4, size=(32, 32, 3), dtype=np.int16)
        test_data = np.clip(ref_data.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        Image.fromarray(ref_data, mode="RGB").save(str(dir_a / f"{name}.png"))
        Image.fromarray(test_data, mode="RGB").save(str(dir_b / f"{name}.png"))

    # Add an unmatched file in dir_a only.
    extra = (rng.random((32, 32, 3)) * 255).astype(np.uint8)
    Image.fromarray(extra, mode="RGB").save(str(dir_a / "extra.png"))

    return dir_a, dir_b


# ---------------------------------------------------------------------------
# Basic operation tests
# ---------------------------------------------------------------------------


class TestCompareBasic:
    """Tests for basic compare command operation."""

    def test_default_metrics(self, image_pair: tuple[Path, Path]) -> None:
        """Compare should run with default metrics and exit 0."""
        ref, test = image_pair
        result = runner.invoke(app, ["compare", str(ref), str(test)])
        assert result.exit_code == 0
        assert "PSNR" in result.output
        assert "SSIM" in result.output
        assert "MSE" in result.output

    def test_specific_metrics(self, image_pair: tuple[Path, Path]) -> None:
        """Compare with --metrics should only compute those metrics."""
        ref, test = image_pair
        result = runner.invoke(
            app,
            [
                "compare",
                str(ref),
                str(test),
                "--metrics",
                "psnr",
            ],
        )
        assert result.exit_code == 0
        assert "PSNR" in result.output

    def test_identical_images(self, identical_pair: tuple[Path, Path]) -> None:
        """Comparing identical images should show high/infinite PSNR."""
        ref, test = identical_pair
        result = runner.invoke(app, ["compare", str(ref), str(test)])
        assert result.exit_code == 0
        # PSNR should be infinity for identical images.
        assert "\u221e" in result.output or "inf" in result.output.lower()

    def test_help_shows_options(self) -> None:
        """compare --help should show all options."""
        result = runner.invoke(app, ["compare", "--help"])
        assert result.exit_code == 0
        output = _strip_ansi(result.output)
        assert "--metrics" in output
        assert "--diff-image" in output
        assert "--ssim-heatmap" in output
        assert "--format" in output
        assert "--amplify" in output
        assert "--colormap" in output
        assert "--recursive" in output


# ---------------------------------------------------------------------------
# Output format tests
# ---------------------------------------------------------------------------


class TestCompareOutputFormats:
    """Tests for different output formats."""

    def test_json_format(self, image_pair: tuple[Path, Path]) -> None:
        """JSON output should be valid JSON with metrics."""
        ref, test = image_pair
        result = runner.invoke(
            app,
            [
                "compare",
                str(ref),
                str(test),
                "--format",
                "json",
            ],
        )
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "metrics" in data
        assert "psnr" in data["metrics"]
        assert "ssim" in data["metrics"]
        assert "mse" in data["metrics"]
        assert "reference" in data
        assert "test" in data
        assert "width" in data
        assert "height" in data

    def test_csv_format(self, image_pair: tuple[Path, Path]) -> None:
        """CSV output should have a header row and a data row."""
        ref, test = image_pair
        result = runner.invoke(
            app,
            [
                "compare",
                str(ref),
                str(test),
                "--format",
                "csv",
            ],
        )
        assert result.exit_code == 0
        lines = result.output.strip().splitlines()
        assert len(lines) >= 2
        assert "reference" in lines[0].lower()
        assert "psnr" in lines[0].lower()


# ---------------------------------------------------------------------------
# Diff image and heatmap tests
# ---------------------------------------------------------------------------


class TestCompareOutputImages:
    """Tests for diff image and SSIM heatmap generation."""

    def test_diff_image_saved(self, image_pair: tuple[Path, Path], tmp_path: Path) -> None:
        """--diff-image should create the diff image file."""
        ref, test = image_pair
        diff_path = tmp_path / "diff.png"
        result = runner.invoke(
            app,
            [
                "compare",
                str(ref),
                str(test),
                "--diff-image",
                str(diff_path),
            ],
        )
        assert result.exit_code == 0
        assert diff_path.is_file()
        # Verify it's a valid image.
        img = Image.open(str(diff_path))
        assert img.size == (64, 64)

    def test_ssim_heatmap_saved(self, image_pair: tuple[Path, Path], tmp_path: Path) -> None:
        """--ssim-heatmap should create the heatmap image file."""
        ref, test = image_pair
        heatmap_path = tmp_path / "ssim.png"
        result = runner.invoke(
            app,
            [
                "compare",
                str(ref),
                str(test),
                "--ssim-heatmap",
                str(heatmap_path),
            ],
        )
        assert result.exit_code == 0
        assert heatmap_path.is_file()
        img = Image.open(str(heatmap_path))
        assert img.size == (64, 64)

    def test_both_outputs(self, image_pair: tuple[Path, Path], tmp_path: Path) -> None:
        """Both --diff-image and --ssim-heatmap together."""
        ref, test = image_pair
        diff_path = tmp_path / "diff.png"
        heatmap_path = tmp_path / "ssim.png"
        result = runner.invoke(
            app,
            [
                "compare",
                str(ref),
                str(test),
                "--diff-image",
                str(diff_path),
                "--ssim-heatmap",
                str(heatmap_path),
            ],
        )
        assert result.exit_code == 0
        assert diff_path.is_file()
        assert heatmap_path.is_file()


# ---------------------------------------------------------------------------
# Directory comparison tests
# ---------------------------------------------------------------------------


class TestCompareDirectory:
    """Tests for recursive directory comparison."""

    def test_recursive_processes_all_pairs(
        self,
        image_dirs: tuple[Path, Path],
    ) -> None:
        """--recursive should process all matching image pairs."""
        dir_a, dir_b = image_dirs
        result = runner.invoke(
            app,
            [
                "compare",
                str(dir_a),
                str(dir_b),
                "--recursive",
            ],
        )
        assert result.exit_code == 0
        # Should mention all three scene names.
        assert "PSNR" in result.output

    def test_recursive_json(self, image_dirs: tuple[Path, Path]) -> None:
        """Recursive comparison with JSON format."""
        dir_a, dir_b = image_dirs
        result = runner.invoke(
            app,
            [
                "compare",
                str(dir_a),
                str(dir_b),
                "--recursive",
                "--format",
                "json",
            ],
        )
        assert result.exit_code == 0
        # Output should contain valid JSON objects.
        assert "metrics" in result.output

    def test_recursive_reports_unmatched(self, image_dirs: tuple[Path, Path]) -> None:
        """Recursive should report unmatched files."""
        dir_a, dir_b = image_dirs
        result = runner.invoke(
            app,
            [
                "compare",
                str(dir_a),
                str(dir_b),
                "--recursive",
            ],
        )
        assert result.exit_code == 0
        # The "extra" file in dir_a should be reported as unmatched.
        assert "extra" in result.output.lower() or "unmatched" in result.output.lower()


# ---------------------------------------------------------------------------
# Error handling tests
# ---------------------------------------------------------------------------


class TestCompareErrors:
    """Tests for error handling in the compare command."""

    def test_missing_file(self, tmp_path: Path) -> None:
        """Comparing with a non-existent file should show an error."""
        result = runner.invoke(
            app,
            [
                "compare",
                str(tmp_path / "nonexistent.png"),
                str(tmp_path / "also_missing.png"),
            ],
        )
        assert result.exit_code != 0

    def test_unknown_metric(self, image_pair: tuple[Path, Path]) -> None:
        """Using an unknown metric name should show an error."""
        ref, test = image_pair
        result = runner.invoke(
            app,
            [
                "compare",
                str(ref),
                str(test),
                "--metrics",
                "bogus",
            ],
        )
        assert result.exit_code != 0

    def test_invalid_colormap(self, image_pair: tuple[Path, Path]) -> None:
        """Using an invalid colormap should show an error."""
        ref, test = image_pair
        result = runner.invoke(
            app,
            [
                "compare",
                str(ref),
                str(test),
                "--colormap",
                "jet",
            ],
        )
        assert result.exit_code != 0
