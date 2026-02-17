"""Pydantic model for system hardware information.

Used by the system-info command and stored in benchmark results
for reproducibility. Every benchmark result includes the hardware
profile of the machine it was run on.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class HardwareInfo(BaseModel):
    """Detected system hardware and software environment."""

    model_config = ConfigDict(extra="ignore")

    cpu: str
    cpu_cores_physical: int
    cpu_cores_logical: int
    ram_gb: float
    gpu: str | None = None
    gpu_vram_gb: float | None = None
    os: str
    python_version: str
    renderscope_version: str | None = None
    optional_deps: list[str] | None = None
