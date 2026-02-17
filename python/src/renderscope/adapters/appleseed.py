"""appleseed renderer adapter.

appleseed is a production-quality, physically based global illumination
renderer with Disney material model support.  It is a CLI-based renderer
that uses its own ``.appleseed`` XML scene format.

This adapter detects the ``appleseed.cli`` binary in PATH and executes
renders via subprocess.  appleseed is **CPU-only** — GPU rendering is
not available.

Detection:  ``shutil.which("appleseed.cli")`` then ``appleseed.cli --version``
Render:     ``appleseed.cli <scene> --output <output> [options]``
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

# Binary names to search, in priority order
_BINARY_NAMES = ("appleseed.cli", "appleseed")

# Supplementary tools (for detection info, not required)
_STUDIO_BINARY = "appleseed.studio"

# Version regex: e.g. "appleseed.cli version 2.1.0-beta"
_VERSION_RE = re.compile(r"version\s+(\S+)", re.IGNORECASE)
_VERSION_FALLBACK_RE = re.compile(r"v?(\d+\.\d+[\.\d]*(?:-\w+)?)")

# Supported formats
_SUPPORTED_FORMATS = ["appleseed"]

_EXT_TO_FORMAT: dict[str, str] = {
    ".appleseed": "appleseed",
}


class AppleseedAdapter(RendererAdapter):
    """Adapter for appleseed — production path tracer with Disney materials.

    appleseed is a CPU-only renderer.  If ``settings.gpu`` is ``True``,
    a warning is logged and rendering proceeds on CPU.
    """

    @property
    def name(self) -> str:
        return "appleseed"

    @property
    def display_name(self) -> str:
        return "appleseed"

    def detect(self) -> str | None:
        """Detect the appleseed CLI binary and extract version.

        Searches for ``appleseed.cli`` and ``appleseed`` in PATH, then
        runs ``--version`` to parse the version string.

        Returns:
            Version string (e.g., ``'2.1.0-beta'``) or ``None``.
        """
        binary = self._find_binary()
        if binary is None:
            return None

        try:
            result = run_subprocess(
                [binary, "--version"],
                timeout=10.0,
            )
        except (FileNotFoundError, Exception):
            logger.debug("Failed to run '%s --version'", binary)
            # Binary found but version extraction failed
            return "unknown"

        output = f"{result.stdout}\n{result.stderr}"
        match = _VERSION_RE.search(output)
        if match:
            return match.group(1)

        match = _VERSION_FALLBACK_RE.search(output)
        if match:
            return match.group(1)

        logger.debug("appleseed binary found but version not parsed from: %s", output[:200])
        return "unknown"

    def supported_formats(self) -> list[str]:
        return list(_SUPPORTED_FORMATS)

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        """Render an appleseed scene file.

        Args:
            scene_path: Path to a ``.appleseed`` scene file.
            output_path: Where to write the rendered image (EXR preferred).
            settings: Render configuration.

        Returns:
            A ``RenderResult`` with timing and metadata.

        Raises:
            RendererNotFoundError: If appleseed is not installed.
            SceneFormatError: If the scene format is unsupported.
            RenderError: If the render fails.
        """
        binary = self._find_binary()
        if binary is None:
            raise RendererNotFoundError(
                self.display_name,
                install_hint=(
                    "Download from https://github.com/appleseedhq/appleseed/releases\n"
                    "  Ensure appleseed.cli is in your PATH."
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

        # Warn about GPU — appleseed is CPU-only
        if settings.gpu:
            logger.warning("appleseed is CPU-only; ignoring gpu=True and rendering on CPU.")

        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Build command
        cmd = [binary, str(scene_path), "--output", str(output_path)]

        if settings.width is not None and settings.height is not None:
            cmd.extend(["--resolution", str(settings.width), str(settings.height)])

        if settings.threads is not None:
            cmd.extend(["--threads", str(settings.threads)])

        # Determine timeout
        timeout = settings.time_budget if settings.time_budget else settings.extra.get("timeout")

        # Execute
        result = run_subprocess(
            cmd,
            timeout=timeout,
            cwd=str(scene_path.parent),
        )

        if result.exit_code != 0:
            raise RenderError(
                self.display_name,
                "Non-zero exit code",
                exit_code=result.exit_code,
                stderr_output=result.stderr,
            )

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RenderError(
                self.display_name,
                f"Output file was not created or is empty: {output_path}",
                stderr_output=result.stderr,
            )

        # Check for supplementary tools
        has_studio = shutil.which(_STUDIO_BINARY) is not None

        # Build result
        builder = RenderResultBuilder(
            renderer=self.name,
            scene=scene_path.stem,
            output_path=str(output_path),
            render_time_seconds=result.elapsed_seconds,
            peak_memory_mb=result.peak_memory_mb,
            settings=settings,
            metadata={
                "binary": binary,
                "version": self.detect(),
                "exit_code": result.exit_code,
                "gpu_enabled": False,  # always CPU
                "gpu_requested": settings.gpu,
                "has_studio": has_studio,
            },
        )
        return builder.build()

    @staticmethod
    def _find_binary() -> str | None:
        """Search PATH for the appleseed CLI binary.

        Returns:
            The binary name or ``None``.
        """
        for name in _BINARY_NAMES:
            path = shutil.which(name)
            if path is not None:
                logger.debug("Found appleseed binary: %s → %s", name, path)
                return name
        return None


def _register() -> None:
    """Register the appleseed adapter with the global registry."""
    from renderscope.core.registry import registry

    registry.register(AppleseedAdapter)


_register()
