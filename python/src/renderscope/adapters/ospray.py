"""Intel OSPRay renderer adapter.

Intel OSPRay is a high-performance CPU ray tracing framework for
scientific visualization, built on Intel Embree.  It supports multiple
renderer types (``scivis``, ``pathtracer``, ``ao``) and has both CLI
tools and Python bindings.

This adapter uses a **multi-tool detection** strategy:

1. ``ospStudio`` — interactive viewer with batch rendering support
2. ``ospExamples`` / ``ospTutorial`` — SDK sample renderers
3. ``ospBenchmark`` — dedicated performance measurement tool
4. Python bindings (``import ospray``)

Detection:  CLI tool search → Python bindings fallback
Render:     ``ospStudio --batch ...`` or Python API
"""

from __future__ import annotations

import logging
import os
import re
import shutil
from enum import Enum, unique
from typing import TYPE_CHECKING

from renderscope.adapters.base import RendererAdapter
from renderscope.adapters.exceptions import (
    RendererNotFoundError,
    RenderError,
    SceneFormatError,
)
from renderscope.core.runner import (
    InProcessTimer,
    RenderResultBuilder,
    run_subprocess,
)

if TYPE_CHECKING:
    from pathlib import Path

    from renderscope.models.benchmark import RenderResult
    from renderscope.models.settings import RenderSettings

logger = logging.getLogger(__name__)

# CLI tools in priority order (for rendering)
_STUDIO_BINARY = "ospStudio"
_EXAMPLE_BINARIES = ("ospExamples", "ospTutorial")
_BENCHMARK_BINARY = "ospBenchmark"

# All tools to search during detection
_ALL_TOOLS = (_STUDIO_BINARY, *_EXAMPLE_BINARIES, _BENCHMARK_BINARY)

# Version regex
_VERSION_RE = re.compile(r"v?(\d+\.\d+[\.\d]*)")

# Supported scene formats
_SUPPORTED_FORMATS = ["obj", "gltf", "glb", "ospray"]

_EXT_TO_FORMAT: dict[str, str] = {
    ".obj": "obj",
    ".gltf": "gltf",
    ".glb": "glb",
    ".sg": "ospray",
    ".ospray": "ospray",
}

# OSPRay renderer types
_RENDERER_TYPES = ("pathtracer", "scivis", "ao")
_DEFAULT_RENDERER_TYPE = "pathtracer"


@unique
class _IntegrationPath(Enum):
    """How the adapter communicates with OSPRay."""

    STUDIO = "ospStudio"
    EXAMPLES = "ospExamples"
    PYTHON_API = "python_api"


class OSPRayAdapter(RendererAdapter):
    """Adapter for Intel OSPRay — CPU ray tracer for scientific visualization.

    OSPRay is heavily CPU-optimized using SIMD instructions (SSE, AVX,
    AVX-512).  Recent versions support GPU rendering via SYCL, but
    this adapter defaults to CPU for consistent benchmarking.

    The default renderer type is ``pathtracer`` for quality comparison
    with other path tracers in RenderScope.
    """

    def __init__(self) -> None:
        self._integration_path: _IntegrationPath | None = None
        self._detected_version: str | None = None
        self._cli_binary: str | None = None

    @property
    def name(self) -> str:
        return "ospray"

    @property
    def display_name(self) -> str:
        return "Intel OSPRay"

    def detect(self) -> str | None:
        """Detect OSPRay via CLI tools or Python bindings.

        Searches for ``ospStudio``, ``ospExamples``, ``ospTutorial``,
        and ``ospBenchmark`` in PATH.  Falls back to ``import ospray``.

        Returns:
            Version string (e.g., ``'3.1.0'``) or ``None``.
        """
        # Path 1: ospStudio (preferred — supports batch rendering)
        studio_path = shutil.which(_STUDIO_BINARY)
        if studio_path is not None:
            logger.debug("Found OSPRay Studio: %s", studio_path)
            self._cli_binary = _STUDIO_BINARY
            self._integration_path = _IntegrationPath.STUDIO
            version = self._extract_version(_STUDIO_BINARY)
            self._detected_version = version
            return version

        # Path 2: example tools
        for tool in _EXAMPLE_BINARIES:
            tool_path = shutil.which(tool)
            if tool_path is not None:
                logger.debug("Found OSPRay tool: %s → %s", tool, tool_path)
                self._cli_binary = tool
                self._integration_path = _IntegrationPath.EXAMPLES
                version = self._extract_version(tool)
                self._detected_version = version
                return version

        # Path 3: benchmark tool (can detect, limited for rendering)
        bench_path = shutil.which(_BENCHMARK_BINARY)
        if bench_path is not None:
            logger.debug("Found OSPRay benchmark tool: %s", bench_path)
            self._cli_binary = _BENCHMARK_BINARY
            self._integration_path = _IntegrationPath.EXAMPLES
            version = self._extract_version(_BENCHMARK_BINARY)
            self._detected_version = version
            return version

        # Path 4: Python bindings
        py_version = self._detect_python_bindings()
        if py_version is not None:
            self._integration_path = _IntegrationPath.PYTHON_API
            self._detected_version = py_version
            return py_version

        logger.debug("Intel OSPRay not found (no CLI tools or Python bindings)")
        return None

    def supported_formats(self) -> list[str]:
        return list(_SUPPORTED_FORMATS)

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        """Render a scene using Intel OSPRay.

        Uses ``ospStudio`` in batch mode when available, otherwise falls
        back to example tools or Python bindings.

        Args:
            scene_path: Path to the scene file (OBJ, glTF, GLB, or .sg).
            output_path: Where to save the rendered image.
            settings: Render configuration.

        Returns:
            A ``RenderResult`` with timing and metadata.

        Raises:
            RendererNotFoundError: If OSPRay is not installed.
            SceneFormatError: If the scene format is unsupported.
            RenderError: If the render fails.
        """
        version = self.detect()
        if version is None:
            raise RendererNotFoundError(
                self.display_name,
                install_hint=(
                    "Download from https://www.ospray.org/downloads.html\n"
                    "  or: conda install -c conda-forge ospray"
                ),
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

        output_path.parent.mkdir(parents=True, exist_ok=True)

        # GPU handling: OSPRay is primarily CPU
        if settings.gpu:
            logger.warning(
                "OSPRay is primarily CPU-based. GPU support requires SYCL "
                "(ospray_module_gpu). Falling back to CPU rendering."
            )

        renderer_type = settings.extra.get("renderer_type", _DEFAULT_RENDERER_TYPE)
        if renderer_type not in _RENDERER_TYPES:
            logger.warning(
                "Unknown OSPRay renderer type '%s'; using '%s'.",
                renderer_type,
                _DEFAULT_RENDERER_TYPE,
            )
            renderer_type = _DEFAULT_RENDERER_TYPE

        if self._integration_path == _IntegrationPath.PYTHON_API:
            return self._render_python_api(
                scene_path, output_path, settings, version, renderer_type
            )
        return self._render_cli(scene_path, output_path, settings, version, renderer_type)

    # ------------------------------------------------------------------
    # Detection helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_version(tool_name: str) -> str:
        """Run a tool with --version and try to parse a version string.

        Args:
            tool_name: Name of the OSPRay CLI tool.

        Returns:
            Version string (may be ``'unknown'``).
        """
        for flag in ("--version", "--help"):
            try:
                result = run_subprocess(
                    [tool_name, flag],
                    timeout=10.0,
                )
                output = f"{result.stdout}\n{result.stderr}"
                match = _VERSION_RE.search(output)
                if match:
                    return match.group(1)
            except Exception:
                logger.debug("Failed to run '%s %s'", tool_name, flag)
        return "unknown"

    @staticmethod
    def _detect_python_bindings() -> str | None:
        """Check for OSPRay Python bindings.

        Returns:
            Version string or ``None``.
        """
        try:
            import ospray as osp

            version = getattr(osp, "__version__", None)
            if version is not None:
                return str(version)
            version = getattr(osp, "version", None)
            if callable(version):
                return str(version())
            return "unknown"
        except ImportError:
            return None
        except Exception:
            logger.debug("ospray Python import failed unexpectedly", exc_info=True)
            return None

    # ------------------------------------------------------------------
    # Render execution
    # ------------------------------------------------------------------

    def _render_cli(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
        version: str,
        renderer_type: str,
    ) -> RenderResult:
        """Render using ospStudio or an example CLI tool.

        Args:
            scene_path: Path to the scene file.
            output_path: Where to save the rendered image.
            settings: Render configuration.
            version: Detected version string.
            renderer_type: OSPRay renderer type (pathtracer, scivis, ao).

        Returns:
            A ``RenderResult``.

        Raises:
            RenderError: If the render fails.
        """
        binary = self._cli_binary
        if binary is None:
            raise RenderError(self.display_name, "No CLI tool found (detection inconsistency)")

        logger.info("Rendering via CLI: %s (renderer: %s)", binary, renderer_type)

        # Build environment with thread control
        env: dict[str, str] | None = None
        if settings.threads is not None:
            env = {"OSPRAY_NUM_THREADS": str(settings.threads)}

        if binary == _STUDIO_BINARY:
            cmd = self._build_studio_cmd(scene_path, output_path, settings, renderer_type)
        else:
            cmd = self._build_example_cmd(binary, scene_path, output_path, settings)

        timeout = settings.time_budget if settings.time_budget else settings.extra.get("timeout")

        result = run_subprocess(
            cmd,
            timeout=timeout,
            cwd=str(scene_path.parent),
            env=env,
        )

        if result.exit_code != 0:
            raise RenderError(
                self.display_name,
                "Non-zero exit code",
                exit_code=result.exit_code,
                stderr_output=result.stderr,
            )

        if not output_path.exists():
            raise RenderError(
                self.display_name,
                f"Output file was not created at {output_path}",
                stderr_output=result.stderr,
            )

        builder = RenderResultBuilder(
            renderer=self.name,
            scene=scene_path.stem,
            output_path=str(output_path),
            render_time_seconds=result.elapsed_seconds,
            peak_memory_mb=result.peak_memory_mb,
            settings=settings,
            metadata={
                "version": version,
                "binary": binary,
                "integration_path": (
                    self._integration_path.value if self._integration_path else "cli"
                ),
                "renderer_type": renderer_type,
                "exit_code": result.exit_code,
                "gpu_enabled": False,
                "gpu_requested": settings.gpu,
            },
        )
        return builder.build()

    def _render_python_api(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
        version: str,
        renderer_type: str,
    ) -> RenderResult:
        """Render using OSPRay Python bindings.

        Args:
            scene_path: Path to the scene file.
            output_path: Where to save the rendered image.
            settings: Render configuration.
            version: Detected version string.
            renderer_type: OSPRay renderer type.

        Returns:
            A ``RenderResult``.

        Raises:
            RenderError: If the render fails.
        """
        try:
            import ospray as osp
        except ImportError as exc:
            raise RendererNotFoundError(
                self.display_name,
                install_hint="pip install ospray",
            ) from exc

        logger.info("Rendering via OSPRay Python API (renderer: %s)", renderer_type)

        # Set thread count via environment if specified
        if settings.threads is not None:
            os.environ["OSPRAY_NUM_THREADS"] = str(settings.threads)

        timer = InProcessTimer()
        try:
            with timer:
                # Initialize OSPRay
                osp.init()

                # Create renderer
                renderer = osp.Renderer(renderer_type)
                spp = settings.samples if settings.samples is not None else 1
                renderer.set_param("pixelSamples", spp)
                renderer.commit()

                # Create framebuffer
                width = settings.width or 1920
                height = settings.height or 1080
                framebuffer = osp.FrameBuffer(width, height)
                framebuffer.commit()

                # Render
                framebuffer.render_frame(renderer)

                # Save output
                framebuffer.save(str(output_path))
        except Exception as exc:
            raise RenderError(
                self.display_name,
                f"Python API render failed: {exc}",
            ) from exc

        if not output_path.exists():
            raise RenderError(
                self.display_name,
                f"Output file was not created at {output_path}",
            )

        builder = RenderResultBuilder(
            renderer=self.name,
            scene=scene_path.stem,
            output_path=str(output_path),
            render_time_seconds=timer.result.elapsed_seconds,
            peak_memory_mb=timer.result.peak_memory_mb,
            settings=settings,
            metadata={
                "version": version,
                "integration_path": _IntegrationPath.PYTHON_API.value,
                "renderer_type": renderer_type,
                "gpu_enabled": False,
                "gpu_requested": settings.gpu,
                "baseline_memory_mb": round(timer.result.baseline_memory_mb, 1),
            },
        )
        return builder.build()

    # ------------------------------------------------------------------
    # Command builders
    # ------------------------------------------------------------------

    @staticmethod
    def _build_studio_cmd(
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
        renderer_type: str,
    ) -> list[str]:
        """Build an ospStudio batch rendering command.

        Args:
            scene_path: Path to the scene file.
            output_path: Where to save the rendered image.
            settings: Render configuration.
            renderer_type: OSPRay renderer type.

        Returns:
            Command argument list.
        """
        cmd = [
            _STUDIO_BINARY,
            "--batch",
            "--renderer",
            renderer_type,
            "--image",
            str(output_path),
        ]

        if settings.width is not None and settings.height is not None:
            cmd.extend(["--size", str(settings.width), str(settings.height)])

        if settings.samples is not None:
            cmd.extend(["--spp", str(settings.samples)])

        cmd.append(str(scene_path))
        return cmd

    @staticmethod
    def _build_example_cmd(
        binary: str,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> list[str]:
        """Build a command for ospExamples/ospTutorial.

        These tools have more limited capabilities than ospStudio.

        Args:
            binary: The example tool binary name.
            scene_path: Path to the scene file.
            output_path: Where to save the rendered image.
            settings: Render configuration.

        Returns:
            Command argument list.
        """
        cmd = [binary]

        if settings.width is not None and settings.height is not None:
            cmd.extend(["--osp:num-threads", "1"])  # controlled via env

        cmd.extend(["--image", str(output_path)])
        cmd.append(str(scene_path))
        return cmd


def _register() -> None:
    """Register the OSPRay adapter with the global registry."""
    from renderscope.core.registry import registry

    registry.register(OSPRayAdapter)


_register()
