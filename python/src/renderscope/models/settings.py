"""Pydantic model for render settings.

Configuration passed to renderer adapters when executing a render.
Defined here in Phase 15, used by adapters in Phase 16+.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RenderSettings(BaseModel):
    """Configuration for a single render execution."""

    model_config = ConfigDict(extra="ignore")

    width: int = 1920
    height: int = 1080
    samples: int | None = None
    time_budget: float | None = None
    threads: int | None = None
    gpu: bool = False
    extra: dict[str, Any] = Field(default_factory=dict)
