"""Mitsuba 3 renderer adapter.

Mitsuba 3 is a Python-native library.  It is detected via ``import mitsuba``
and renders are executed through the Python API.  This adapter handles
variant selection (scalar, LLVM, CUDA) and uses ``InProcessTimer`` for
timing since Mitsuba runs in the same process.

Detection:  ``import mitsuba; mitsuba.__version__``
Render:     ``mi.load_file(scene); mi.render(scene, spp=N)``
"""

from __future__ import annotations

import contextlib
import logging
import time
from typing import TYPE_CHECKING

from renderscope.adapters.base import RendererAdapter
from renderscope.adapters.exceptions import (
    RendererNotFoundError,
    RenderError,
    SceneFormatError,
)
from renderscope.core.runner import InProcessTimer, RenderResultBuilder

if TYPE_CHECKING:
    from pathlib import Path

    from renderscope.models.benchmark import RenderResult
    from renderscope.models.settings import RenderSettings

logger = logging.getLogger(__name__)

# Scene format extensions Mitsuba 3 can read
_SUPPORTED_FORMATS = ["mitsuba_xml", "xml", "gltf", "obj", "ply", "stl"]

# Extension → format name mapping
_EXT_TO_FORMAT: dict[str, str] = {
    ".xml": "mitsuba_xml",
    ".gltf": "gltf",
    ".glb": "gltf",
    ".obj": "obj",
    ".ply": "ply",
    ".stl": "stl",
}

# Variant selection priority (GPU, then LLVM, then scalar)
_GPU_VARIANTS = [
    "cuda_ad_rgb",
    "cuda_rgb",
    "llvm_ad_rgb",
    "llvm_rgb",
]

_CPU_VARIANTS = [
    "llvm_ad_rgb",
    "llvm_rgb",
    "scalar_rgb",
]

_FALLBACK_VARIANT = "scalar_rgb"


class MitsubaAdapter(RendererAdapter):
    """Adapter for Mitsuba 3 — research-oriented differentiable renderer."""

    @property
    def name(self) -> str:
        return "mitsuba3"

    @property
    def display_name(self) -> str:
        return "Mitsuba 3"

    def detect(self) -> str | None:
        """Check if Mitsuba 3 Python package is importable.

        Returns:
            The version string (e.g., ``'3.5.2'``) or ``None``.
        """
        try:
            import mitsuba

            version = getattr(mitsuba, "__version__", None)
            if version is not None:
                return str(version)
            # Some builds expose version differently
            version = getattr(mitsuba, "MI_VERSION", None)
            if version is not None:
                return str(version)
            return "unknown"
        except ImportError:
            return None
        except Exception:
            logger.debug("Mitsuba import failed unexpectedly", exc_info=True)
            return None

    def supported_formats(self) -> list[str]:
        return list(_SUPPORTED_FORMATS)

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        """Render a scene using the Mitsuba 3 Python API.

        Args:
            scene_path: Path to a Mitsuba XML or supported scene file.
            output_path: Where to save the rendered image.
            settings: Render configuration.

        Returns:
            A ``RenderResult`` with timing and metadata.

        Raises:
            RendererNotFoundError: If Mitsuba 3 is not installed.
            SceneFormatError: If the scene format is unsupported.
            RenderError: If the render fails.
        """
        # Check installation
        version = self.detect()
        if version is None:
            raise RendererNotFoundError(
                self.display_name,
                install_hint="pip install mitsuba",
            )

        # Validate scene format
        ext = scene_path.suffix.lower()
        fmt = _EXT_TO_FORMAT.get(ext)
        if fmt is None:
            raise SceneFormatError(
                self.display_name,
                str(scene_path),
                ext.lstrip("."),
                self.supported_formats(),
            )

        if not scene_path.exists():
            raise RenderError(
                self.display_name,
                f"Scene file not found: {scene_path}",
            )

        try:
            import mitsuba as mi
        except ImportError as exc:
            raise RendererNotFoundError(
                self.display_name,
                install_hint="pip install mitsuba",
            ) from exc

        # Select variant
        variant = self._select_variant(mi, gpu=settings.gpu)
        try:
            mi.set_variant(variant)
        except Exception as exc:
            raise RenderError(
                self.display_name,
                f"Failed to set variant '{variant}': {exc}",
            ) from exc

        # Suppress verbose logging during renders
        with contextlib.suppress(Exception):
            mi.set_log_level(mi.LogLevel.Warn)

        # Load scene (timed separately)
        load_start = time.perf_counter()
        try:
            scene = mi.load_file(str(scene_path))
        except Exception as exc:
            raise RenderError(
                self.display_name,
                f"Failed to load scene: {exc}",
            ) from exc
        scene_load_time = time.perf_counter() - load_start

        # Render with timing and memory monitoring
        render_kwargs: dict[str, object] = {}
        if settings.samples is not None:
            render_kwargs["spp"] = settings.samples

        timer = InProcessTimer()
        try:
            with timer:
                image = mi.render(scene, **render_kwargs)
        except Exception as exc:
            raise RenderError(
                self.display_name,
                f"Render failed: {exc}",
            ) from exc

        # Save output
        output_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            bitmap = mi.Bitmap(image)
            bitmap.write(str(output_path))
        except Exception as exc:
            raise RenderError(
                self.display_name,
                f"Failed to save output: {exc}",
            ) from exc

        if not output_path.exists():
            raise RenderError(
                self.display_name,
                f"Output file was not created at {output_path}",
            )

        # Build result
        builder = RenderResultBuilder(
            renderer=self.name,
            scene=scene_path.stem,
            output_path=str(output_path),
            render_time_seconds=timer.result.elapsed_seconds,
            peak_memory_mb=timer.result.peak_memory_mb,
            settings=settings,
            metadata={
                "version": version,
                "variant": variant,
                "scene_load_time_seconds": round(scene_load_time, 4),
                "baseline_memory_mb": round(timer.result.baseline_memory_mb, 1),
                "gpu_enabled": settings.gpu,
                "spp": settings.samples,
            },
        )
        return builder.build()

    @staticmethod
    def _select_variant(mi: object, *, gpu: bool) -> str:
        """Choose the best available Mitsuba variant.

        Args:
            mi: The imported mitsuba module.
            gpu: Whether to prefer GPU variants.

        Returns:
            The variant name to use.
        """
        try:
            available: list[str] = list(getattr(mi, "variants", lambda: [])())
        except Exception:
            return _FALLBACK_VARIANT

        if not available:
            return _FALLBACK_VARIANT

        candidates = _GPU_VARIANTS if gpu else _CPU_VARIANTS
        for variant in candidates:
            if variant in available:
                return variant

        # Fall back to whatever is available
        if _FALLBACK_VARIANT in available:
            return _FALLBACK_VARIANT

        return available[0]

    @staticmethod
    def _get_available_variants() -> list[str]:
        """Return a list of available Mitsuba variants, or empty list."""
        try:
            import mitsuba as mi

            variants_fn = getattr(mi, "variants", None)
            if callable(variants_fn):
                return list(variants_fn())
        except Exception:
            pass
        return []


def _register() -> None:
    """Register the Mitsuba adapter with the global registry."""
    from renderscope.core.registry import registry

    registry.register(MitsubaAdapter)


_register()
