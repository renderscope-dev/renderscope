"""LuxCoreRender adapter.

LuxCoreRender is a physically based, unbiased rendering engine with OpenCL
and CUDA GPU acceleration.  It has both a Python API (``pyluxcore``) and
CLI tools (``luxcoreconsole``).

This adapter uses a **dual-path** integration strategy:

- **Python API (preferred):** ``import pyluxcore`` for in-process rendering
  with ``InProcessTimer`` timing.
- **CLI fallback:** ``luxcoreconsole`` subprocess when the Python module
  is not available.

Detection:  ``import pyluxcore`` → ``shutil.which("luxcoreconsole")``
Render:     ``pyluxcore.RenderSession`` or ``luxcoreconsole --scene ...``
"""

from __future__ import annotations

import logging
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

# Binary names to search, in priority order
_BINARY_NAMES = ("luxcoreconsole", "luxcoreui")

# Version regex patterns
_VERSION_RE = re.compile(r"v?(\d+\.\d+[\.\d]*)")

# Supported scene file extensions
_SUPPORTED_FORMATS = ["lxs", "cfg", "scn"]

_EXT_TO_FORMAT: dict[str, str] = {
    ".lxs": "lxs",
    ".cfg": "cfg",
    ".scn": "scn",
}

# GPU engine names in LuxCore
_GPU_ENGINES = ("PATHOCL", "PATHCUDA")
_CPU_ENGINE = "PATHCPU"


@unique
class _IntegrationPath(Enum):
    """How the adapter communicates with LuxCoreRender."""

    PYTHON_API = "python_api"
    CLI = "cli"


class LuxCoreAdapter(RendererAdapter):
    """Adapter for LuxCoreRender — physically based unbiased path tracer.

    Supports dual integration: Python API (``pyluxcore``) for in-process
    rendering with tighter control, and CLI (``luxcoreconsole``) as a
    fallback for maximum compatibility.
    """

    def __init__(self) -> None:
        self._integration_path: _IntegrationPath | None = None
        self._detected_version: str | None = None
        self._cli_binary: str | None = None

    @property
    def name(self) -> str:
        return "luxcore"

    @property
    def display_name(self) -> str:
        return "LuxCoreRender"

    def detect(self) -> str | None:
        """Detect LuxCoreRender via Python API or CLI binary.

        Tries ``pyluxcore`` import first, then falls back to searching
        for ``luxcoreconsole`` / ``luxcoreui`` in PATH.

        Returns:
            Version string (e.g., ``'2.6'``) or ``None``.
        """
        # Path 1: Python API
        version = self._detect_python_api()
        if version is not None:
            self._integration_path = _IntegrationPath.PYTHON_API
            self._detected_version = version
            logger.debug("LuxCore detected via Python API: %s", version)
            return version

        # Path 2: CLI binary
        version = self._detect_cli()
        if version is not None:
            self._integration_path = _IntegrationPath.CLI
            self._detected_version = version
            logger.debug("LuxCore detected via CLI (%s): %s", self._cli_binary, version)
            return version

        logger.debug("LuxCoreRender not found (neither pyluxcore nor CLI)")
        return None

    def supported_formats(self) -> list[str]:
        return list(_SUPPORTED_FORMATS)

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        """Render a scene using LuxCoreRender.

        Uses the Python API when ``pyluxcore`` is available, otherwise
        falls back to the ``luxcoreconsole`` CLI.

        Args:
            scene_path: Path to a ``.lxs``, ``.cfg``, or ``.scn`` scene file.
            output_path: Where to write the rendered image.
            settings: Render configuration.

        Returns:
            A ``RenderResult`` with timing and metadata.

        Raises:
            RendererNotFoundError: If LuxCoreRender is not installed.
            SceneFormatError: If the scene format is unsupported.
            RenderError: If the render fails.
        """
        version = self.detect()
        if version is None:
            raise RendererNotFoundError(
                self.display_name,
                install_hint=(
                    "pip install pyluxcore\n  or download from https://luxcorerender.org/download/"
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

        if self._integration_path == _IntegrationPath.PYTHON_API:
            return self._render_python_api(scene_path, output_path, settings, version)
        return self._render_cli(scene_path, output_path, settings, version)

    # ------------------------------------------------------------------
    # Detection helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_python_api() -> str | None:
        """Try to import pyluxcore and extract its version.

        Returns:
            Version string or ``None``.
        """
        try:
            import pyluxcore

            version_fn = getattr(pyluxcore, "Version", None)
            if callable(version_fn):
                raw = str(version_fn())
                match = _VERSION_RE.search(raw)
                return match.group(1) if match else raw

            version_attr = getattr(pyluxcore, "__version__", None)
            if version_attr is not None:
                return str(version_attr)

            return "unknown"
        except ImportError:
            return None
        except Exception:
            logger.debug("pyluxcore import failed unexpectedly", exc_info=True)
            return None

    def _detect_cli(self) -> str | None:
        """Search PATH for a LuxCore CLI binary and extract version.

        Returns:
            Version string or ``None``.
        """
        binary = self._find_binary()
        if binary is None:
            return None

        self._cli_binary = binary

        # Try to get version from help output
        try:
            result = run_subprocess(
                [binary, "--help"],
                timeout=10.0,
            )
            output = f"{result.stdout}\n{result.stderr}"
            match = _VERSION_RE.search(output)
            if match:
                return match.group(1)
        except Exception:
            logger.debug("Failed to extract version from '%s --help'", binary)

        # Binary found but version unknown
        return "unknown"

    @staticmethod
    def _find_binary() -> str | None:
        """Search PATH for a LuxCore CLI binary.

        Returns:
            The binary name or ``None``.
        """
        for name in _BINARY_NAMES:
            path = shutil.which(name)
            if path is not None:
                logger.debug("Found LuxCore binary: %s → %s", name, path)
                return name
        return None

    # ------------------------------------------------------------------
    # Render execution
    # ------------------------------------------------------------------

    def _render_python_api(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
        version: str,
    ) -> RenderResult:
        """Render using the pyluxcore Python API.

        Args:
            scene_path: Path to the scene file.
            output_path: Where to save the rendered image.
            settings: Render configuration.
            version: Detected version string.

        Returns:
            A ``RenderResult``.

        Raises:
            RenderError: If the render fails.
        """
        try:
            import pyluxcore
        except ImportError as exc:
            raise RendererNotFoundError(
                self.display_name,
                install_hint="pip install pyluxcore",
            ) from exc

        logger.info("Rendering via pyluxcore Python API")

        # Build properties string for LuxCore config
        props = pyluxcore.Properties()
        props.SetFromFile(str(scene_path))

        # Apply settings overrides
        if settings.width and settings.height:
            props.Set(pyluxcore.Property("film.width", settings.width))
            props.Set(pyluxcore.Property("film.height", settings.height))

        if settings.samples is not None:
            props.Set(pyluxcore.Property("batch.haltspp", settings.samples))

        if settings.time_budget is not None:
            props.Set(pyluxcore.Property("batch.halttime", int(settings.time_budget)))

        # Engine selection
        engine = _CPU_ENGINE
        if settings.gpu:
            # Try GPU engines in order
            for gpu_engine in _GPU_ENGINES:
                engine = gpu_engine
                break
            logger.info("LuxCore GPU engine: %s", engine)
        props.Set(pyluxcore.Property("renderengine.type", engine))

        try:
            config = pyluxcore.RenderConfig(props)
            session = pyluxcore.RenderSession(config)
        except Exception as exc:
            raise RenderError(
                self.display_name,
                f"Failed to create render session: {exc}",
            ) from exc

        timer = InProcessTimer()
        try:
            with timer:
                session.Start()

                # Wait for completion
                if settings.time_budget is not None:
                    import time

                    time.sleep(settings.time_budget)
                    session.Stop()
                else:
                    session.WaitForDone()

            # Save output
            session.GetFilm().Save()
            # Also try direct output path save
            session.GetFilm().SaveOutput(
                str(output_path),
                pyluxcore.FilmOutputType.RGB_IMAGEPIPELINE,
            )
        except Exception as exc:
            raise RenderError(
                self.display_name,
                f"Render execution failed: {exc}",
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
                "engine": engine,
                "gpu_enabled": settings.gpu,
                "baseline_memory_mb": round(timer.result.baseline_memory_mb, 1),
            },
        )
        return builder.build()

    def _render_cli(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
        version: str,
    ) -> RenderResult:
        """Render using the luxcoreconsole CLI binary.

        Args:
            scene_path: Path to the scene file.
            output_path: Where to save the rendered image.
            settings: Render configuration.
            version: Detected version string.

        Returns:
            A ``RenderResult``.

        Raises:
            RenderError: If the render fails.
        """
        binary = self._cli_binary or "luxcoreconsole"
        logger.info("Rendering via CLI: %s", binary)

        cmd = [binary, "--scene", str(scene_path), "--film-output", str(output_path)]

        if settings.width and settings.height:
            cmd.extend(["--film-width", str(settings.width)])
            cmd.extend(["--film-height", str(settings.height)])

        if settings.samples is not None:
            cmd.extend(["--halt-spp", str(settings.samples)])

        if settings.time_budget is not None:
            cmd.extend(["--halt-time", str(int(settings.time_budget))])

        timeout = settings.time_budget if settings.time_budget else settings.extra.get("timeout")

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
                "integration_path": _IntegrationPath.CLI.value,
                "exit_code": result.exit_code,
                "gpu_enabled": settings.gpu,
            },
        )
        return builder.build()


def _register() -> None:
    """Register the LuxCore adapter with the global registry."""
    from renderscope.core.registry import registry

    registry.register(LuxCoreAdapter)


_register()
