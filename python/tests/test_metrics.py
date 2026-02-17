"""Tests for the image quality metrics module."""

from __future__ import annotations

import numpy as np
import pytest

from renderscope.core.metrics import ImageMetrics

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def reference_image() -> np.ndarray:
    """A deterministic 64x64 RGB reference image in [0, 1]."""
    rng = np.random.default_rng(42)
    return rng.random((64, 64, 3)).astype(np.float32)


@pytest.fixture()
def noisy_image(reference_image: np.ndarray) -> np.ndarray:
    """A slightly noisy version of the reference (SSIM should be high)."""
    rng = np.random.default_rng(99)
    noise = rng.normal(0.0, 0.02, size=reference_image.shape).astype(np.float32)
    return np.clip(reference_image + noise, 0.0, 1.0).astype(np.float32)


@pytest.fixture()
def different_image() -> np.ndarray:
    """A completely different image (low similarity to any reference)."""
    rng = np.random.default_rng(7)
    return rng.random((64, 64, 3)).astype(np.float32)


# ---------------------------------------------------------------------------
# PSNR tests
# ---------------------------------------------------------------------------


class TestPSNR:
    """Tests for ImageMetrics.psnr."""

    def test_identical_images_infinite(self, reference_image: np.ndarray) -> None:
        """PSNR of identical images should be infinity."""
        result = ImageMetrics.psnr(reference_image, reference_image)
        assert result == float("inf")

    def test_similar_images_high(
        self,
        reference_image: np.ndarray,
        noisy_image: np.ndarray,
    ) -> None:
        """Slightly noisy images should have high PSNR (> 25 dB)."""
        result = ImageMetrics.psnr(reference_image, noisy_image)
        assert result > 25.0

    def test_different_images_lower(
        self,
        reference_image: np.ndarray,
        different_image: np.ndarray,
    ) -> None:
        """Very different images should have lower PSNR."""
        result = ImageMetrics.psnr(reference_image, different_image)
        assert result < 20.0

    def test_known_mse_value(self) -> None:
        """PSNR for a known MSE should match the formula."""
        # MSE = 0.01 → PSNR = 10 * log10(1 / 0.01) = 20 dB
        ref = np.zeros((32, 32, 3), dtype=np.float32)
        test = np.full((32, 32, 3), 0.1, dtype=np.float32)
        # MSE = 0.01
        result = ImageMetrics.psnr(ref, test)
        np.testing.assert_allclose(result, 20.0, atol=0.01)

    def test_shape_mismatch_raises(self) -> None:
        """Mismatched image sizes should raise ValueError."""
        a = np.zeros((32, 32, 3), dtype=np.float32)
        b = np.zeros((64, 64, 3), dtype=np.float32)
        with pytest.raises(ValueError, match="mismatch"):
            ImageMetrics.psnr(a, b)


# ---------------------------------------------------------------------------
# SSIM tests
# ---------------------------------------------------------------------------


class TestSSIM:
    """Tests for ImageMetrics.ssim."""

    def test_identical_images(self, reference_image: np.ndarray) -> None:
        """SSIM of identical images should be ~1.0."""
        result = ImageMetrics.ssim(reference_image, reference_image)
        np.testing.assert_allclose(result, 1.0, atol=1e-6)

    def test_similar_images_high(
        self,
        reference_image: np.ndarray,
        noisy_image: np.ndarray,
    ) -> None:
        """Slightly noisy images should have SSIM close to 1."""
        result = ImageMetrics.ssim(reference_image, noisy_image)
        assert result > 0.85

    def test_different_images_lower(
        self,
        reference_image: np.ndarray,
        different_image: np.ndarray,
    ) -> None:
        """Very different images should have lower SSIM."""
        result = ImageMetrics.ssim(reference_image, different_image)
        assert result < 0.5


class TestSSIMMap:
    """Tests for ImageMetrics.ssim_map."""

    def test_shape(self, reference_image: np.ndarray) -> None:
        """SSIM map should be (H, W)."""
        smap = ImageMetrics.ssim_map(reference_image, reference_image)
        assert smap.shape == (64, 64)

    def test_identical_near_one(self, reference_image: np.ndarray) -> None:
        """SSIM map for identical images should be near 1.0 everywhere."""
        smap = ImageMetrics.ssim_map(reference_image, reference_image)
        assert smap.mean() > 0.99

    def test_dtype(self, reference_image: np.ndarray) -> None:
        """SSIM map should be float32."""
        smap = ImageMetrics.ssim_map(reference_image, reference_image)
        assert smap.dtype == np.float32


# ---------------------------------------------------------------------------
# MSE tests
# ---------------------------------------------------------------------------


class TestMSE:
    """Tests for ImageMetrics.mse."""

    def test_identical_is_zero(self, reference_image: np.ndarray) -> None:
        """MSE of identical images should be 0."""
        result = ImageMetrics.mse(reference_image, reference_image)
        assert result == 0.0

    def test_known_value(self) -> None:
        """MSE should match manual calculation."""
        ref = np.zeros((8, 8, 3), dtype=np.float32)
        test = np.full((8, 8, 3), 0.5, dtype=np.float32)
        expected = 0.25  # (0.5)^2
        result = ImageMetrics.mse(ref, test)
        np.testing.assert_allclose(result, expected, atol=1e-6)

    def test_symmetry(
        self,
        reference_image: np.ndarray,
        noisy_image: np.ndarray,
    ) -> None:
        """MSE(a, b) should equal MSE(b, a)."""
        mse_ab = ImageMetrics.mse(reference_image, noisy_image)
        mse_ba = ImageMetrics.mse(noisy_image, reference_image)
        np.testing.assert_allclose(mse_ab, mse_ba, atol=1e-8)


# ---------------------------------------------------------------------------
# absolute_diff tests
# ---------------------------------------------------------------------------


class TestAbsoluteDiff:
    """Tests for ImageMetrics.absolute_diff."""

    def test_identical_is_zeros(self, reference_image: np.ndarray) -> None:
        """Diff of identical images should be all zeros."""
        diff = ImageMetrics.absolute_diff(reference_image, reference_image)
        assert diff.max() == 0.0

    def test_shape_preserved(self, reference_image: np.ndarray) -> None:
        """Output shape should match input shape."""
        diff = ImageMetrics.absolute_diff(reference_image, reference_image)
        assert diff.shape == reference_image.shape

    def test_known_values(self) -> None:
        """Diff of [0.3] and [0.8] should be [0.5]."""
        ref = np.full((4, 4, 3), 0.3, dtype=np.float32)
        test = np.full((4, 4, 3), 0.8, dtype=np.float32)
        diff = ImageMetrics.absolute_diff(ref, test)
        np.testing.assert_allclose(diff, 0.5, atol=1e-6)

    def test_non_negative(
        self,
        reference_image: np.ndarray,
        noisy_image: np.ndarray,
    ) -> None:
        """Absolute diff should always be non-negative."""
        diff = ImageMetrics.absolute_diff(reference_image, noisy_image)
        assert diff.min() >= 0.0


# ---------------------------------------------------------------------------
# false_color_map tests
# ---------------------------------------------------------------------------


class TestFalseColorMap:
    """Tests for ImageMetrics.false_color_map."""

    def test_output_shape_2d(self) -> None:
        """2-D error map should produce (H, W, 3) false-color image."""
        error = np.random.default_rng(1).random((16, 16)).astype(np.float32)
        result = ImageMetrics.false_color_map(error)
        assert result.shape == (16, 16, 3)

    def test_output_shape_3d(self) -> None:
        """3-D error map should be averaged to 2-D then false-colored."""
        error = np.random.default_rng(2).random((16, 16, 3)).astype(np.float32)
        result = ImageMetrics.false_color_map(error)
        assert result.shape == (16, 16, 3)

    def test_output_range(self) -> None:
        """Output values should be in [0, 1]."""
        error = np.random.default_rng(3).random((16, 16)).astype(np.float32)
        result = ImageMetrics.false_color_map(error)
        assert result.min() >= 0.0
        assert result.max() <= 1.0

    def test_dtype(self) -> None:
        """Output should be float32."""
        error = np.zeros((8, 8), dtype=np.float32)
        result = ImageMetrics.false_color_map(error)
        assert result.dtype == np.float32

    @pytest.mark.parametrize("colormap", ["viridis", "inferno", "magma"])
    def test_valid_colormaps(self, colormap: str) -> None:
        """All supported colormaps should work."""
        error = np.linspace(0.0, 1.0, 64).reshape(8, 8).astype(np.float32)
        result = ImageMetrics.false_color_map(error, colormap=colormap)
        assert result.shape == (8, 8, 3)

    def test_uniform_input_no_division_error(self) -> None:
        """A uniform error map should not cause division by zero."""
        error = np.full((8, 8), 0.5, dtype=np.float32)
        result = ImageMetrics.false_color_map(error, normalize=True)
        # Should produce a single color (no crash).
        assert result.shape == (8, 8, 3)
        assert not np.isnan(result).any()


# ---------------------------------------------------------------------------
# LPIPS tests
# ---------------------------------------------------------------------------


class TestLPIPS:
    """Tests for ImageMetrics.lpips.

    These tests are skipped if torch/torchmetrics are not installed.
    """

    @pytest.fixture(autouse=True)
    def _require_torch(self) -> None:
        pytest.importorskip("torch")
        pytest.importorskip("torchmetrics")

    def test_identical_near_zero(self, reference_image: np.ndarray) -> None:
        """LPIPS of identical images should be very close to 0."""
        result = ImageMetrics.lpips(reference_image, reference_image)
        assert result < 0.01

    def test_different_images_positive(
        self,
        reference_image: np.ndarray,
        different_image: np.ndarray,
    ) -> None:
        """Very different images should have LPIPS > 0.1."""
        result = ImageMetrics.lpips(reference_image, different_image)
        assert result > 0.1


class TestLPIPSMissingTorch:
    """Test that LPIPS raises ImportError when torch is absent."""

    def test_missing_torch_raises_import_error(
        self,
        reference_image: np.ndarray,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """LPIPS should raise ImportError if torch is not importable."""
        import builtins

        original_import = builtins.__import__

        def _mock_import(name: str, *args: object, **kwargs: object) -> object:
            if name in ("torch", "torchmetrics", "torchmetrics.image.lpip"):
                raise ImportError("mocked")
            return original_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, "__import__", _mock_import)
        with pytest.raises(ImportError, match="renderscope\\[ml\\]"):
            ImageMetrics.lpips(reference_image, reference_image)


# ---------------------------------------------------------------------------
# Input validation tests
# ---------------------------------------------------------------------------


class TestValidateInputs:
    """Tests for ImageMetrics._validate_inputs."""

    def test_float64_to_float32(self) -> None:
        """float64 arrays should be converted to float32."""
        a = np.ones((8, 8, 3), dtype=np.float64)
        b = np.ones((8, 8, 3), dtype=np.float64)
        ref, tst = ImageMetrics._validate_inputs(a, b)
        assert ref.dtype == np.float32
        assert tst.dtype == np.float32

    def test_rgba_stripped(self) -> None:
        """RGBA arrays should be stripped to RGB."""
        a = np.ones((8, 8, 4), dtype=np.float32)
        b = np.ones((8, 8, 4), dtype=np.float32)
        ref, tst = ImageMetrics._validate_inputs(a, b)
        assert ref.shape == (8, 8, 3)
        assert tst.shape == (8, 8, 3)

    def test_grayscale_expanded(self) -> None:
        """Grayscale (H, W) arrays should be expanded to (H, W, 3)."""
        a = np.ones((8, 8), dtype=np.float32)
        b = np.ones((8, 8), dtype=np.float32)
        ref, tst = ImageMetrics._validate_inputs(a, b)
        assert ref.shape == (8, 8, 3)
        assert tst.shape == (8, 8, 3)

    def test_dimension_mismatch_raises(self) -> None:
        """Mismatched dimensions should raise ValueError."""
        a = np.ones((8, 8, 3), dtype=np.float32)
        b = np.ones((16, 16, 3), dtype=np.float32)
        with pytest.raises(ValueError, match="mismatch"):
            ImageMetrics._validate_inputs(a, b)

    def test_nan_in_reference_raises(self) -> None:
        """NaN in reference should raise ValueError."""
        a = np.ones((8, 8, 3), dtype=np.float32)
        a[0, 0, 0] = np.nan
        b = np.ones((8, 8, 3), dtype=np.float32)
        with pytest.raises(ValueError, match="NaN"):
            ImageMetrics._validate_inputs(a, b)

    def test_nan_in_test_raises(self) -> None:
        """NaN in test image should raise ValueError."""
        a = np.ones((8, 8, 3), dtype=np.float32)
        b = np.ones((8, 8, 3), dtype=np.float32)
        b[0, 0, 0] = np.nan
        with pytest.raises(ValueError, match="NaN"):
            ImageMetrics._validate_inputs(a, b)
