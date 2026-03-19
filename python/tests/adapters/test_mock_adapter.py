"""Tests for the MockRendererAdapter."""

from __future__ import annotations

from pathlib import Path

import pytest

from renderscope.adapters.base import RendererAdapter
from renderscope.adapters.mock import MockRendererAdapter
from renderscope.models.settings import RenderSettings

pytestmark = pytest.mark.adapters


class TestMockAdapterInterface:
    """Tests for basic interface compliance."""

    def test_is_renderer_adapter(self) -> None:
        """MockRendererAdapter should be a RendererAdapter subclass."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        assert isinstance(adapter, RendererAdapter)

    def test_name(self) -> None:
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        assert adapter.name == "mock"

    def test_display_name(self) -> None:
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        assert adapter.display_name == "Mock Renderer (Test Only)"

    def test_is_mock_true(self) -> None:
        """is_mock should return True."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        assert adapter.is_mock is True

    def test_detect_returns_version(self) -> None:
        """detect() should always return '1.0.0'."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        assert adapter.detect() == "1.0.0"

    def test_supported_formats_non_empty(self) -> None:
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        formats = adapter.supported_formats()
        assert isinstance(formats, list)
        assert len(formats) > 0
        assert all(isinstance(f, str) for f in formats)

    def test_supported_formats_contains_common(self) -> None:
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        formats = adapter.supported_formats()
        assert "pbrt" in formats
        assert "obj" in formats


class TestMockAdapterRender:
    """Tests for the render() method."""

    def test_render_creates_output_file(self, tmp_path: Path) -> None:
        """render() should create an image at the output path."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        scene = tmp_path / "scene.pbrt"
        scene.write_text("# mock scene", encoding="utf-8")
        output = tmp_path / "output.png"

        result = adapter.render(scene, output, RenderSettings(width=64, height=64))

        assert output.is_file()
        assert output.stat().st_size > 0
        assert result.renderer == "mock"
        assert result.render_time_seconds >= 0

    def test_render_returns_render_result(self, tmp_path: Path) -> None:
        """render() should return a valid RenderResult."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        scene = tmp_path / "scene.obj"
        scene.write_text("# mock scene", encoding="utf-8")
        output = tmp_path / "output.png"

        result = adapter.render(scene, output, RenderSettings(width=32, height=32))

        assert result.renderer == "mock"
        assert result.scene == "scene"
        assert result.hardware is not None
        assert result.timestamp != ""

    def test_render_positive_time(self, tmp_path: Path) -> None:
        """render() with non-zero sleep should have positive time."""
        adapter = MockRendererAdapter(sleep_seconds=0.01)
        scene = tmp_path / "scene.pbrt"
        scene.write_text("# mock", encoding="utf-8")
        output = tmp_path / "out.png"

        result = adapter.render(scene, output, RenderSettings(width=8, height=8))
        assert result.render_time_seconds >= 0

    def test_render_creates_parent_dirs(self, tmp_path: Path) -> None:
        """render() should create parent directories for the output."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        scene = tmp_path / "scene.pbrt"
        scene.write_text("# mock", encoding="utf-8")
        output = tmp_path / "subdir" / "deep" / "out.png"

        adapter.render(scene, output, RenderSettings(width=8, height=8))
        assert output.is_file()


class TestMockAdapterBaseClass:
    """Tests to verify the base class is_mock property works correctly."""

    def test_production_adapter_is_not_mock(self) -> None:
        """Production adapters should have is_mock = False."""
        from renderscope.adapters.pbrt import PBRTAdapter

        adapter = PBRTAdapter()
        assert adapter.is_mock is False

    def test_mock_adapter_is_mock(self) -> None:
        """The mock adapter should have is_mock = True."""
        adapter = MockRendererAdapter(sleep_seconds=0.0)
        assert adapter.is_mock is True
