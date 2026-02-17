"""Shared Rich console instance and theme for consistent CLI output styling.

Every CLI command module imports ``console`` from this module to ensure
uniform colors, formatting, and error output across the entire tool.
"""

from __future__ import annotations

from rich.console import Console
from rich.theme import Theme

# Technique-to-color mapping used in tables, badges, and status output.
# These are intentionally bright for dark terminal backgrounds.
TECHNIQUE_COLORS: dict[str, str] = {
    "path_tracing": "bright_blue",
    "ray_tracing": "bright_blue",
    "rasterization": "bright_green",
    "neural": "bright_magenta",
    "gaussian_splatting": "magenta",
    "differentiable": "bright_yellow",
    "volume_rendering": "bright_cyan",
    "hybrid": "white",
}

STATUS_COLORS: dict[str, str] = {
    "active": "green",
    "maintenance": "yellow",
    "inactive": "dim",
    "archived": "dim",
    "deprecated": "red dim",
}

RENDERSCOPE_THEME = Theme(
    {
        "info": "cyan",
        "success": "green",
        "warning": "yellow",
        "error": "red bold",
        "accent": "bright_magenta",
        "muted": "dim",
        "technique.path_tracing": "bright_blue",
        "technique.ray_tracing": "bright_blue",
        "technique.rasterization": "bright_green",
        "technique.neural": "bright_magenta",
        "technique.gaussian_splatting": "magenta",
        "technique.differentiable": "bright_yellow",
        "technique.volume_rendering": "bright_cyan",
        "technique.hybrid": "white",
        "status.active": "green",
        "status.maintenance": "yellow",
        "status.inactive": "dim",
        "status.archived": "dim",
        "status.deprecated": "red dim",
    }
)

console = Console(theme=RENDERSCOPE_THEME)
err_console = Console(theme=RENDERSCOPE_THEME, stderr=True)


def get_technique_style(technique: str) -> str:
    """Return the Rich style string for a rendering technique."""
    return TECHNIQUE_COLORS.get(technique, "white")


def get_status_style(status: str) -> str:
    """Return the Rich style string for a project status."""
    return STATUS_COLORS.get(status, "white")


def format_technique(technique: str) -> str:
    """Return a human-readable label for a technique slug."""
    labels: dict[str, str] = {
        "path_tracing": "Path Tracing",
        "ray_tracing": "Ray Tracing",
        "rasterization": "Rasterization",
        "neural": "Neural",
        "gaussian_splatting": "Gaussian Splatting",
        "differentiable": "Differentiable",
        "volume_rendering": "Volume Rendering",
        "hybrid": "Hybrid",
    }
    return labels.get(technique, technique.replace("_", " ").title())
