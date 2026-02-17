"""Blender Cycles renderer adapter.

Blender Cycles runs inside Blender — it cannot be invoked standalone.
This adapter launches Blender in headless mode (``--background``) with
a generated Python render script that configures Cycles, sets resolution
and sample count, and executes the render.

Detection:  ``shutil.which("blender")`` then ``blender --version``
Render:     ``blender [scene.blend] --background --python <script.py>``
"""

from __future__ import annotations

import logging
import re
import shutil
import tempfile
import textwrap
from pathlib import Path
from typing import TYPE_CHECKING

from renderscope.adapters.base import RendererAdapter
from renderscope.adapters.exceptions import (
    RendererNotFoundError,
    RenderError,
    SceneFormatError,
)
from renderscope.core.runner import RenderResultBuilder, run_subprocess

if TYPE_CHECKING:
    from renderscope.models.benchmark import RenderResult
    from renderscope.models.settings import RenderSettings

logger = logging.getLogger(__name__)

_BINARY_NAMES = ("blender",)

_VERSION_RE = re.compile(r"Blender\s+(\d+\.\d+[\.\d]*)", re.IGNORECASE)

_SUPPORTED_FORMATS = ["blend", "gltf", "glb", "obj", "fbx", "stl", "ply", "abc", "usd"]

_EXT_TO_FORMAT: dict[str, str] = {
    ".blend": "blend",
    ".gltf": "gltf",
    ".glb": "glb",
    ".obj": "obj",
    ".fbx": "fbx",
    ".stl": "stl",
    ".ply": "ply",
    ".abc": "abc",
    ".usd": "usd",
    ".usda": "usd",
    ".usdc": "usd",
    ".usdz": "usd",
}

# Template for the Python script that Blender executes in --background mode.
# All communication with the adapter happens via string-substituted variables
# because Blender's Python is isolated from the system Python.
_RENDER_SCRIPT_TEMPLATE = textwrap.dedent("""\
    # RenderScope — Blender Cycles render script
    # Auto-generated; do not edit.
    import bpy
    import sys
    import os
    import json

    # --- Configuration (injected by adapter) ---
    SCENE_PATH = {scene_path!r}
    OUTPUT_PATH = {output_path!r}
    WIDTH = {width}
    HEIGHT = {height}
    SAMPLES = {samples}
    USE_GPU = {use_gpu}
    IS_BLEND_FILE = {is_blend}

    # --- Import scene if not a .blend file ---
    if not IS_BLEND_FILE:
        ext = os.path.splitext(SCENE_PATH)[1].lower()
        # Clear default scene
        bpy.ops.wm.read_homefile(use_empty=True)
        if ext in ('.gltf', '.glb'):
            bpy.ops.import_scene.gltf(filepath=SCENE_PATH)
        elif ext == '.obj':
            bpy.ops.wm.obj_import(filepath=SCENE_PATH)
        elif ext == '.fbx':
            bpy.ops.import_scene.fbx(filepath=SCENE_PATH)
        elif ext == '.stl':
            bpy.ops.wm.stl_import(filepath=SCENE_PATH)
        elif ext == '.ply':
            bpy.ops.wm.ply_import(filepath=SCENE_PATH)
        elif ext in ('.usd', '.usda', '.usdc', '.usdz'):
            bpy.ops.wm.usd_import(filepath=SCENE_PATH)
        elif ext == '.abc':
            bpy.ops.wm.alembic_import(filepath=SCENE_PATH)
        else:
            print(f"[RenderScope] Unsupported format: {{ext}}", file=sys.stderr)
            sys.exit(1)

    # --- Configure Cycles ---
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.resolution_percentage = 100
    scene.cycles.samples = SAMPLES

    # Output format
    output_ext = os.path.splitext(OUTPUT_PATH)[1].lower()
    if output_ext == '.exr':
        scene.render.image_settings.file_format = 'OPEN_EXR'
        scene.render.image_settings.color_mode = 'RGBA'
        scene.render.image_settings.color_depth = '32'
    elif output_ext == '.png':
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGBA'
        scene.render.image_settings.color_depth = '16'
    else:
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGBA'

    scene.render.filepath = OUTPUT_PATH

    # --- GPU configuration ---
    if USE_GPU:
        prefs = bpy.context.preferences.addons.get('cycles')
        if prefs is not None:
            cprefs = prefs.preferences
            # Try backends in priority order
            for device_type in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
                try:
                    cprefs.compute_device_type = device_type
                    cprefs.get_devices()
                    # Enable all available devices of this type
                    found_device = False
                    for device in cprefs.devices:
                        if device.type == device_type:
                            device.use = True
                            found_device = True
                        elif device.type == 'CPU':
                            device.use = False
                    if found_device:
                        scene.cycles.device = 'GPU'
                        print(f"[RenderScope] GPU: {{device_type}}", file=sys.stderr)
                        break
                except Exception:
                    continue
            else:
                # No GPU backend found; fall back to CPU
                scene.cycles.device = 'CPU'
                print("[RenderScope] GPU not available, using CPU", file=sys.stderr)
        else:
            scene.cycles.device = 'CPU'
    else:
        scene.cycles.device = 'CPU'

    # --- Render ---
    print("[RenderScope] Starting render...", file=sys.stderr)
    bpy.ops.render.render(write_still=True)
    print("[RenderScope] Render complete.", file=sys.stderr)
""")

# ANSI escape code pattern for stripping color from Blender output
_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


class CyclesAdapter(RendererAdapter):
    """Adapter for Blender Cycles — production path tracer in Blender."""

    @property
    def name(self) -> str:
        return "blender-cycles"

    @property
    def display_name(self) -> str:
        return "Blender Cycles"

    def detect(self) -> str | None:
        """Detect Blender binary and return its version.

        Returns:
            The Blender version string (e.g., ``'4.0.2'``) or ``None``.
        """
        binary = self._find_binary()
        if binary is None:
            return None

        try:
            result = run_subprocess(
                [binary, "--version"],
                timeout=15.0,
            )
        except (FileNotFoundError, Exception):
            logger.debug("Failed to run '%s --version'", binary)
            return None

        output = _ANSI_RE.sub("", f"{result.stdout}\n{result.stderr}")
        match = _VERSION_RE.search(output)
        if match:
            return match.group(1)

        logger.debug("Blender found but version not parsed from: %s", output[:200])
        return "unknown"

    def supported_formats(self) -> list[str]:
        return list(_SUPPORTED_FORMATS)

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        """Render a scene using Blender Cycles in headless mode.

        Generates a temporary Python script, launches Blender with
        ``--background --python``, and captures the result.

        Args:
            scene_path: Path to a scene file (Blend, glTF, OBJ, etc.).
            output_path: Where to save the rendered image.
            settings: Render configuration.

        Returns:
            A ``RenderResult`` with timing and metadata.

        Raises:
            RendererNotFoundError: If Blender is not installed.
            SceneFormatError: If the scene format is unsupported.
            RenderError: If the render fails.
        """
        binary = self._find_binary()
        if binary is None:
            raise RendererNotFoundError(
                self.display_name,
                install_hint="Download from https://www.blender.org/download/",
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

        is_blend = ext == ".blend"
        samples = settings.samples if settings.samples is not None else 128

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Generate the render script
        script_content = _RENDER_SCRIPT_TEMPLATE.format(
            scene_path=str(scene_path),
            output_path=str(output_path),
            width=settings.width,
            height=settings.height,
            samples=samples,
            use_gpu=settings.gpu,
            is_blend=is_blend,
        )

        # Write script to temp file (cleaned up in finally)
        script_file = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".py",
                prefix="renderscope_cycles_",
                delete=False,
                encoding="utf-8",
            ) as f:
                f.write(script_content)
                script_file = f.name

            # Build Blender command
            cmd: list[str] = [binary]
            if is_blend:
                cmd.append(str(scene_path))
            cmd.extend(["--background", "--python", script_file])

            # Determine timeout
            timeout = (
                settings.time_budget if settings.time_budget else settings.extra.get("timeout")
            )

            # Execute
            result = run_subprocess(cmd, timeout=timeout)

            # Strip ANSI codes from output
            stderr_clean = _ANSI_RE.sub("", result.stderr)

            # Check for render success
            # Blender exit code 0 doesn't guarantee success — verify output
            if result.exit_code != 0:
                raise RenderError(
                    self.display_name,
                    "Non-zero exit code",
                    exit_code=result.exit_code,
                    stderr_output=stderr_clean,
                )

            if not output_path.exists() or output_path.stat().st_size == 0:
                raise RenderError(
                    self.display_name,
                    f"Output file was not created or is empty: {output_path}",
                    stderr_output=stderr_clean,
                )

            # Detect GPU backend from script output
            gpu_backend = "CPU"
            for line in stderr_clean.splitlines():
                if "[RenderScope] GPU:" in line:
                    gpu_backend = line.split("GPU:")[-1].strip()
                    break
                if "GPU not available" in line:
                    gpu_backend = "CPU (fallback)"
                    break

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
                    "blender_version": self.detect(),
                    "exit_code": result.exit_code,
                    "gpu_backend": gpu_backend,
                    "gpu_enabled": settings.gpu,
                    "samples": samples,
                    "is_blend_file": is_blend,
                },
            )
            return builder.build()

        finally:
            # Clean up temp script
            if script_file is not None:
                try:
                    Path(script_file).unlink(missing_ok=True)
                except OSError:
                    logger.debug("Failed to clean up temp script: %s", script_file)

    def _find_binary(self) -> str | None:
        """Search PATH for the Blender binary.

        Returns:
            The binary name or ``None``.
        """
        for name in _BINARY_NAMES:
            path = shutil.which(name)
            if path is not None:
                logger.debug("Found Blender binary: %s → %s", name, path)
                return name
        return None


def _register() -> None:
    """Register the Cycles adapter with the global registry."""
    from renderscope.core.registry import registry

    registry.register(CyclesAdapter)


_register()
