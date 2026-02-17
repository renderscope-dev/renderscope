"""Abstract base class for renderer adapters.

Every supported renderer implements this interface to provide a
consistent way to detect, configure, and invoke renders.  Concrete
implementations are created in Phase 16.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

    from renderscope.models.benchmark import RenderResult
    from renderscope.models.settings import RenderSettings


class RendererAdapter(ABC):
    """Abstract interface for renderer adapters.

    Each supported renderer implements this interface to provide
    detection, format information, and render execution.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Canonical renderer identifier (e.g., ``'pbrt'``, ``'mitsuba3'``)."""

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable renderer name (e.g., ``'PBRT v4'``, ``'Mitsuba 3'``)."""

    @abstractmethod
    def detect(self) -> str | None:
        """Check if the renderer is installed on this system.

        Returns:
            The version string if detected, ``None`` otherwise.
        """

    @abstractmethod
    def supported_formats(self) -> list[str]:
        """Scene file formats this renderer can consume.

        Returns:
            A list of format identifiers (e.g., ``['pbrt', 'gltf']``).
        """

    @abstractmethod
    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        """Execute a render with the given settings.

        Args:
            scene_path: Path to the scene file.
            output_path: Path where the rendered image should be saved.
            settings: Render configuration (resolution, samples, etc.).

        Returns:
            A ``RenderResult`` with timing, output path, and metadata.
        """

    def convert_scene(self, source: Path, target_format: str) -> Path:
        """Convert a scene file to this renderer's native format.

        Not all renderers support scene conversion.  The default
        implementation raises ``NotImplementedError``.

        Args:
            source: Path to the source scene file.
            target_format: Target format identifier.

        Returns:
            Path to the converted scene file.

        Raises:
            NotImplementedError: If conversion is not supported.
        """
        raise NotImplementedError(f"{self.display_name} does not support scene conversion.")
