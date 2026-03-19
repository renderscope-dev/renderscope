"""Tests for concrete renderer adapter detection and error handling.

Consolidated from test_adapters.py and test_adapters_session16_2.py.
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

pytestmark = pytest.mark.adapters


# ===================================================================
# PBRT Adapter Tests
# ===================================================================


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
        with (
            patch("renderscope.adapters.pbrt.PBRTAdapter._find_binary", return_value="pbrt"),
            pytest.raises(SceneFormatError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_render_missing_binary(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.pbrt"
        scene.write_text("# empty scene")
        with (
            patch("renderscope.adapters.pbrt.PBRTAdapter._find_binary", return_value=None),
            pytest.raises(RendererNotFoundError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_render_missing_scene_file(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "nonexistent.pbrt"
        with (
            patch("renderscope.adapters.pbrt.PBRTAdapter._find_binary", return_value="pbrt"),
            pytest.raises(RenderError, match="not found"),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_find_binary_method_exists(self) -> None:
        from renderscope.adapters.pbrt import PBRTAdapter

        adapter = PBRTAdapter()
        assert callable(adapter._find_binary)

    def test_convert_scene_not_implemented(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        with pytest.raises(NotImplementedError):
            adapter.convert_scene(tmp_path / "scene.obj", "pbrt")

    def test_is_not_mock(self) -> None:
        adapter = self._make_adapter()
        assert adapter.is_mock is False


# ===================================================================
# Mitsuba 3 Adapter Tests
# ===================================================================


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
        with (
            patch.object(type(adapter), "detect", return_value="3.5.0"),
            pytest.raises(SceneFormatError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_render_not_installed_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.xml"
        scene.touch()
        with (
            patch.object(type(adapter), "detect", return_value=None),
            pytest.raises(RendererNotFoundError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

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

        mi_mock = MagicMock(spec=[])
        variant = MitsubaAdapter._select_variant(mi_mock, gpu=False)
        assert variant == "scalar_rgb"


# ===================================================================
# Cycles Adapter Tests
# ===================================================================


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
            adapter.render(scene, tmp_path / "out.png", RenderSettings())

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
            adapter.render(scene, tmp_path / "out.png", RenderSettings())

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
            adapter.render(scene, tmp_path / "out.png", RenderSettings())

    def test_render_script_template_is_valid_python(self) -> None:
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
        compile(script, "<render_script>", "exec")

    def test_ansi_stripping(self) -> None:
        from renderscope.adapters.cycles import _ANSI_RE

        text = "\x1b[31mRed text\x1b[0m and normal"
        cleaned = _ANSI_RE.sub("", text)
        assert cleaned == "Red text and normal"


# ===================================================================
# LuxCoreRender Adapter Tests
# ===================================================================


class TestLuxCoreAdapter:
    """Tests for the LuxCoreAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.luxcore import LuxCoreAdapter

        return LuxCoreAdapter()

    def test_name(self) -> None:
        assert self._make_adapter().name == "luxcore"

    def test_display_name(self) -> None:
        assert self._make_adapter().display_name == "LuxCoreRender"

    def test_supported_formats(self) -> None:
        formats = self._make_adapter().supported_formats()
        assert "lxs" in formats
        assert "cfg" in formats
        assert "scn" in formats

    def test_detect_returns_string_or_none(self) -> None:
        result = self._make_adapter().detect()
        assert result is None or isinstance(result, str)

    def test_detect_via_python_api(self) -> None:
        from renderscope.adapters.luxcore import LuxCoreAdapter

        adapter = LuxCoreAdapter()
        mock_pyluxcore = MagicMock()
        mock_pyluxcore.Version.return_value = "v2.6"
        with patch.dict("sys.modules", {"pyluxcore": mock_pyluxcore}):
            version = adapter.detect()
        assert version == "2.6"

    def test_detect_via_cli_fallback(self) -> None:
        from renderscope.adapters.luxcore import LuxCoreAdapter

        adapter = LuxCoreAdapter()
        mock_result = MagicMock()
        mock_result.stdout = "LuxCoreRender v2.6"
        mock_result.stderr = ""
        with (
            patch(
                "renderscope.adapters.luxcore.LuxCoreAdapter._detect_python_api",
                return_value=None,
            ),
            patch("shutil.which", return_value="/usr/bin/luxcoreconsole"),
            patch("renderscope.adapters.luxcore.run_subprocess", return_value=mock_result),
        ):
            version = adapter.detect()
        assert version == "2.6"

    def test_detect_nothing_available(self) -> None:
        from renderscope.adapters.luxcore import LuxCoreAdapter

        adapter = LuxCoreAdapter()
        with (
            patch(
                "renderscope.adapters.luxcore.LuxCoreAdapter._detect_python_api",
                return_value=None,
            ),
            patch("shutil.which", return_value=None),
        ):
            version = adapter.detect()
        assert version is None

    def test_render_not_installed_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.lxs"
        scene.write_text("# empty scene")
        with (
            patch.object(type(adapter), "detect", return_value=None),
            pytest.raises(RendererNotFoundError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_render_bad_format_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.obj"
        scene.touch()
        with (
            patch.object(type(adapter), "detect", return_value="2.6"),
            pytest.raises(SceneFormatError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())


# ===================================================================
# appleseed Adapter Tests
# ===================================================================


class TestAppleseedAdapter:
    """Tests for the AppleseedAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.appleseed import AppleseedAdapter

        return AppleseedAdapter()

    def test_name(self) -> None:
        assert self._make_adapter().name == "appleseed"

    def test_display_name(self) -> None:
        assert self._make_adapter().display_name == "appleseed"

    def test_supported_formats(self) -> None:
        formats = self._make_adapter().supported_formats()
        assert "appleseed" in formats

    def test_detect_returns_string_or_none(self) -> None:
        result = self._make_adapter().detect()
        assert result is None or isinstance(result, str)

    def test_detect_with_binary(self) -> None:
        from renderscope.adapters.appleseed import AppleseedAdapter

        adapter = AppleseedAdapter()
        mock_result = MagicMock()
        mock_result.stdout = "appleseed.cli version 2.1.0-beta"
        mock_result.stderr = ""
        with (
            patch("shutil.which", return_value="/usr/bin/appleseed.cli"),
            patch("renderscope.adapters.appleseed.run_subprocess", return_value=mock_result),
        ):
            version = adapter.detect()
        assert version == "2.1.0-beta"

    def test_detect_nothing_available(self) -> None:
        from renderscope.adapters.appleseed import AppleseedAdapter

        adapter = AppleseedAdapter()
        with patch("shutil.which", return_value=None):
            version = adapter.detect()
        assert version is None

    def test_render_not_installed_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.appleseed"
        scene.write_text("<project></project>")
        with (
            patch(
                "renderscope.adapters.appleseed.AppleseedAdapter._find_binary",
                return_value=None,
            ),
            pytest.raises(RendererNotFoundError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_render_bad_format_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.obj"
        scene.touch()
        with (
            patch(
                "renderscope.adapters.appleseed.AppleseedAdapter._find_binary",
                return_value="appleseed.cli",
            ),
            pytest.raises(SceneFormatError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())


# ===================================================================
# Google Filament Adapter Tests
# ===================================================================


class TestFilamentAdapter:
    """Tests for the FilamentAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.filament import FilamentAdapter

        return FilamentAdapter()

    def test_name(self) -> None:
        assert self._make_adapter().name == "filament"

    def test_display_name(self) -> None:
        assert self._make_adapter().display_name == "Google Filament"

    def test_supported_formats(self) -> None:
        formats = self._make_adapter().supported_formats()
        assert "gltf" in formats
        assert "glb" in formats

    def test_detect_returns_string_or_none(self) -> None:
        result = self._make_adapter().detect()
        assert result is None or isinstance(result, str)

    def test_detect_with_viewer(self) -> None:
        from renderscope.adapters.filament import FilamentAdapter

        adapter = FilamentAdapter()
        mock_result = MagicMock()
        mock_result.stdout = "Filament gltf_viewer v1.32.0"
        mock_result.stderr = ""
        with (
            patch("shutil.which", return_value="/usr/bin/gltf_viewer"),
            patch("renderscope.adapters.filament.run_subprocess", return_value=mock_result),
        ):
            version = adapter.detect()
        assert version == "1.32.0"

    def test_detect_nothing_available(self) -> None:
        from renderscope.adapters.filament import FilamentAdapter

        adapter = FilamentAdapter()
        with patch("shutil.which", return_value=None):
            version = adapter.detect()
        assert version is None

    def test_render_not_installed_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.gltf"
        scene.write_text("{}")
        with (
            patch("shutil.which", return_value=None),
            pytest.raises(RendererNotFoundError),
        ):
            adapter.render(scene, tmp_path / "out.png", RenderSettings())

    def test_render_bad_format_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.pbrt"
        scene.touch()
        with (
            patch("shutil.which", return_value="/usr/bin/gltf_viewer"),
            pytest.raises(SceneFormatError),
        ):
            adapter.render(scene, tmp_path / "out.png", RenderSettings())


# ===================================================================
# Intel OSPRay Adapter Tests
# ===================================================================


class TestOSPRayAdapter:
    """Tests for the OSPRayAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.ospray import OSPRayAdapter

        return OSPRayAdapter()

    def test_name(self) -> None:
        assert self._make_adapter().name == "ospray"

    def test_display_name(self) -> None:
        assert self._make_adapter().display_name == "Intel OSPRay"

    def test_supported_formats(self) -> None:
        formats = self._make_adapter().supported_formats()
        assert "obj" in formats
        assert "gltf" in formats
        assert "glb" in formats

    def test_detect_returns_string_or_none(self) -> None:
        result = self._make_adapter().detect()
        assert result is None or isinstance(result, str)

    def test_detect_with_studio(self) -> None:
        from renderscope.adapters.ospray import OSPRayAdapter

        adapter = OSPRayAdapter()
        mock_result = MagicMock()
        mock_result.stdout = "OSPRay Studio v3.1.0"
        mock_result.stderr = ""
        with (
            patch("shutil.which", return_value="/usr/bin/ospStudio"),
            patch("renderscope.adapters.ospray.run_subprocess", return_value=mock_result),
        ):
            version = adapter.detect()
        assert version == "3.1.0"

    def test_detect_nothing_available(self) -> None:
        from renderscope.adapters.ospray import OSPRayAdapter

        adapter = OSPRayAdapter()
        with (
            patch("shutil.which", return_value=None),
            patch(
                "renderscope.adapters.ospray.OSPRayAdapter._detect_python_bindings",
                return_value=None,
            ),
        ):
            version = adapter.detect()
        assert version is None

    def test_render_not_installed_raises(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "scene.obj"
        scene.write_text("# empty")
        with (
            patch.object(type(adapter), "detect", return_value=None),
            pytest.raises(RendererNotFoundError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())


# ===================================================================
# All-adapter registration tests
# ===================================================================


class TestAllAdaptersRegistered:
    """Verify all expected adapters are registered."""

    def test_eight_adapters_registered(self) -> None:
        """Should have 7 production adapters + 1 mock = 8."""
        from renderscope.core.registry import registry

        names = registry.get_names()
        expected = {
            "pbrt",
            "mitsuba3",
            "blender-cycles",
            "luxcore",
            "appleseed",
            "filament",
            "ospray",
            "mock",
        }
        assert expected.issubset(set(names)), f"Missing adapters: {expected - set(names)}"

    def test_get_each_adapter(self) -> None:
        from renderscope.core.registry import registry

        for name in ("luxcore", "appleseed", "filament", "ospray", "mock"):
            adapter = registry.get(name)
            assert adapter is not None, f"Adapter '{name}' not found in registry"
            assert adapter.name == name
