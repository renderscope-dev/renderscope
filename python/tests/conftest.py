"""Shared test fixtures for the RenderScope test suite."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from renderscope.core.data_loader import clear_cache
from renderscope.core.registry import registry


@pytest.fixture(autouse=True)
def _clear_data_cache() -> None:
    """Clear the renderer data and registry detection cache before each test.

    Ensures test isolation — each test loads data fresh from disk
    and re-runs adapter detection if needed.
    """
    clear_cache()
    registry.clear_cache()


@pytest.fixture()
def sample_renderer_data() -> dict[str, Any]:
    """Minimal valid renderer JSON data for testing."""
    return {
        "id": "test-renderer",
        "name": "Test Renderer",
        "version": "1.0.0",
        "description": "A test renderer for unit testing purposes",
        "long_description": "This is a longer description used for testing the RendererMetadata "
        "model.  It needs to be at least 50 characters long to pass validation.",
        "technique": ["path_tracing"],
        "language": "C++",
        "license": "MIT",
        "platforms": ["linux", "macos", "windows"],
        "gpu_support": False,
        "cpu_support": True,
        "scene_formats": ["obj", "gltf"],
        "output_formats": ["png", "exr"],
        "repository": "https://github.com/test/renderer",
        "first_release": "2020-01-01",
        "status": "active",
        "tags": ["test", "educational"],
        "strengths": ["Easy to test with"],
        "limitations": ["Not a real renderer"],
        "best_for": "Unit testing",
        "features": {
            "global_illumination": True,
            "path_tracing": True,
            "gpu_rendering": False,
        },
    }


@pytest.fixture()
def data_dir() -> Path:
    """Path to the renderer data directory in the monorepo."""
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    data_path = project_root / "data" / "renderers"
    if not data_path.is_dir():
        pytest.skip("Renderer data directory not found — run from monorepo root")
    return data_path
