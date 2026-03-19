"""Mock renderer adapter for testing.

This adapter always detects as installed, supports common scene formats,
and generates a solid-color image as output.  It is intended for use in
the test suite and integration tests — never for real benchmarking.

The adapter is automatically registered with the global registry on
import, just like production adapters.
"""

from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

import numpy as np
from PIL import Image

from renderscope.adapters.base import RendererAdapter
from renderscope.core.runner import RenderResultBuilder

if TYPE_CHECKING:
    from pathlib import Path

    from renderscope.models.benchmark import RenderResult
    from renderscope.models.settings import RenderSettings

logger = logging.getLogger(__name__)

_DEFAULT_SLEEP = 0.01  # seconds — fast enough for tests


class MockRendererAdapter(RendererAdapter):
    """A mock renderer adapter for testing purposes.

    - ``detect()`` always returns ``"1.0.0"``
    - ``render()`` writes a solid-color 64x64 PNG to the output path
    - ``is_mock`` returns ``True``
    """

    def __init__(self, sleep_seconds: float = _DEFAULT_SLEEP) -> None:
        self._sleep_seconds = sleep_seconds

    @property
    def name(self) -> str:
        return "mock"

    @property
    def display_name(self) -> str:
        return "Mock Renderer (Test Only)"

    @property
    def is_mock(self) -> bool:
        return True

    def detect(self) -> str | None:
        """Always returns version ``'1.0.0'``."""
        return "1.0.0"

    def supported_formats(self) -> list[str]:
        return ["pbrt", "obj", "gltf"]

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        """Generate a solid-color 64x64 PNG and return a ``RenderResult``.

        Args:
            scene_path: Path to the (unused) scene file.
            output_path: Where to write the rendered image.
            settings: Render configuration (width/height used if > 0).

        Returns:
            A ``RenderResult`` with realistic metadata.
        """
        width = settings.width if settings.width > 0 else 64
        height = settings.height if settings.height > 0 else 64

        # Simulate render time
        if self._sleep_seconds > 0:
            time.sleep(self._sleep_seconds)

        # Generate a deterministic solid-color image
        arr = np.full((height, width, 3), 128, dtype=np.uint8)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(arr, mode="RGB").save(str(output_path))

        builder = RenderResultBuilder(
            renderer=self.name,
            scene=scene_path.stem,
            output_path=str(output_path),
            render_time_seconds=self._sleep_seconds,
            peak_memory_mb=64.0,
            settings=settings,
            metadata={
                "mock": True,
                "version": self.detect(),
            },
        )
        return builder.build()


def _register() -> None:
    """Register the mock adapter with the global registry."""
    from renderscope.core.registry import registry

    registry.register(MockRendererAdapter)


_register()
