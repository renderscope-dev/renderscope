"""
RenderScope — CLI tool and library for benchmarking, comparing, and cataloging
open-source rendering engines.
"""

from __future__ import annotations

__version__ = "1.0.0"

from renderscope.core.metrics import ImageMetrics
from renderscope.models import (
    BenchmarkResult,
    HardwareInfo,
    QualityMetrics,
    RendererMetadata,
    RenderResult,
    RenderSettings,
)

__all__ = [
    "BenchmarkResult",
    "HardwareInfo",
    "ImageMetrics",
    "QualityMetrics",
    "RenderResult",
    "RenderSettings",
    "RendererMetadata",
    "__version__",
]
