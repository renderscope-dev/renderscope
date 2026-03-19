"""Integration tests for the benchmark pipeline with the mock adapter.

Uses ``MockRendererAdapter`` to exercise the programmatic benchmark workflow
without requiring any real renderer to be installed.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from renderscope.adapters.mock import MockRendererAdapter
from renderscope.models.settings import RenderSettings

pytestmark = pytest.mark.integration


class TestMockBenchmarkRun:
    """Tests that exercise the mock adapter through the render workflow."""

    def test_mock_render_produces_result(self, tmp_path: Path) -> None:
        """A full mock render should produce a valid RenderResult."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        scene = tmp_path / "scene.pbrt"
        scene.write_text("# mock scene", encoding="utf-8")
        output = tmp_path / "output.png"

        settings = RenderSettings(width=64, height=64, samples=16)
        result = adapter.render(scene, output, settings)

        assert result.renderer == "mock"
        assert result.render_time_seconds >= 0
        assert result.hardware is not None
        assert result.timestamp != ""
        assert output.is_file()
        assert output.stat().st_size > 0

    def test_mock_render_respects_scene_name(self, tmp_path: Path) -> None:
        """The result should capture the scene stem as the scene name."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        scene = tmp_path / "cornell_box.obj"
        scene.write_text("# mock scene", encoding="utf-8")
        output = tmp_path / "render.png"

        result = adapter.render(scene, output, RenderSettings(width=8, height=8))
        assert result.scene == "cornell_box"

    def test_mock_render_result_serializable(self, tmp_path: Path) -> None:
        """RenderResult should serialize to dict without errors."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        scene = tmp_path / "scene.pbrt"
        scene.write_text("# mock", encoding="utf-8")
        output = tmp_path / "render.png"

        result = adapter.render(scene, output, RenderSettings(width=8, height=8))
        data = result.model_dump(mode="json")

        assert isinstance(data, dict)
        assert data["renderer"] == "mock"
        assert isinstance(data["render_time_seconds"], (int, float))

    def test_multiple_renders_independent(self, tmp_path: Path) -> None:
        """Multiple renders should produce independent results."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        scene = tmp_path / "scene.pbrt"
        scene.write_text("# mock", encoding="utf-8")

        results = []
        for i in range(3):
            output = tmp_path / f"output_{i}.png"
            result = adapter.render(scene, output, RenderSettings(width=8, height=8))
            results.append(result)

        assert len(results) == 3
        for result in results:
            assert result.renderer == "mock"

    def test_mock_adapter_supports_various_formats(self, tmp_path: Path) -> None:
        """Mock adapter should accept all its supported formats."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        formats = adapter.supported_formats()

        for fmt in formats:
            scene = tmp_path / f"scene.{fmt}"
            scene.write_text(f"# mock {fmt}", encoding="utf-8")
            output = tmp_path / f"output_{fmt}.png"
            result = adapter.render(scene, output, RenderSettings(width=8, height=8))
            assert result.renderer == "mock"
            assert output.is_file()


class TestBenchmarkResultSaving:
    """Tests for saving benchmark results to JSON."""

    def test_save_and_reload(self, tmp_path: Path) -> None:
        """Benchmark results saved as JSON should be loadable."""
        import json

        from renderscope.models.benchmark import BenchmarkResult
        from renderscope.utils.hardware import detect_hardware

        adapter = MockRendererAdapter(sleep_seconds=0.0)
        scene = tmp_path / "scene.pbrt"
        scene.write_text("# mock", encoding="utf-8")
        output = tmp_path / "render.png"

        render_result = adapter.render(scene, output, RenderSettings(width=8, height=8))
        hardware = detect_hardware()

        benchmark = BenchmarkResult(
            id="test-mock-2025-01-01",
            renderer="mock",
            renderer_version="1.0.0",
            scene="test_scene",
            timestamp="2025-01-01T00:00:00Z",
            hardware=hardware,
            settings=RenderSettings(width=8, height=8),
            results=render_result,
        )

        output_json = tmp_path / "results.json"
        data = [benchmark.model_dump(mode="json")]
        output_json.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

        loaded = json.loads(output_json.read_text(encoding="utf-8"))
        assert len(loaded) == 1
        assert loaded[0]["renderer"] == "mock"
        assert loaded[0]["scene"] == "test_scene"
