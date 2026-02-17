"""Tests for the image I/O utilities."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from renderscope.utils.image_io import (
    is_hdr,
    load_image,
    normalize_channels,
    save_image,
    tonemap,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def gradient_rgb(tmp_path: Path) -> Path:
    """Create a 64x64 RGB gradient PNG for testing."""
    arr = np.zeros((64, 64, 3), dtype=np.uint8)
    arr[:, :, 0] = np.arange(64, dtype=np.uint8).reshape(1, 64).repeat(64, axis=0) * 4
    arr[:, :, 1] = np.arange(64, dtype=np.uint8).reshape(64, 1).repeat(64, axis=1) * 4
    arr[:, :, 2] = 128
    path = tmp_path / "gradient.png"
    Image.fromarray(arr, mode="RGB").save(str(path))
    return path


@pytest.fixture()
def grayscale_png(tmp_path: Path) -> Path:
    """Create a 32x32 grayscale PNG."""
    arr = np.arange(32 * 32, dtype=np.uint8).reshape(32, 32)
    path = tmp_path / "gray.png"
    Image.fromarray(arr, mode="L").save(str(path))
    return path


@pytest.fixture()
def rgba_png(tmp_path: Path) -> Path:
    """Create a 16x16 RGBA PNG."""
    arr = np.full((16, 16, 4), 128, dtype=np.uint8)
    arr[:, :, 3] = 200  # alpha channel
    path = tmp_path / "rgba.png"
    Image.fromarray(arr, mode="RGBA").save(str(path))
    return path


# ---------------------------------------------------------------------------
# load_image tests
# ---------------------------------------------------------------------------


class TestLoadImage:
    """Tests for load_image."""

    def test_load_png_shape_dtype(self, gradient_rgb: Path) -> None:
        """Loaded PNG should be float32 (H, W, 3)."""
        img = load_image(gradient_rgb)
        assert img.dtype == np.float32
        assert img.ndim == 3
        assert img.shape == (64, 64, 3)

    def test_load_png_range(self, gradient_rgb: Path) -> None:
        """LDR pixel values should be in [0, 1]."""
        img = load_image(gradient_rgb)
        assert img.min() >= 0.0
        assert img.max() <= 1.0

    def test_load_grayscale_expands(self, grayscale_png: Path) -> None:
        """Grayscale PNG should be expanded to 3 channels."""
        img = load_image(grayscale_png)
        assert img.shape == (32, 32, 3)
        # All three channels should be identical.
        np.testing.assert_array_equal(img[:, :, 0], img[:, :, 1])
        np.testing.assert_array_equal(img[:, :, 1], img[:, :, 2])

    def test_load_rgba_strips_alpha(self, rgba_png: Path) -> None:
        """RGBA PNG should have alpha stripped, resulting in 3 channels."""
        img = load_image(rgba_png)
        assert img.shape == (16, 16, 3)

    def test_load_nonexistent_raises(self) -> None:
        """Loading a missing file should raise FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            load_image(Path("/nonexistent/path/image.png"))

    def test_load_unsupported_format_raises(self, tmp_path: Path) -> None:
        """Loading an unsupported format should raise ValueError."""
        path = tmp_path / "file.xyz"
        path.write_text("not an image")
        with pytest.raises(ValueError, match="Unsupported image format"):
            load_image(path)


# ---------------------------------------------------------------------------
# save_image tests
# ---------------------------------------------------------------------------


class TestSaveImage:
    """Tests for save_image."""

    def test_roundtrip_png(self, tmp_path: Path) -> None:
        """Save then load a PNG — values should be close within quantization."""
        original = np.random.default_rng(42).random((32, 32, 3)).astype(np.float32)
        path = tmp_path / "out.png"
        save_image(original, path)
        loaded = load_image(path)
        # uint8 quantization: max error ≈ 1/255 ≈ 0.004
        np.testing.assert_allclose(original, loaded, atol=0.005)

    def test_roundtrip_jpeg(self, tmp_path: Path) -> None:
        """JPEG roundtrip should produce a valid image with same shape."""
        # Use a smooth gradient (JPEG handles smooth regions much better
        # than random noise, which is the worst case for DCT compression).
        h, w = 64, 64
        r = np.linspace(0.1, 0.9, w, dtype=np.float32).reshape(1, w).repeat(h, axis=0)
        g = np.linspace(0.2, 0.8, h, dtype=np.float32).reshape(h, 1).repeat(w, axis=1)
        b = np.full((h, w), 0.5, dtype=np.float32)
        original = np.stack([r, g, b], axis=-1)

        path = tmp_path / "out.jpg"
        save_image(original, path)
        loaded = load_image(path)

        assert loaded.shape == original.shape
        assert loaded.dtype == np.float32
        # JPEG is lossy but should be close for smooth gradients.
        np.testing.assert_allclose(original, loaded, atol=0.05)

    def test_save_creates_parent_directory(self, tmp_path: Path) -> None:
        """save_image should create intermediate directories."""
        image = np.ones((8, 8, 3), dtype=np.float32) * 0.5
        path = tmp_path / "subdir" / "deep" / "image.png"
        save_image(image, path)
        assert path.is_file()

    def test_save_invalid_shape_raises(self, tmp_path: Path) -> None:
        """Saving a non-(H,W,3) array should raise ValueError."""
        image = np.ones((8, 8), dtype=np.float32)
        with pytest.raises(ValueError, match="Expected image shape"):
            save_image(image, tmp_path / "bad.png")

    def test_save_unsupported_format_raises(self, tmp_path: Path) -> None:
        """Saving to an unsupported format should raise ValueError."""
        image = np.ones((8, 8, 3), dtype=np.float32)
        with pytest.raises(ValueError, match="Unsupported save format"):
            save_image(image, tmp_path / "bad.xyz")


# ---------------------------------------------------------------------------
# tonemap tests
# ---------------------------------------------------------------------------


class TestTonemap:
    """Tests for tone mapping."""

    @pytest.fixture()
    def hdr_image(self) -> np.ndarray:
        """Create a synthetic HDR image with values > 1."""
        rng = np.random.default_rng(7)
        return (rng.random((32, 32, 3)) * 10.0).astype(np.float32)

    def test_reinhard_range(self, hdr_image: np.ndarray) -> None:
        """Reinhard tone mapping should produce values in [0, 1]."""
        result = tonemap(hdr_image, method="reinhard")
        assert result.dtype == np.float32
        assert result.min() >= 0.0
        assert result.max() <= 1.0

    def test_exposure_range(self, hdr_image: np.ndarray) -> None:
        """Exposure tone mapping should produce values in [0, 1]."""
        result = tonemap(hdr_image, method="exposure", exposure=2.0)
        assert result.dtype == np.float32
        assert result.min() >= 0.0
        assert result.max() <= 1.0

    def test_clamp_range(self, hdr_image: np.ndarray) -> None:
        """Clamp tone mapping should produce values in [0, 1]."""
        result = tonemap(hdr_image, method="clamp")
        assert result.dtype == np.float32
        assert result.min() >= 0.0
        assert result.max() <= 1.0

    def test_clamp_preserves_ldr(self) -> None:
        """Clamping an already-LDR image should be a no-op."""
        ldr = np.full((8, 8, 3), 0.5, dtype=np.float32)
        result = tonemap(ldr, method="clamp")
        np.testing.assert_array_equal(result, ldr)

    def test_invalid_method_raises(self) -> None:
        """Unknown tone mapping method should raise ValueError."""
        image = np.ones((8, 8, 3), dtype=np.float32)
        with pytest.raises(ValueError, match="Unknown tone mapping method"):
            tonemap(image, method="nonexistent")


# ---------------------------------------------------------------------------
# is_hdr tests
# ---------------------------------------------------------------------------


class TestIsHDR:
    """Tests for is_hdr."""

    def test_exr_is_hdr(self) -> None:
        assert is_hdr("scene.exr") is True

    def test_hdr_is_hdr(self) -> None:
        assert is_hdr("scene.hdr") is True

    def test_png_is_not_hdr(self) -> None:
        assert is_hdr("image.png") is False

    def test_jpeg_is_not_hdr(self) -> None:
        assert is_hdr("photo.jpg") is False

    def test_case_insensitive(self) -> None:
        assert is_hdr("scene.EXR") is True
        assert is_hdr("image.HDR") is True


# ---------------------------------------------------------------------------
# normalize_channels tests
# ---------------------------------------------------------------------------


class TestNormalizeChannels:
    """Tests for normalize_channels."""

    def test_grayscale_to_rgb(self) -> None:
        gray = np.ones((8, 8), dtype=np.float32) * 0.5
        result = normalize_channels(gray)
        assert result.shape == (8, 8, 3)
        np.testing.assert_array_equal(result[:, :, 0], result[:, :, 1])

    def test_rgba_to_rgb(self) -> None:
        rgba = np.ones((8, 8, 4), dtype=np.float32)
        result = normalize_channels(rgba)
        assert result.shape == (8, 8, 3)

    def test_rgb_passthrough(self) -> None:
        rgb = np.ones((8, 8, 3), dtype=np.float32)
        result = normalize_channels(rgb)
        assert result.shape == (8, 8, 3)

    def test_single_channel_to_rgb(self) -> None:
        single = np.ones((8, 8, 1), dtype=np.float32) * 0.3
        result = normalize_channels(single)
        assert result.shape == (8, 8, 3)
        np.testing.assert_allclose(result, 0.3)

    def test_invalid_shape_raises(self) -> None:
        with pytest.raises(ValueError, match="Cannot normalize"):
            normalize_channels(np.ones((8, 8, 5), dtype=np.float32))
