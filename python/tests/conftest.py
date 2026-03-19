"""Shared test fixtures for the RenderScope test suite."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from typer.testing import CliRunner

from renderscope.core.data_loader import clear_cache
from renderscope.core.registry import registry
from renderscope.models.benchmark import BenchmarkResult, RenderResult
from renderscope.models.hardware import HardwareInfo
from renderscope.models.settings import RenderSettings

# ---------------------------------------------------------------------------
# Cache isolation (autouse)
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _clear_data_cache() -> None:
    """Clear the renderer data and registry detection cache before each test.

    Ensures test isolation — each test loads data fresh from disk
    and re-runs adapter detection if needed.
    """
    clear_cache()
    registry.clear_cache()


# ---------------------------------------------------------------------------
# Data fixtures
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Model fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def sample_hardware_info() -> HardwareInfo:
    """A realistic ``HardwareInfo`` instance."""
    return HardwareInfo(
        cpu="AMD Ryzen 9 7950X",
        cpu_cores_physical=16,
        cpu_cores_logical=32,
        ram_gb=64.0,
        gpu="NVIDIA GeForce RTX 4090",
        gpu_vram_gb=24.0,
        os="Ubuntu 22.04",
        python_version="3.12.1",
        renderscope_version="0.1.0",
    )


@pytest.fixture()
def sample_render_settings() -> RenderSettings:
    """Standard render settings for tests."""
    return RenderSettings(
        width=1920,
        height=1080,
        samples=256,
        gpu=False,
    )


@pytest.fixture()
def sample_render_result(
    sample_hardware_info: HardwareInfo,
    sample_render_settings: RenderSettings,
) -> RenderResult:
    """A complete ``RenderResult`` instance."""
    return RenderResult(
        renderer="pbrt",
        scene="cornell_box",
        output_path="/tmp/render.exr",
        render_time_seconds=47.3,
        peak_memory_mb=1240.0,
        settings=sample_render_settings,
        hardware=sample_hardware_info,
        timestamp="2025-01-15T14:30:00Z",
        metadata={"version": "4.0.0"},
    )


@pytest.fixture()
def sample_benchmark_results(
    sample_hardware_info: HardwareInfo,
    sample_render_settings: RenderSettings,
) -> list[BenchmarkResult]:
    """A list of ``BenchmarkResult`` models for testing report generation."""
    results = []
    for renderer in ("pbrt", "mitsuba3"):
        render_result = RenderResult(
            renderer=renderer,
            scene="cornell_box",
            output_path=f"/tmp/{renderer}_render.exr",
            render_time_seconds=34.2 if renderer == "pbrt" else 45.7,
            peak_memory_mb=1228.8 if renderer == "pbrt" else 956.3,
            settings=sample_render_settings,
            hardware=sample_hardware_info,
            timestamp="2025-01-15T14:30:00Z",
        )
        results.append(
            BenchmarkResult(
                id=f"cornell-box-{renderer}-2025-01-15",
                renderer=renderer,
                renderer_version="4.0.0" if renderer == "pbrt" else "3.5.0",
                scene="cornell_box",
                timestamp="2025-01-15T14:30:00Z",
                hardware=sample_hardware_info,
                settings=sample_render_settings,
                results=render_result,
            )
        )
    return results


# ---------------------------------------------------------------------------
# Image fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def test_images_dir() -> Path:
    """Path to the pre-generated test images directory."""
    images_dir = Path(__file__).parent / "test_images"
    if not images_dir.is_dir():
        pytest.skip("Test images not found — run generate_test_images.py first")
    return images_dir


@pytest.fixture()
def identical_image_pair() -> tuple[np.ndarray, np.ndarray]:
    """A pair of identical 64x64 float32 RGB arrays."""
    rng = np.random.default_rng(42)
    img = rng.random((64, 64, 3)).astype(np.float32)
    return img, img.copy()


@pytest.fixture()
def different_image_pair() -> tuple[np.ndarray, np.ndarray]:
    """A pair of completely different 64x64 float32 RGB arrays."""
    rng_a = np.random.default_rng(42)
    rng_b = np.random.default_rng(7)
    a = rng_a.random((64, 64, 3)).astype(np.float32)
    b = rng_b.random((64, 64, 3)).astype(np.float32)
    return a, b


@pytest.fixture()
def noisy_image_pair() -> tuple[np.ndarray, np.ndarray]:
    """A (reference, noisy) pair of 64x64 float32 RGB arrays."""
    rng = np.random.default_rng(42)
    ref = rng.random((64, 64, 3)).astype(np.float32)
    noise = np.random.default_rng(99).normal(0.0, 0.02, size=ref.shape).astype(np.float32)
    noisy = np.clip(ref + noise, 0.0, 1.0).astype(np.float32)
    return ref, noisy


# ---------------------------------------------------------------------------
# Temporary directory fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def tmp_output_dir(tmp_path: Path) -> Path:
    """A temporary directory for test outputs."""
    out = tmp_path / "output"
    out.mkdir()
    return out


# ---------------------------------------------------------------------------
# Adapter fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def mock_adapter() -> Any:
    """An instance of the MockRendererAdapter."""
    from renderscope.adapters.mock import MockRendererAdapter

    return MockRendererAdapter(sleep_seconds=0.0)


# ---------------------------------------------------------------------------
# CLI fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def cli_runner() -> CliRunner:
    """A Typer CliRunner instance for testing CLI commands."""
    return CliRunner()


# ---------------------------------------------------------------------------
# Results JSON fixture
# ---------------------------------------------------------------------------


@pytest.fixture()
def sample_results_json(
    tmp_path: Path,
    sample_benchmark_results: list[BenchmarkResult],
) -> Path:
    """Write benchmark results to a temp JSON file and return the path."""
    output = tmp_path / "results.json"
    data = [r.model_dump() for r in sample_benchmark_results]
    output.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    return output
