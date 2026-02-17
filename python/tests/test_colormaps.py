"""Tests for the scientific colormaps module."""

from __future__ import annotations

import numpy as np
import pytest

from renderscope.utils.colormaps import (
    AVAILABLE_COLORMAPS,
    INFERNO,
    MAGMA,
    VIRIDIS,
    apply_colormap,
)

# ---------------------------------------------------------------------------
# Lookup table shape and range
# ---------------------------------------------------------------------------


class TestColormapLUTs:
    """Tests for the pre-computed lookup tables."""

    @pytest.mark.parametrize(
        "lut,name", [(VIRIDIS, "viridis"), (INFERNO, "inferno"), (MAGMA, "magma")]
    )
    def test_shape(self, lut: np.ndarray, name: str) -> None:
        """Each LUT should have shape (256, 3)."""
        assert lut.shape == (256, 3), f"{name} has shape {lut.shape}"

    @pytest.mark.parametrize(
        "lut,name", [(VIRIDIS, "viridis"), (INFERNO, "inferno"), (MAGMA, "magma")]
    )
    def test_dtype(self, lut: np.ndarray, name: str) -> None:
        """Each LUT should be float32."""
        assert lut.dtype == np.float32, f"{name} has dtype {lut.dtype}"

    @pytest.mark.parametrize(
        "lut,name", [(VIRIDIS, "viridis"), (INFERNO, "inferno"), (MAGMA, "magma")]
    )
    def test_range(self, lut: np.ndarray, name: str) -> None:
        """All LUT values should be in [0, 1]."""
        assert lut.min() >= 0.0, f"{name} has min {lut.min()}"
        assert lut.max() <= 1.0, f"{name} has max {lut.max()}"

    def test_available_colormaps_contains_all(self) -> None:
        """AVAILABLE_COLORMAPS should contain all three colormaps."""
        assert set(AVAILABLE_COLORMAPS.keys()) == {"viridis", "inferno", "magma"}

    def test_viridis_dark_start_bright_end(self) -> None:
        """Viridis should start dark and end bright (perceptually uniform)."""
        start_luminance = float(np.mean(VIRIDIS[0]))
        end_luminance = float(np.mean(VIRIDIS[-1]))
        assert end_luminance > start_luminance

    def test_inferno_dark_start_bright_end(self) -> None:
        """Inferno should start near-black and end bright."""
        start_luminance = float(np.mean(INFERNO[0]))
        end_luminance = float(np.mean(INFERNO[-1]))
        assert start_luminance < 0.1
        assert end_luminance > 0.5


# ---------------------------------------------------------------------------
# apply_colormap tests
# ---------------------------------------------------------------------------


class TestApplyColormap:
    """Tests for apply_colormap."""

    def test_output_shape(self) -> None:
        """Applying a colormap to (H, W) should produce (H, W, 3)."""
        gray = np.random.default_rng(1).random((32, 48)).astype(np.float32)
        result = apply_colormap(gray, "inferno")
        assert result.shape == (32, 48, 3)

    def test_output_dtype(self) -> None:
        """Output should be float32."""
        gray = np.zeros((8, 8), dtype=np.float32)
        result = apply_colormap(gray, "viridis")
        assert result.dtype == np.float32

    def test_output_range(self) -> None:
        """Output values should be in [0, 1]."""
        gray = np.random.default_rng(2).random((16, 16)).astype(np.float32)
        result = apply_colormap(gray, "magma")
        assert result.min() >= 0.0
        assert result.max() <= 1.0

    def test_zeros_map_to_first_entry(self) -> None:
        """An all-zero input should map to the first LUT entry."""
        gray = np.zeros((4, 4), dtype=np.float32)
        result = apply_colormap(gray, "inferno")
        expected = INFERNO[0]
        np.testing.assert_array_equal(result[0, 0], expected)

    def test_ones_map_to_last_entry(self) -> None:
        """An all-one input should map to the last LUT entry."""
        gray = np.ones((4, 4), dtype=np.float32)
        result = apply_colormap(gray, "inferno")
        expected = INFERNO[255]
        np.testing.assert_array_equal(result[0, 0], expected)

    def test_unknown_colormap_raises(self) -> None:
        """Unknown colormap name should raise ValueError."""
        gray = np.zeros((4, 4), dtype=np.float32)
        with pytest.raises(ValueError, match="Unknown colormap"):
            apply_colormap(gray, "jet")

    def test_3d_input_raises(self) -> None:
        """Passing a 3-D array should raise ValueError."""
        rgb = np.zeros((4, 4, 3), dtype=np.float32)
        with pytest.raises(ValueError, match="2-D"):
            apply_colormap(rgb, "inferno")

    @pytest.mark.parametrize("colormap_name", ["viridis", "inferno", "magma"])
    def test_all_colormaps_work(self, colormap_name: str) -> None:
        """Every named colormap should produce a valid result."""
        gray = np.linspace(0.0, 1.0, 64).reshape(8, 8).astype(np.float32)
        result = apply_colormap(gray, colormap_name)
        assert result.shape == (8, 8, 3)
        assert result.dtype == np.float32
