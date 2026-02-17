"""Tests for concrete renderer adapters (PBRT, Mitsuba 3, Cycles).

These tests focus on the adapter interface contract, format validation,
and error handling.  Actual render execution is not tested because the
renderers may not be installed in the CI/test environment.
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import MagicMock, patch

import pytest

from renderscope.adapters.exceptions import (
    RendererNotFoundError,
    RenderError,
    SceneFormatError,
)
from renderscope.models.settings import RenderSettings

if TYPE_CHECKING:
    from pathlib import Path

    from renderscope.adapters.base import RendererAdapter


# ---------------------------------------------------------------------------
# PBRT Adapter Tests
# ---------------------------------------------------------------------------


class TestPBRTAdapter:
    """Tests for the PBRTAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.pbrt import PBRTAdapter

        return PBRTAdapter()

    def test_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.name == "pbrt"

    def test_display_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.display_name == "PBRT v4"

    def test_supported_formats(self) -> None:
        adapter = self._make_adapter()
        formats = adapter.supported_formats()
        assert "pbrt" in formats

    def test_detect_returns_string_or_none(self) -> None:
        adapter = self._make_adapter()
        result = adapter.detect()
        assert result is None or isinstance(result, str)

    def test_render_bad_format_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.obj"
        scene.touch()
        # Mock binary found so the format validation path is reached
        with (
            patch("renderscope.adapters.pbrt.PBRTAdapter._find_binary", return_value="pbrt"),
            pytest.raises(SceneFormatError),
        ):
            adapter.render(
                scene,
                tmp_path / "out.exr",
                RenderSettings(),
            )

    def test_render_missing_binary(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.pbrt"
        scene.write_text("# empty scene")
        with (
            patch("renderscope.adapters.pbrt.PBRTAdapter._find_binary", return_value=None),
            pytest.raises(RendererNotFoundError),
        ):
            adapter.render(
                scene,
                tmp_path / "out.exr",
                RenderSettings(),
            )

    def test_render_missing_scene_file(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "nonexistent.pbrt"
        with (
            patch("renderscope.adapters.pbrt.PBRTAdapter._find_binary", return_value="pbrt"),
            pytest.raises(RenderError, match="not found"),
        ):
            adapter.render(
                scene,
                tmp_path / "out.exr",
                RenderSettings(),
            )

    def test_find_binary_method_exists(self) -> None:
        from renderscope.adapters.pbrt import PBRTAdapter

        adapter = PBRTAdapter()
        assert callable(adapter._find_binary)

    def test_convert_scene_not_implemented(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        with pytest.raises(NotImplementedError):
            adapter.convert_scene(tmp_path / "scene.obj", "pbrt")


# ---------------------------------------------------------------------------
# Mitsuba 3 Adapter Tests
# ---------------------------------------------------------------------------


class TestMitsubaAdapter:
    """Tests for the MitsubaAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.mitsuba import MitsubaAdapter

        return MitsubaAdapter()

    def test_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.name == "mitsuba3"

    def test_display_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.display_name == "Mitsuba 3"

    def test_supported_formats(self) -> None:
        adapter = self._make_adapter()
        formats = adapter.supported_formats()
        assert "xml" in formats
        assert "obj" in formats
        assert "ply" in formats

    def test_detect_returns_string_or_none(self) -> None:
        adapter = self._make_adapter()
        result = adapter.detect()
        assert result is None or isinstance(result, str)

    def test_render_bad_format_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.fbx"
        scene.touch()
        # Must mock detect so we get past the "not installed" check
        with (
            patch.object(type(adapter), "detect", return_value="3.5.0"),
            pytest.raises(SceneFormatError),
        ):
            adapter.render(
                scene,
                tmp_path / "out.exr",
                RenderSettings(),
            )

    def test_render_not_installed_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.xml"
        scene.touch()
        with (
            patch.object(type(adapter), "detect", return_value=None),
            pytest.raises(RendererNotFoundError),
        ):
            adapter.render(
                scene,
                tmp_path / "out.exr",
                RenderSettings(),
            )

    def test_select_variant_gpu(self) -> None:
        from renderscope.adapters.mitsuba import MitsubaAdapter

        mi_mock = MagicMock()
        mi_mock.variants.return_value = ["scalar_rgb", "cuda_ad_rgb", "llvm_ad_rgb"]
        variant = MitsubaAdapter._select_variant(mi_mock, gpu=True)
        assert variant == "cuda_ad_rgb"

    def test_select_variant_cpu(self) -> None:
        from renderscope.adapters.mitsuba import MitsubaAdapter

        mi_mock = MagicMock()
        mi_mock.variants.return_value = ["scalar_rgb", "llvm_ad_rgb"]
        variant = MitsubaAdapter._select_variant(mi_mock, gpu=False)
        assert variant == "llvm_ad_rgb"

    def test_select_variant_fallback(self) -> None:
        from renderscope.adapters.mitsuba import MitsubaAdapter

        mi_mock = MagicMock()
        mi_mock.variants.return_value = ["scalar_rgb"]
        variant = MitsubaAdapter._select_variant(mi_mock, gpu=True)
        assert variant == "scalar_rgb"

    def test_select_variant_empty(self) -> None:
        from renderscope.adapters.mitsuba import MitsubaAdapter

        mi_mock = MagicMock()
        mi_mock.variants.return_value = []
        variant = MitsubaAdapter._select_variant(mi_mock, gpu=False)
        assert variant == "scalar_rgb"

    def test_select_variant_no_variants_method(self) -> None:
        from renderscope.adapters.mitsuba import MitsubaAdapter

        mi_mock = MagicMock(spec=[])  # No 'variants' attribute
        variant = MitsubaAdapter._select_variant(mi_mock, gpu=False)
        assert variant == "scalar_rgb"


# ---------------------------------------------------------------------------
# Cycles Adapter Tests
# ---------------------------------------------------------------------------


class TestCyclesAdapter:
    """Tests for the CyclesAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.cycles import CyclesAdapter

        return CyclesAdapter()

    def test_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.name == "blender-cycles"

    def test_display_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.display_name == "Blender Cycles"

    def test_supported_formats(self) -> None:
        adapter = self._make_adapter()
        formats = adapter.supported_formats()
        assert "blend" in formats
        assert "gltf" in formats
        assert "obj" in formats

    def test_detect_returns_string_or_none(self) -> None:
        adapter = self._make_adapter()
        result = adapter.detect()
        assert result is None or isinstance(result, str)

    def test_render_bad_format_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.xyz"
        scene.touch()
        with (
            patch(
                "renderscope.adapters.cycles.CyclesAdapter._find_binary",
                return_value="blender",
            ),
            pytest.raises(SceneFormatError),
        ):
            adapter.render(
                scene,
                tmp_path / "out.png",
                RenderSettings(),
            )

    def test_render_missing_binary(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.blend"
        scene.touch()
        with (
            patch(
                "renderscope.adapters.cycles.CyclesAdapter._find_binary",
                return_value=None,
            ),
            pytest.raises(RendererNotFoundError),
        ):
            adapter.render(
                scene,
                tmp_path / "out.png",
                RenderSettings(),
            )

    def test_render_missing_scene_file(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "nonexistent.blend"
        with (
            patch(
                "renderscope.adapters.cycles.CyclesAdapter._find_binary",
                return_value="blender",
            ),
            pytest.raises(RenderError, match="not found"),
        ):
            adapter.render(
                scene,
                tmp_path / "out.png",
                RenderSettings(),
            )

    def test_render_script_template_is_valid_python(self) -> None:
        """The render script template should be syntactically valid after formatting."""
        from renderscope.adapters.cycles import _RENDER_SCRIPT_TEMPLATE

        script = _RENDER_SCRIPT_TEMPLATE.format(
            scene_path="/tmp/scene.blend",
            output_path="/tmp/out.png",
            width=1920,
            height=1080,
            samples=128,
            use_gpu=False,
            is_blend=True,
        )
        # Compilation should succeed - syntax is valid Python
        compile(script, "<render_script>", "exec")

    def test_ansi_stripping(self) -> None:
        from renderscope.adapters.cycles import _ANSI_RE

        text = "\x1b[31mRed text\x1b[0m and normal"
        cleaned = _ANSI_RE.sub("", text)
        assert cleaned == "Red text and normal"


# ---------------------------------------------------------------------------
# Cross-adapter contract tests
# ---------------------------------------------------------------------------


class TestAdapterContract:
    """Verify all registered adapters satisfy the RendererAdapter contract."""

    @pytest.fixture()
    def all_adapters(self) -> list[RendererAdapter]:
        from renderscope.core.registry import registry

        return registry.list_all()

    def test_all_have_name(self, all_adapters: list[RendererAdapter]) -> None:
        for adapter in all_adapters:
            assert isinstance(adapter.name, str)
            assert len(adapter.name) > 0

    def test_all_have_display_name(self, all_adapters: list[RendererAdapter]) -> None:
        for adapter in all_adapters:
            assert isinstance(adapter.display_name, str)
            assert len(adapter.display_name) > 0

    def test_all_have_supported_formats(self, all_adapters: list[RendererAdapter]) -> None:
        for adapter in all_adapters:
            formats = adapter.supported_formats()
            assert isinstance(formats, list)
            assert len(formats) > 0
            for fmt in formats:
                assert isinstance(fmt, str)

    def test_detect_returns_correct_type(self, all_adapters: list[RendererAdapter]) -> None:
        for adapter in all_adapters:
            result = adapter.detect()
            assert result is None or isinstance(result, str)

    def test_unique_names(self, all_adapters: list[RendererAdapter]) -> None:
        names = [a.name for a in all_adapters]
        assert len(names) == len(set(names)), f"Duplicate adapter names: {names}"
