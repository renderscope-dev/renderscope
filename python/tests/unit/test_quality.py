"""Tests for the quality / convergence series module."""

from __future__ import annotations

import math

import numpy as np
import pytest

from renderscope.core.quality import (
    DEGENERATE_MSE_THRESHOLD,
    ConvergenceMetric,
    ImageComparison,
    build_convergence_series,
    compare_images,
    is_degenerate,
)

pytestmark = pytest.mark.metrics


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def reference_image() -> np.ndarray:
    """A deterministic 32x32 RGB reference image in [0, 1]."""
    rng = np.random.default_rng(1234)
    return rng.random((32, 32, 3)).astype(np.float32)


def _noisy(image: np.ndarray, sigma: float, seed: int) -> np.ndarray:
    """Add Gaussian noise of a given magnitude to an image."""
    rng = np.random.default_rng(seed)
    noise = rng.normal(0.0, sigma, size=image.shape).astype(np.float32)
    return np.clip(image + noise, 0.0, 1.0).astype(np.float32)


# ---------------------------------------------------------------------------
# compare_images
# ---------------------------------------------------------------------------


class TestCompareImages:
    """Tests for :func:`compare_images`."""

    def test_identical_ldr(self, reference_image: np.ndarray) -> None:
        result = compare_images(reference_image, reference_image, hdr=False)
        assert result.mse == 0.0
        assert result.psnr == float("inf")
        assert result.ssim == pytest.approx(1.0)
        assert result.identical is True

    def test_noisy_ldr_is_not_identical(self, reference_image: np.ndarray) -> None:
        noisy = _noisy(reference_image, sigma=0.05, seed=7)
        result = compare_images(reference_image, noisy, hdr=False)
        assert result.mse > 0.0
        assert math.isfinite(result.psnr)
        assert result.identical is False

    def test_more_noise_means_lower_psnr(self, reference_image: np.ndarray) -> None:
        low = compare_images(reference_image, _noisy(reference_image, 0.01, 1), hdr=False)
        high = compare_images(reference_image, _noisy(reference_image, 0.10, 2), hdr=False)
        assert low.psnr > high.psnr
        assert low.mse < high.mse

    def test_hdr_tonemaps_before_comparison(self) -> None:
        """HDR values above 1.0 are Reinhard-mapped, so a bright reference and
        an even brighter test still compare as very similar after tone-mapping."""
        ref = np.full((16, 16, 3), 10.0, dtype=np.float32)
        test = np.full((16, 16, 3), 12.0, dtype=np.float32)
        hdr_result = compare_images(ref, test, hdr=True)
        # Reinhard maps 10 -> 0.909 and 12 -> 0.923, a tiny difference.
        assert hdr_result.mse < 1e-2
        # Without tone-mapping the raw difference (2.0) would be enormous.
        ldr_result = compare_images(ref, test, hdr=False)
        assert ldr_result.mse > hdr_result.mse


# ---------------------------------------------------------------------------
# build_convergence_series
# ---------------------------------------------------------------------------


class TestBuildConvergenceSeries:
    """Tests for :func:`build_convergence_series`."""

    def test_monotonic_convergence(self, reference_image: np.ndarray) -> None:
        """Less noise at higher sample counts should yield rising PSNR."""
        images = {
            1: _noisy(reference_image, 0.10, 11),
            4: _noisy(reference_image, 0.05, 12),
            16: _noisy(reference_image, 0.02, 13),
            64: _noisy(reference_image, 0.005, 14),
        }
        series = build_convergence_series(reference_image, images, hdr=False)
        assert [p.samples for p in series] == [1, 4, 16, 64]
        psnrs = [p.psnr for p in series]
        assert psnrs == sorted(psnrs)  # ascending

    def test_sorts_unordered_input(self, reference_image: np.ndarray) -> None:
        images = {
            64: _noisy(reference_image, 0.005, 21),
            1: _noisy(reference_image, 0.10, 22),
            16: _noisy(reference_image, 0.02, 23),
        }
        series = build_convergence_series(reference_image, images, hdr=False)
        assert [p.samples for p in series] == [1, 16, 64]

    def test_empty_mapping_yields_empty_series(self, reference_image: np.ndarray) -> None:
        series = build_convergence_series(reference_image, {}, hdr=False)
        assert series == []


# ---------------------------------------------------------------------------
# is_degenerate
# ---------------------------------------------------------------------------


class TestIsDegenerate:
    """Tests for :func:`is_degenerate`."""

    def test_genuine_series_is_not_degenerate(self, reference_image: np.ndarray) -> None:
        images = {
            1: _noisy(reference_image, 0.10, 31),
            16: _noisy(reference_image, 0.02, 32),
        }
        series = build_convergence_series(reference_image, images, hdr=False)
        assert is_degenerate(series) is False

    def test_identical_renders_are_degenerate(self, reference_image: np.ndarray) -> None:
        """When every 'sample count' is the reference itself, the series carries
        no signal and must be rejected."""
        images = {
            1: reference_image.copy(),
            16: reference_image.copy(),
            256: reference_image.copy(),
        }
        series = build_convergence_series(reference_image, images, hdr=False)
        assert is_degenerate(series) is True

    def test_empty_series_is_degenerate(self) -> None:
        assert is_degenerate([]) is True

    def test_threshold_boundary(self) -> None:
        """A series whose worst MSE sits just above the threshold is genuine."""
        just_above = ConvergenceMetric(
            samples=1, psnr=30.0, ssim=0.9, mse=DEGENERATE_MSE_THRESHOLD * 2
        )
        just_below = ConvergenceMetric(
            samples=1, psnr=90.0, ssim=1.0, mse=DEGENERATE_MSE_THRESHOLD / 2
        )
        assert is_degenerate([just_above]) is False
        assert is_degenerate([just_below]) is True


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


class TestDataclasses:
    """Small guarantees about the public dataclasses."""

    def test_image_comparison_identical_flag(self) -> None:
        assert ImageComparison(psnr=float("inf"), ssim=1.0, mse=0.0).identical is True
        assert ImageComparison(psnr=42.0, ssim=0.99, mse=1e-4).identical is False

    def test_metrics_are_frozen(self) -> None:
        metric = ConvergenceMetric(samples=4, psnr=30.0, ssim=0.9, mse=1e-3)
        with pytest.raises(AttributeError):
            metric.samples = 8  # type: ignore[misc]
