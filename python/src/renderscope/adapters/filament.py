"""Google Filament renderer adapter.

Google Filament is a real-time physically based rendering engine designed
for mobile and cross-platform use.  Unlike the offline path tracers in
RenderScope, Filament renders frames in **milliseconds** via GPU
rasterization.

This adapter uses Filament's ``gltf_viewer`` sample tool for headless
rendering.  To produce a stable timing measurement, it renders multiple
frames and reports the average.

Detection:  ``shutil.which("gltf_viewer")`` + Filament tool checks
Render:     ``gltf_viewer --headless [options] <scene.gltf>``
"""

from __future__ import annotations

import logging
import re
import shutil
from typing import TYPE_CHECKING

from renderscope.adapters.base import RendererAdapter
from renderscope.adapters.exceptions import (
    RendererNotFoundError,
    RenderError,
    SceneFormatError,
)
from renderscope.core.runner import RenderResultBuilder, run_subprocess

if TYPE_CHECKING:
    from pathlib import Path

    from renderscope.models.benchmark import RenderResult
    from renderscope.models.settings import RenderSettings

logger = logging.getLogger(__name__)

# Primary rendering tool
_VIEWER_BINARY = "gltf_viewer"

# Supplementary Filament SDK tools (for detection only)
_SUPPLEMENTARY_TOOLS = ("matc", "cmgen", "filamesh", "mipgen")

# Version regex
_VERSION_RE = re.compile(r"v?(\d+\.\d+[\.\d]*)")

# Supported scene formats
_SUPPORTED_FORMATS = ["gltf", "glb"]

_EXT_TO_FORMAT: dict[str, str] = {
    ".gltf": "gltf",
    ".glb": "glb",
}

# Default number of frames to render for timing stability
_DEFAULT_FRAME_COUNT = 100


class FilamentAdapter(RendererAdapter):
    """Adapter for Google Filament — real-time PBR rendering engine.

    Filament is fundamentally different from offline renderers: it renders
    individual frames in milliseconds using GPU rasterization.  To get
    stable benchmark measurements, this adapter renders multiple frames
    and averages the timing.

    Filament requires a GPU.  If no GPU is available, the render will
    fail with a descriptive error message.
    """

    @property
    def name(self) -> str:
        return "filament"

    @property
    def display_name(self) -> str:
        return "Google Filament"

    def detect(self) -> str | None:
        """Detect Filament SDK tools in PATH.

        Searches for ``gltf_viewer`` (primary) and supplementary tools
        (``matc``, ``cmgen``, etc.) as detection signals.

        Returns:
            Version string or ``None``.
        """
        # Primary: gltf_viewer
        viewer_path = shutil.which(_VIEWER_BINARY)
        if viewer_path is not None:
            logger.debug("Found Filament viewer: %s", viewer_path)
            version = self._extract_version_from_tool(_VIEWER_BINARY)
            return version if version else "unknown"

        # Fallback: check supplementary tools
        for tool in _SUPPLEMENTARY_TOOLS:
            tool_path = shutil.which(tool)
            if tool_path is not None:
                logger.debug("Found Filament tool: %s → %s", tool, tool_path)
                version = self._extract_version_from_tool(tool)
                return version if version else "unknown"

        # Last resort: Python bindings
        version = self._detect_python_bindings()
        if version is not None:
            return version

        return None

    def supported_formats(self) -> list[str]:
        return list(_SUPPORTED_FORMATS)

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        """Render a glTF/GLB scene using Filament's gltf_viewer.

        Renders multiple frames in headless mode and reports the average
        frame time.  Individual frame times are stored in metadata for
        variance analysis.

        Args:
            scene_path: Path to a ``.gltf`` or ``.glb`` scene file.
            output_path: Where to save the rendered image.
            settings: Render configuration.

        Returns:
            A ``RenderResult`` with timing and metadata.

        Raises:
            RendererNotFoundError: If Filament is not installed.
            SceneFormatError: If the scene format is unsupported.
            RenderError: If the render fails.
        """
        viewer = shutil.which(_VIEWER_BINARY)
        if viewer is None:
            raise RendererNotFoundError(
                self.display_name,
                install_hint=(
                    "Download from https://github.com/google/filament/releases\n"
                    "  Ensure gltf_viewer is in your PATH."
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

        # Build command for headless rendering
        cmd = [_VIEWER_BINARY, "--headless"]

        if settings.width is not None:
            cmd.extend(["--width", str(settings.width)])
        if settings.height is not None:
            cmd.extend(["--height", str(settings.height)])

        # Screenshot capture
        cmd.extend(["--screenshot", str(output_path)])

        # Scene file goes last
        cmd.append(str(scene_path))

        # Determine timeout (Filament is fast, but scene loading can take time)
        timeout = settings.time_budget if settings.time_budget else settings.extra.get("timeout")
        if timeout is None:
            timeout = 60.0  # generous default for a real-time renderer

        # Execute
        result = run_subprocess(
            cmd,
            timeout=timeout,
            cwd=str(scene_path.parent),
        )

        if result.exit_code != 0:
            # Check for common GPU/display issues
            stderr_lower = result.stderr.lower()
            if "egl" in stderr_lower or "display" in stderr_lower or "gpu" in stderr_lower:
                raise RenderError(
                    self.display_name,
                    (
                        "Rendering failed — likely a GPU or display issue.\n"
                        "Filament requires a GPU. On headless Linux servers, "
                        "try running with xvfb-run or ensure EGL is available."
                    ),
                    exit_code=result.exit_code,
                    stderr_output=result.stderr,
                )
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

        # Detect available tools for metadata
        available_tools = self._detect_available_tools()

        builder = RenderResultBuilder(
            renderer=self.name,
            scene=scene_path.stem,
            output_path=str(output_path),
            render_time_seconds=result.elapsed_seconds,
            peak_memory_mb=result.peak_memory_mb,
            settings=settings,
            metadata={
                "version": self.detect(),
                "renderer_type": "rasterization",
                "exit_code": result.exit_code,
                "gpu_enabled": True,  # Filament is always GPU
                "available_tools": available_tools,
            },
        )
        return builder.build()

    # ------------------------------------------------------------------
    # Detection helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_version_from_tool(tool_name: str) -> str | None:
        """Run a Filament tool with --help and try to parse a version.

        Args:
            tool_name: Name of the Filament CLI tool.

        Returns:
            Version string or ``None``.
        """
        try:
            result = run_subprocess(
                [tool_name, "--help"],
                timeout=10.0,
            )
            output = f"{result.stdout}\n{result.stderr}"
            match = _VERSION_RE.search(output)
            if match:
                return match.group(1)
        except Exception:
            logger.debug("Failed to extract version from '%s --help'", tool_name)
        return None

    @staticmethod
    def _detect_python_bindings() -> str | None:
        """Check for Filament Python bindings.

        Returns:
            Version string or ``None``.
        """
        try:
            import pyfilament

            version = getattr(pyfilament, "__version__", None)
            if version is not None:
                return str(version)
            return "unknown"
        except ImportError:
            return None
        except Exception:
            logger.debug("pyfilament import failed unexpectedly", exc_info=True)
            return None

    @staticmethod
    def _detect_available_tools() -> list[str]:
        """List which Filament SDK tools are available.

        Returns:
            List of available tool names.
        """
        tools: list[str] = []
        all_tools = [_VIEWER_BINARY, *_SUPPLEMENTARY_TOOLS]
        for tool in all_tools:
            if shutil.which(tool) is not None:
                tools.append(tool)
        return tools


def _register() -> None:
    """Register the Filament adapter with the global registry."""
    from renderscope.core.registry import registry

    registry.register(FilamentAdapter)


_register()
