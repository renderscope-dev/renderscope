"""PBRT v4 renderer adapter.

PBRT v4 is a standalone CLI binary that reads ``.pbrt`` scene files and
writes rendered output (typically EXR).  This adapter detects the binary
in PATH, parses its version string, and executes renders via subprocess.

Detection:  ``shutil.which("pbrt")`` then ``pbrt --version``
Render:     ``pbrt --outfile <output> [options] <scene.pbrt>``
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
_BINARY_NAMES = ("pbrt", "pbrt-v4", "pbrt4")

# Version string patterns
_VERSION_RE = re.compile(r"pbrt\s+version\s+(\d+[\.\d]*)", re.IGNORECASE)
_VERSION_FALLBACK_RE = re.compile(r"v?(\d+\.\d+[\.\d]*)")


class PBRTAdapter(RendererAdapter):
    """Adapter for PBRT v4 — the reference physically-based renderer."""

    @property
    def name(self) -> str:
        return "pbrt"

    @property
    def display_name(self) -> str:
        return "PBRT v4"

    def detect(self) -> str | None:
        """Detect PBRT binary in PATH and extract version.

        Searches for ``pbrt``, ``pbrt-v4``, and ``pbrt4`` in that order.
        Runs ``pbrt --version`` to extract the version string.

        Returns:
            Version string (e.g., ``'4.0.0'``) or ``None``.
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
            return None

        # Parse version from combined output
        output = f"{result.stdout}\n{result.stderr}"
        match = _VERSION_RE.search(output)
        if match:
            return match.group(1)

        # Fallback: look for any version-like pattern
        match = _VERSION_FALLBACK_RE.search(output)
        if match:
            return match.group(1)

        # Last resort: binary exists but version unknown
        logger.debug("PBRT binary found but version could not be parsed from: %s", output[:200])
        return "unknown"

    def supported_formats(self) -> list[str]:
        return ["pbrt"]

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        """Render a PBRT scene file.

        Args:
            scene_path: Path to a ``.pbrt`` scene file.
            output_path: Where to write the rendered image (EXR preferred).
            settings: Render configuration.

        Returns:
            A ``RenderResult`` with timing and metadata.

        Raises:
            RendererNotFoundError: If PBRT is not installed.
            SceneFormatError: If the scene is not a ``.pbrt`` file.
            RenderError: If the render fails.
        """
        binary = self._find_binary()
        if binary is None:
            raise RendererNotFoundError(
                self.display_name,
                install_hint=(
                    "git clone --recursive https://github.com/mmp/pbrt-v4\n"
                    "  cd pbrt-v4 && cmake -B build && cmake --build build"
                ),
            )

        # Validate scene format
        suffix = scene_path.suffix.lstrip(".")
        if suffix != "pbrt":
            raise SceneFormatError(
                self.display_name,
                str(scene_path),
                suffix,
                self.supported_formats(),
            )

        if not scene_path.exists():
            raise RenderError(
                self.display_name,
                f"Scene file not found: {scene_path}",
            )

        # Build command
        cmd = [binary, "--outfile", str(output_path)]

        # PBRT v4 CLI options
        if settings.samples is not None:
            cmd.extend(["--spp", str(settings.samples)])
        if settings.threads is not None:
            cmd.extend(["--nthreads", str(settings.threads)])
        if settings.gpu:
            cmd.append("--gpu")

        cmd.append(str(scene_path))

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

        # Verify output was created
        actual_output = output_path
        if not actual_output.exists():
            # PBRT may have changed the extension based on Film config
            for candidate_ext in (".exr", ".png"):
                candidate = output_path.with_suffix(candidate_ext)
                if candidate.exists():
                    actual_output = candidate
                    break
            else:
                raise RenderError(
                    self.display_name,
                    f"Output file was not created at {output_path}",
                    stderr_output=result.stderr,
                )

        # Build result
        builder = RenderResultBuilder(
            renderer=self.name,
            scene=scene_path.stem,
            output_path=str(actual_output),
            render_time_seconds=result.elapsed_seconds,
            peak_memory_mb=result.peak_memory_mb,
            settings=settings,
            metadata={
                "binary": binary,
                "version": self.detect(),
                "exit_code": result.exit_code,
                "gpu_enabled": settings.gpu,
            },
        )
        return builder.build()

    def _find_binary(self) -> str | None:
        """Search PATH for a PBRT binary.

        Returns:
            The binary name (suitable for subprocess) or ``None``.
        """
        for name in _BINARY_NAMES:
            path = shutil.which(name)
            if path is not None:
                logger.debug("Found PBRT binary: %s → %s", name, path)
                return name
        return None


def _register() -> None:
    """Register the PBRT adapter with the global registry."""
    from renderscope.core.registry import registry

    registry.register(PBRTAdapter)


_register()
