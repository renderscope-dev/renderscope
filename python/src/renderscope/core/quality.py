"""Quality and convergence metric series computed from rendered images.

This module turns a set of already-rendered images into the image-quality
numbers that RenderScope publishes.  It is the reusable core behind the
``compute_benchmarks_from_renders`` script: given a converged *reference*
render and one image per sample count, it produces a genuine convergence
series (PSNR/SSIM/MSE at each sample count) using the same conventions as
:class:`renderscope.core.benchmark.BenchmarkRunner`.

Accuracy conventions (identical to the benchmark runner):

* HDR images (EXR) are Reinhard tone-mapped to ``[0, 1)`` before comparison.
* Metrics are computed at ``data_range=1.0`` via :class:`ImageMetrics`.

Crucially, this module can also tell when a "convergence" series is
**degenerate** — when the per-sample-count renders are numerically identical
to the reference (float-precision noise only).  That happens when a render did
not actually vary with its sample count, and any convergence curve derived from
it would be an artifact rather than a measurement.  Callers should refuse to
publish degenerate series (see :func:`is_degenerate`).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

from renderscope.core.metrics import ImageMetrics
from renderscope.utils.image_io import tonemap

if TYPE_CHECKING:
    from collections.abc import Mapping

    import numpy as np
    from numpy.typing import NDArray

# Two renders whose mean squared error falls below this threshold are
# effectively identical: sqrt(1e-6) ~= 1e-3 per-pixel, well below what any
# genuine change in Monte-Carlo sample count produces.  A convergence series
# whose *worst* point is this close to the reference carries no real signal.
DEGENERATE_MSE_THRESHOLD: float = 1e-6


@dataclass(frozen=True)
class ImageComparison:
    """Quality of a single image measured against a reference."""

    psnr: float
    ssim: float
    mse: float

    @property
    def identical(self) -> bool:
        """Whether the two images are identical up to float precision."""
        return self.mse <= 0.0 or math.isinf(self.psnr)


@dataclass(frozen=True)
class ConvergenceMetric:
    """Measured quality at one sample count within a convergence series."""

    samples: int
    psnr: float
    ssim: float
    mse: float


def _prepare(image: NDArray[np.float32], *, hdr: bool) -> NDArray[np.float32]:
    """Tone-map HDR input; pass LDR input through unchanged.

    Mirrors :meth:`BenchmarkRunner._compute_quality`, which tone-maps only
    images loaded from HDR formats and otherwise uses the already-normalized
    ``[0, 1]`` array as-is.
    """
    if hdr:
        return tonemap(image)
    return image


def compare_images(
    reference: NDArray[np.float32],
    test: NDArray[np.float32],
    *,
    hdr: bool = True,
) -> ImageComparison:
    """Compute PSNR, SSIM, and MSE of *test* against *reference*.

    Args:
        reference: Ground-truth image ``(H, W, 3)``, float32.
        test: Image to evaluate ``(H, W, 3)``, float32.
        hdr: If ``True`` (the default), both images are Reinhard tone-mapped
            before comparison — appropriate for EXR renders.

    Returns:
        An :class:`ImageComparison` with the three scalar metrics.
    """
    ref = _prepare(reference, hdr=hdr)
    tst = _prepare(test, hdr=hdr)
    return ImageComparison(
        psnr=ImageMetrics.psnr(ref, tst),
        ssim=ImageMetrics.ssim(ref, tst),
        mse=ImageMetrics.mse(ref, tst),
    )


def build_convergence_series(
    reference: NDArray[np.float32],
    images_by_samples: Mapping[int, NDArray[np.float32]],
    *,
    hdr: bool = True,
) -> list[ConvergenceMetric]:
    """Measure quality at each sample count against a converged reference.

    Args:
        reference: The converged reference render (typically the highest
            sample count available).
        images_by_samples: One image per sample count.  The reference's own
            sample count may be included; its metrics will simply show a
            perfect (identical) match.
        hdr: Passed through to :func:`compare_images`.

    Returns:
        A list of :class:`ConvergenceMetric`, ascending by sample count.
    """
    series: list[ConvergenceMetric] = []
    for samples in sorted(images_by_samples):
        comparison = compare_images(reference, images_by_samples[samples], hdr=hdr)
        series.append(
            ConvergenceMetric(
                samples=samples,
                psnr=comparison.psnr,
                ssim=comparison.ssim,
                mse=comparison.mse,
            )
        )
    return series


def is_degenerate(
    series: list[ConvergenceMetric],
    *,
    mse_threshold: float = DEGENERATE_MSE_THRESHOLD,
) -> bool:
    """Return ``True`` when a convergence series carries no real signal.

    A series is degenerate when even its worst (highest-MSE) point is within
    float precision of the reference — meaning the renders did not actually
    change with sample count, so the "convergence" is an artifact.  An empty
    series is treated as degenerate.

    Args:
        series: The convergence series to inspect.
        mse_threshold: Renders differing by less than this MSE are considered
            identical.

    Returns:
        ``True`` if the series should not be published as convergence data.
    """
    if not series:
        return True
    return max(point.mse for point in series) < mse_threshold
