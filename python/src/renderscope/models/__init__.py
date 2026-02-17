"""Pydantic data models for the RenderScope ecosystem.

All models use Pydantic v2 and serve as the canonical Python representation
of the JSON data schemas shared with the web app and npm package.
"""

from __future__ import annotations

from renderscope.models.benchmark import BenchmarkResult, QualityMetrics, RenderResult
from renderscope.models.hardware import HardwareInfo
from renderscope.models.renderer import CommunityLinks, RendererMetadata
from renderscope.models.settings import RenderSettings

__all__ = [
    "BenchmarkResult",
    "CommunityLinks",
    "HardwareInfo",
    "QualityMetrics",
    "RenderResult",
    "RenderSettings",
    "RendererMetadata",
]
