"""Custom exceptions for renderer adapter operations.

These exceptions provide structured, actionable error messages when
renderer detection, execution, or scene handling fails.
"""

from __future__ import annotations


class RendererNotFoundError(Exception):
    """Raised when attempting to use a renderer that is not installed.

    Attributes:
        renderer_name: The human-readable renderer name.
        install_hint: Optional installation instructions.
    """

    def __init__(
        self,
        renderer_name: str,
        install_hint: str | None = None,
    ) -> None:
        self.renderer_name = renderer_name
        self.install_hint = install_hint
        parts = [f"{renderer_name} is not installed or not found on this system."]
        if install_hint:
            parts.append(f"\nTo install:\n  {install_hint}")
        parts.append(
            "\nAfter installation, ensure the binary is in your PATH "
            "or the Python package is importable."
        )
        super().__init__("\n".join(parts))


class RenderError(Exception):
    """Raised when a render execution fails.

    Attributes:
        renderer_name: The human-readable renderer name.
        exit_code: Process exit code, if applicable.
        stderr_output: Captured stderr from the renderer process.
    """

    def __init__(
        self,
        renderer_name: str,
        reason: str,
        exit_code: int | None = None,
        stderr_output: str | None = None,
    ) -> None:
        self.renderer_name = renderer_name
        self.exit_code = exit_code
        self.stderr_output = stderr_output
        parts = [f"{renderer_name} render failed: {reason}"]
        if exit_code is not None:
            parts.append(f"Exit code: {exit_code}")
        if stderr_output and stderr_output.strip():
            # Limit output to avoid overwhelming the terminal
            truncated = stderr_output.strip()
            if len(truncated) > 2000:
                truncated = truncated[:2000] + "\n... (truncated)"
            parts.append(f"Renderer output:\n  {truncated}")
        super().__init__("\n".join(parts))


class SceneFormatError(Exception):
    """Raised when a scene file is in an unsupported format.

    Attributes:
        renderer_name: The human-readable renderer name.
        scene_path: Path to the scene file.
        scene_format: Detected format of the scene file.
        supported_formats: Formats the renderer accepts.
    """

    def __init__(
        self,
        renderer_name: str,
        scene_path: str,
        scene_format: str,
        supported_formats: list[str],
    ) -> None:
        self.renderer_name = renderer_name
        self.scene_path = scene_path
        self.scene_format = scene_format
        self.supported_formats = supported_formats
        fmt_list = ", ".join(f".{f}" for f in supported_formats)
        msg = (
            f"{renderer_name} cannot render '.{scene_format}' files.\n"
            f"Scene: {scene_path}\n"
            f"Supported formats for {renderer_name}: {fmt_list}\n\n"
            "Tip: Use 'renderscope list' to see which renderers support your scene format."
        )
        super().__init__(msg)
