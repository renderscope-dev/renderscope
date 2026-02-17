"""Image quality metrics for comparing rendered images.

This module provides the scientific core of RenderScope's comparison engine.
All metrics accept float32 ``(H, W, 3)`` arrays and return scalar values or
per-pixel maps.

Supported metrics:

* **PSNR** — Peak Signal-to-Noise Ratio (dB, higher is better)
* **SSIM** — Structural Similarity Index (-1 to 1, higher is better)
* **MSE** — Mean Squared Error (lower is better)
* **LPIPS** — Learned Perceptual Image Patch Similarity (lower is better,
  requires ``renderscope[ml]`` extra)

Usage::

    from renderscope.core.metrics import ImageMetrics

    psnr = ImageMetrics.psnr(reference, test)
    ssim = ImageMetrics.ssim(reference, test)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
from skimage.metrics import (
    peak_signal_noise_ratio,
    structural_similarity,
)

from renderscope.utils.colormaps import apply_colormap

if TYPE_CHECKING:
    from numpy.typing import NDArray


class ImageMetrics:
    """Static methods for computing image quality metrics.

    Every public method normalizes its inputs via :meth:`_validate_inputs`
    before computation, so callers do not need to worry about dtype or
    channel-count mismatches.
    """

    # ------------------------------------------------------------------
    # Public metrics
    # ------------------------------------------------------------------

    @staticmethod
    def psnr(
        reference: NDArray[np.float32],
        test: NDArray[np.float32],
        data_range: float = 1.0,
    ) -> float:
        """Compute Peak Signal-to-Noise Ratio in decibels.

        Returns ``float('inf')`` for identical images.

        Args:
            reference: Ground-truth image ``(H, W, 3)``, float32.
            test: Image to evaluate ``(H, W, 3)``, float32.
            data_range: The dynamic range of the images (1.0 for [0, 1]).

        Returns:
            PSNR value in dB (higher is better).
        """
        ref, tst = ImageMetrics._validate_inputs(reference, test)
        result: float = peak_signal_noise_ratio(  # type: ignore[no-untyped-call]
            ref,
            tst,
            data_range=data_range,
        )
        return result

    @staticmethod
    def ssim(
        reference: NDArray[np.float32],
        test: NDArray[np.float32],
        data_range: float = 1.0,
    ) -> float:
        """Compute the mean Structural Similarity Index.

        Args:
            reference: Ground-truth image ``(H, W, 3)``, float32.
            test: Image to evaluate ``(H, W, 3)``, float32.
            data_range: The dynamic range of the images.

        Returns:
            Scalar SSIM (-1 to 1, higher is better).
        """
        ref, tst = ImageMetrics._validate_inputs(reference, test)
        result: float = structural_similarity(  # type: ignore[no-untyped-call]
            ref,
            tst,
            data_range=data_range,
            channel_axis=-1,
        )
        return result

    @staticmethod
    def ssim_map(
        reference: NDArray[np.float32],
        test: NDArray[np.float32],
        data_range: float = 1.0,
    ) -> NDArray[np.float32]:
        """Compute a per-pixel SSIM map.

        Args:
            reference: Ground-truth image ``(H, W, 3)``, float32.
            test: Image to evaluate ``(H, W, 3)``, float32.
            data_range: The dynamic range of the images.

        Returns:
            A 2-D array ``(H, W)`` of per-pixel SSIM values.
        """
        ref, tst = ImageMetrics._validate_inputs(reference, test)
        _, smap = structural_similarity(  # type: ignore[no-untyped-call]
            ref,
            tst,
            data_range=data_range,
            channel_axis=-1,
            full=True,
        )
        # structural_similarity returns (H, W, C) when channel_axis is set;
        # average across channels to produce the per-pixel (H, W) map.
        smap_arr = np.asarray(smap, dtype=np.float32)
        if smap_arr.ndim == 3:
            smap_arr = np.mean(smap_arr, axis=-1).astype(np.float32)
        return smap_arr

    @staticmethod
    def mse(
        reference: NDArray[np.float32],
        test: NDArray[np.float32],
    ) -> float:
        """Compute Mean Squared Error.

        Args:
            reference: Ground-truth image ``(H, W, 3)``, float32.
            test: Image to evaluate ``(H, W, 3)``, float32.

        Returns:
            Scalar MSE (lower is better).
        """
        ref, tst = ImageMetrics._validate_inputs(reference, test)
        return float(np.mean((ref - tst) ** 2))

    @staticmethod
    def absolute_diff(
        reference: NDArray[np.float32],
        test: NDArray[np.float32],
    ) -> NDArray[np.float32]:
        """Compute the per-pixel absolute difference.

        Args:
            reference: Ground-truth image ``(H, W, 3)``, float32.
            test: Image to evaluate ``(H, W, 3)``, float32.

        Returns:
            An ``(H, W, 3)`` array of per-pixel absolute differences.
        """
        ref, tst = ImageMetrics._validate_inputs(reference, test)
        diff: NDArray[np.float32] = np.abs(ref - tst).astype(np.float32)
        return diff

    @staticmethod
    def false_color_map(
        error_map: NDArray[np.float32],
        colormap: str = "inferno",
        normalize: bool = True,
    ) -> NDArray[np.float32]:
        """Convert a scalar error map to a false-color RGB image.

        Args:
            error_map: A 2-D ``(H, W)`` or 3-D ``(H, W, 3)`` error map.
                If 3-D, the mean across channels is taken first.
            colormap: Name of the colormap (``"viridis"``, ``"inferno"``,
                or ``"magma"``).
            normalize: If ``True``, linearly scale the map to ``[0, 1]``
                using its min/max.

        Returns:
            False-color RGB image ``(H, W, 3)`` with values in ``[0, 1]``.
        """
        # Reduce to 2-D if needed.
        if error_map.ndim == 3:
            gray = np.mean(error_map, axis=-1).astype(np.float32)
        elif error_map.ndim == 2:
            gray = error_map.astype(np.float32)
        else:
            msg = f"Expected 2-D or 3-D error map, got shape {error_map.shape}"
            raise ValueError(msg)

        # Normalize to [0, 1].
        if normalize:
            vmin = float(gray.min())
            vmax = float(gray.max())
            gray = (gray - vmin) / (vmax - vmin) if vmax - vmin > 1e-8 else np.zeros_like(gray)
        else:
            gray = np.clip(gray, 0.0, 1.0)

        return apply_colormap(gray, colormap)

    @staticmethod
    def lpips(
        reference: NDArray[np.float32],
        test: NDArray[np.float32],
    ) -> float:
        """Compute LPIPS (Learned Perceptual Image Patch Similarity).

        Requires the ``renderscope[ml]`` extra (``torch`` and
        ``torchmetrics``).  Raises :class:`ImportError` if unavailable.

        Args:
            reference: Ground-truth image ``(H, W, 3)``, float32 in [0, 1].
            test: Image to evaluate ``(H, W, 3)``, float32 in [0, 1].

        Returns:
            LPIPS distance (lower is better; 0 for identical images).

        Raises:
            ImportError: If ``torch`` or ``torchmetrics`` is not installed.
        """
        ref, tst = ImageMetrics._validate_inputs(reference, test)

        try:
            import torch
            from torchmetrics.image.lpip import LearnedPerceptualImagePatchSimilarity
        except ImportError as exc:
            msg = (
                "LPIPS requires PyTorch and torchmetrics.  Install with:\n"
                "  pip install renderscope[ml]"
            )
            raise ImportError(msg) from exc

        # torchmetrics LPIPS expects (N, C, H, W) tensors scaled to [-1, 1].
        def _to_tensor(arr: NDArray[np.float32]) -> torch.Tensor:
            # (H, W, 3) → (1, 3, H, W), scale [0,1] → [-1,1]
            t = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).float()
            return t * 2.0 - 1.0

        ref_t = _to_tensor(ref)
        tst_t = _to_tensor(tst)

        lpips_fn = LearnedPerceptualImagePatchSimilarity(net_type="alex", normalize=False)
        lpips_fn.eval()

        with torch.no_grad():
            result = lpips_fn(ref_t, tst_t)

        return float(result.item())

    # ------------------------------------------------------------------
    # Input validation
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_inputs(
        reference: NDArray[np.float32],
        test: NDArray[np.float32],
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """Normalize and validate a pair of images for metric computation.

        * Converts float64 → float32.
        * Strips alpha channels (RGBA → RGB).
        * Expands grayscale ``(H, W)`` → ``(H, W, 3)``.
        * Rejects mismatched dimensions.
        * Rejects arrays containing NaN.
        """
        reference = _coerce_to_float32_rgb(reference)
        test = _coerce_to_float32_rgb(test)

        if reference.shape != test.shape:
            msg = f"Image dimension mismatch: reference {reference.shape} vs test {test.shape}"
            raise ValueError(msg)

        if np.isnan(reference).any():
            msg = "Reference image contains NaN values"
            raise ValueError(msg)
        if np.isnan(test).any():
            msg = "Test image contains NaN values"
            raise ValueError(msg)

        return reference, test


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _coerce_to_float32_rgb(image: NDArray[np.float32]) -> NDArray[np.float32]:
    """Convert an arbitrary numeric array to float32 ``(H, W, 3)``."""
    arr = np.asarray(image)

    # Dtype conversion.
    if arr.dtype != np.float32:
        arr = arr.astype(np.float32)

    # Channel normalization.
    if arr.ndim == 2:
        arr = np.stack([arr, arr, arr], axis=-1)
    elif arr.ndim == 3:
        if arr.shape[2] == 4:
            arr = arr[:, :, :3].copy()
        elif arr.shape[2] == 1:
            arr = np.concatenate([arr, arr, arr], axis=-1)
        elif arr.shape[2] != 3:
            msg = f"Expected 1, 3, or 4 channels, got {arr.shape[2]}"
            raise ValueError(msg)
    else:
        msg = f"Expected 2-D or 3-D array, got {arr.ndim}-D"
        raise ValueError(msg)

    return arr.astype(np.float32)
