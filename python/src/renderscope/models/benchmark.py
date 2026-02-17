"""Pydantic models for benchmark and render results.

These models represent the output of a benchmark run: timing data,
quality metrics, hardware context, and convergence information.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from renderscope.models.hardware import HardwareInfo
from renderscope.models.settings import RenderSettings


class RenderResult(BaseModel):
    """Result of a single render execution."""

    model_config = ConfigDict(extra="ignore")

    renderer: str
    scene: str
    output_path: str
    render_time_seconds: float
    peak_memory_mb: float
    settings: RenderSettings
    hardware: HardwareInfo
    timestamp: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class QualityMetrics(BaseModel):
    """Image quality metrics comparing a render against a reference."""

    model_config = ConfigDict(extra="ignore")

    reference_renderer: str | None = None
    reference_samples: int | None = None
    psnr: float | None = None
    ssim: float | None = None
    mse: float | None = None
    lpips: float | None = None


class ConvergencePoint(BaseModel):
    """A single data point in a convergence curve."""

    model_config = ConfigDict(extra="ignore")

    samples: int
    time: float
    psnr: float | None = None
    ssim: float | None = None


class BenchmarkResult(BaseModel):
    """Complete result of a benchmark run for one renderer on one scene."""

    model_config = ConfigDict(extra="ignore")

    id: str
    renderer: str
    renderer_version: str
    scene: str
    timestamp: str
    hardware: HardwareInfo
    settings: RenderSettings
    results: RenderResult
    quality_vs_reference: QualityMetrics | None = None
    convergence: list[ConvergencePoint] = Field(default_factory=list)
