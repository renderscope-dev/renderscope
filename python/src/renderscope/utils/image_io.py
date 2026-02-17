"""Image loading, saving, and tone mapping utilities for RenderScope.

All images are normalized to NumPy float32 arrays.  LDR formats (PNG, JPEG)
are scaled to ``[0.0, 1.0]``.  HDR formats (EXR, HDR) retain their original
range (values may exceed 1.0) and should be tone-mapped before use with
metrics like PSNR and SSIM.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np
from PIL import Image

if TYPE_CHECKING:
    from numpy.typing import NDArray

logger = logging.getLogger(__name__)

# Extensions treated as high dynamic range.
_HDR_EXTENSIONS: frozenset[str] = frozenset({".exr", ".hdr"})

# Extensions loadable via Pillow (low dynamic range).
_LDR_EXTENSIONS: frozenset[str] = frozenset({".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"})

# All supported extensions for directory scanning.
SUPPORTED_EXTENSIONS: frozenset[str] = _LDR_EXTENSIONS | _HDR_EXTENSIONS


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def is_hdr(path: str | Path) -> bool:
    """Return ``True`` if *path* has an HDR file extension (``.exr`` or ``.hdr``)."""
    return Path(path).suffix.lower() in _HDR_EXTENSIONS


def load_image(path: str | Path) -> NDArray[np.float32]:
    """Load an image from disk and return a float32 ``(H, W, 3)`` array.

    LDR images (PNG, JPEG, TIFF) are normalized to ``[0.0, 1.0]``.
    HDR images (EXR, Radiance HDR) retain their original range.
    Alpha channels are stripped; grayscale is expanded to 3 channels.

    Args:
        path: Path to the image file.

    Returns:
        A NumPy float32 array of shape ``(H, W, 3)``.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the format is unsupported or the file is corrupt.
    """
    file_path = Path(path)
    if not file_path.is_file():
        msg = f"Image file not found: {file_path}"
        raise FileNotFoundError(msg)

    suffix = file_path.suffix.lower()

    if suffix in _HDR_EXTENSIONS:
        return _load_hdr(file_path)

    if suffix in _LDR_EXTENSIONS:
        return _load_ldr(file_path)

    msg = (
        f"Unsupported image format: '{suffix}'. "
        f"Supported: {sorted(_LDR_EXTENSIONS | _HDR_EXTENSIONS)}"
    )
    raise ValueError(msg)


def save_image(image: NDArray[np.float32], path: str | Path) -> None:
    """Save a float32 ``(H, W, 3)`` array to disk.

    For LDR formats (PNG, JPEG), values are clipped to ``[0, 1]`` and
    converted to uint8.  For EXR, float32 data is written directly
    (requires ``imageio`` or ``OpenEXR``).

    Args:
        image: A float32 array of shape ``(H, W, 3)``.
        path: Destination file path.

    Raises:
        ValueError: If the image shape is invalid or the format is unsupported.
    """
    file_path = Path(path)
    _validate_image_shape(image)

    file_path.parent.mkdir(parents=True, exist_ok=True)

    suffix = file_path.suffix.lower()

    if suffix in {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}:
        clipped = np.clip(image, 0.0, 1.0)
        uint8_data = (clipped * 255.0 + 0.5).astype(np.uint8)
        pil_image = Image.fromarray(uint8_data, mode="RGB")
        pil_image.save(str(file_path))
        return

    if suffix == ".exr":
        _save_exr(image, file_path)
        return

    msg = f"Unsupported save format: '{suffix}'"
    raise ValueError(msg)


def tonemap(
    hdr_image: NDArray[np.float32],
    method: str = "reinhard",
    exposure: float = 1.0,
) -> NDArray[np.float32]:
    """Tone-map an HDR image to ``[0.0, 1.0]`` for display or metric computation.

    Args:
        hdr_image: Float32 array with values potentially exceeding 1.0.
        method: Tone mapping operator — ``"reinhard"``, ``"exposure"``, or
            ``"clamp"``.
        exposure: Exposure multiplier (used by the ``"exposure"`` method).

    Returns:
        Float32 array with values in ``[0.0, 1.0]``.

    Raises:
        ValueError: If *method* is unrecognized.
    """
    _validate_image_shape(hdr_image)

    if method == "reinhard":
        # Reinhard global operator: L / (1 + L)
        return (hdr_image / (1.0 + hdr_image)).astype(np.float32)

    if method == "exposure":
        # Exposure mapping: 1 - exp(-exposure * L)
        exposed = 1.0 - np.exp(-exposure * hdr_image)
        out: NDArray[np.float32] = np.clip(exposed, 0.0, 1.0).astype(np.float32)
        return out

    if method == "clamp":
        return np.clip(hdr_image, 0.0, 1.0).astype(np.float32)

    msg = f"Unknown tone mapping method: '{method}'. Supported: reinhard, exposure, clamp"
    raise ValueError(msg)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _validate_image_shape(image: NDArray[np.float32]) -> None:
    """Raise ``ValueError`` if the image is not ``(H, W, 3)``."""
    if image.ndim != 3 or image.shape[2] != 3:
        msg = f"Expected image shape (H, W, 3), got {image.shape}"
        raise ValueError(msg)


def normalize_channels(image: NDArray[np.float32]) -> NDArray[np.float32]:
    """Strip alpha or expand grayscale to produce a 3-channel array.

    Args:
        image: Array of shape ``(H, W)``, ``(H, W, 1)``, ``(H, W, 3)``,
            or ``(H, W, 4)``.

    Returns:
        Array of shape ``(H, W, 3)``.

    Raises:
        ValueError: If the shape cannot be normalized.
    """
    if image.ndim == 2:
        return np.stack([image, image, image], axis=-1).astype(np.float32)

    if image.ndim == 3:
        channels = image.shape[2]
        if channels == 4:
            return image[:, :, :3].copy().astype(np.float32)
        if channels == 1:
            return np.concatenate([image, image, image], axis=-1).astype(np.float32)
        if channels == 3:
            return image.astype(np.float32)

    msg = f"Cannot normalize image with shape {image.shape} to (H, W, 3)"
    raise ValueError(msg)


def _load_ldr(file_path: Path) -> NDArray[np.float32]:
    """Load an LDR image via Pillow and normalize to float32 ``[0, 1]``."""
    try:
        pil_image = Image.open(str(file_path))
    except Exception as exc:
        msg = f"Failed to open image: {file_path}"
        raise ValueError(msg) from exc

    # Convert palette, indexed, and grayscale modes to RGB.
    pil_rgb: Image.Image
    if pil_image.mode in ("P", "L", "LA", "I", "I;16"):
        pil_rgb = pil_image.convert("RGB")
    elif pil_image.mode == "RGBA":
        pil_rgb = pil_image  # Keep RGBA — alpha stripped by normalize_channels.
    elif pil_image.mode != "RGB":
        pil_rgb = pil_image.convert("RGB")
    else:
        pil_rgb = pil_image

    arr = np.asarray(pil_rgb, dtype=np.float32)

    # Normalize integer-range images to [0, 1].
    if arr.max() > 1.0:
        arr = arr / 255.0

    return normalize_channels(arr)


def _load_hdr(file_path: Path) -> NDArray[np.float32]:
    """Load an HDR image (EXR or Radiance .hdr) via a cascade of backends.

    Tries backends in order: ``OpenEXR`` → ``imageio`` → ``OpenCV``.
    """
    suffix = file_path.suffix.lower()

    # Try OpenEXR (best quality for .exr files).
    if suffix == ".exr":
        try:
            return _load_exr_openexr(file_path)
        except Exception:
            logger.debug("OpenEXR unavailable or failed, falling back to imageio")

    # Try imageio (supports .exr via freeimage plugin, and .hdr natively).
    try:
        return _load_imageio(file_path)
    except Exception:
        logger.debug("imageio unavailable or failed, falling back to OpenCV")

    # Try OpenCV as last resort.
    try:
        return _load_opencv(file_path)
    except Exception:
        pass

    msg = (
        f"Cannot load HDR image: {file_path}\n"
        "Install one of: pip install imageio  |  pip install OpenEXR  |  "
        "pip install opencv-python-headless"
    )
    raise ValueError(msg)


def _load_exr_openexr(file_path: Path) -> NDArray[np.float32]:
    """Load an EXR file using the ``OpenEXR`` library."""
    import Imath
    import OpenEXR

    exr_file = OpenEXR.InputFile(str(file_path))
    header = exr_file.header()
    dw = header["dataWindow"]
    width: int = dw.max.x - dw.min.x + 1
    height: int = dw.max.y - dw.min.y + 1

    float_type = Imath.PixelType(Imath.PixelType.FLOAT)
    channels: list[NDArray[np.float32]] = []
    for channel_name in ("R", "G", "B"):
        raw = exr_file.channel(channel_name, float_type)
        channel = np.frombuffer(raw, dtype=np.float32).reshape(height, width)
        channels.append(channel)

    return np.stack(channels, axis=-1)


def _load_imageio(file_path: Path) -> NDArray[np.float32]:
    """Load an HDR image using ``imageio``."""
    import imageio.v3 as iio

    image: NDArray[np.float32] = iio.imread(str(file_path))
    arr = np.asarray(image, dtype=np.float32)
    return normalize_channels(arr)


def _load_opencv(file_path: Path) -> NDArray[np.float32]:
    """Load an HDR image using OpenCV."""
    import cv2

    flags: int = cv2.IMREAD_UNCHANGED | cv2.IMREAD_ANYDEPTH
    image = cv2.imread(str(file_path), flags)
    if image is None:
        msg = f"OpenCV failed to load: {file_path}"
        raise ValueError(msg)

    # OpenCV loads as BGR — convert to RGB.
    if image.ndim == 3 and image.shape[2] >= 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    arr: NDArray[np.float32] = image.astype(np.float32)
    return normalize_channels(arr)


def _save_exr(image: NDArray[np.float32], file_path: Path) -> None:
    """Save a float32 array as EXR using the best available backend."""
    # Try imageio first.
    try:
        import imageio.v3 as iio

        iio.imwrite(str(file_path), image.astype(np.float32))
        return
    except ImportError:
        pass

    # Try OpenEXR.
    try:
        import Imath
        import OpenEXR

        height, width = image.shape[:2]
        header = OpenEXR.Header(width, height)
        float_type = Imath.PixelType(Imath.PixelType.FLOAT)
        header["channels"] = {
            "R": Imath.Channel(float_type),
            "G": Imath.Channel(float_type),
            "B": Imath.Channel(float_type),
        }
        exr_file = OpenEXR.OutputFile(str(file_path), header)
        exr_file.writePixels(
            {
                "R": image[:, :, 0].astype(np.float32).tobytes(),
                "G": image[:, :, 1].astype(np.float32).tobytes(),
                "B": image[:, :, 2].astype(np.float32).tobytes(),
            }
        )
        exr_file.close()
        return
    except ImportError:
        pass

    msg = "Cannot save EXR: install imageio or OpenEXR"
    raise ValueError(msg)
