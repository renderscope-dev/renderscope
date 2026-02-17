"""Tests for Session 16.2 renderer adapters (LuxCore, appleseed, Filament, OSPRay).

These tests cover:
- Adapter interface contract (name, display_name, supported_formats)
- Detection logic (mock-based for installed/not-installed states)
- Format validation and error paths
- Registry integration (all 7 adapters registered)
- CLI integration (renderscope info / list commands)

Actual render execution is NOT tested because the renderers are unlikely
to be installed in the CI/test environment.  Integration tests that
require installed renderers are marked with ``pytest.mark.skipif``.
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import MagicMock, patch

import pytest

from renderscope.adapters.base import RendererAdapter
from renderscope.adapters.exceptions import (
    RendererNotFoundError,
    RenderError,
    SceneFormatError,
)
from renderscope.models.settings import RenderSettings

if TYPE_CHECKING:
    from pathlib import Path


# ===================================================================
# LuxCoreRender Adapter Tests
# ===================================================================


class TestLuxCoreAdapter:
    """Tests for the LuxCoreAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.luxcore import LuxCoreAdapter

        return LuxCoreAdapter()

    def test_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.name == "luxcore"

    def test_display_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.display_name == "LuxCoreRender"

    def test_supported_formats(self) -> None:
        adapter = self._make_adapter()
        formats = adapter.supported_formats()
        assert "lxs" in formats
        assert "cfg" in formats
        assert "scn" in formats

    def test_supported_formats_returns_new_list(self) -> None:
        """Ensure supported_formats returns a copy, not the internal list."""
        adapter = self._make_adapter()
        f1 = adapter.supported_formats()
        f2 = adapter.supported_formats()
        assert f1 == f2
        assert f1 is not f2

    def test_is_renderer_adapter(self) -> None:
        adapter = self._make_adapter()
        assert isinstance(adapter, RendererAdapter)

    def test_detect_returns_string_or_none(self) -> None:
        adapter = self._make_adapter()
        result = adapter.detect()
        assert result is None or isinstance(result, str)

    def test_detect_via_python_api(self) -> None:
        """When pyluxcore is importable, detect should return its version."""
        from renderscope.adapters.luxcore import LuxCoreAdapter

        adapter = LuxCoreAdapter()
        mock_pyluxcore = MagicMock()
        mock_pyluxcore.Version.return_value = "v2.6"

        with patch.dict("sys.modules", {"pyluxcore": mock_pyluxcore}):
            version = adapter.detect()
        assert version == "2.6"

    def test_detect_via_cli_fallback(self) -> None:
        """When pyluxcore is not available but luxcoreconsole is in PATH."""
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
        """When neither pyluxcore nor CLI tools are available."""
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

    def test_render_missing_scene_file(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "nonexistent.lxs"

        with (
            patch.object(type(adapter), "detect", return_value="2.6"),
            pytest.raises(RenderError, match="not found"),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_convert_scene_not_implemented(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        with pytest.raises(NotImplementedError):
            adapter.convert_scene(tmp_path / "scene.obj", "lxs")


# ===================================================================
# appleseed Adapter Tests
# ===================================================================


class TestAppleseedAdapter:
    """Tests for the AppleseedAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.appleseed import AppleseedAdapter

        return AppleseedAdapter()

    def test_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.name == "appleseed"

    def test_display_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.display_name == "appleseed"

    def test_supported_formats(self) -> None:
        adapter = self._make_adapter()
        formats = adapter.supported_formats()
        assert "appleseed" in formats

    def test_supported_formats_returns_new_list(self) -> None:
        adapter = self._make_adapter()
        f1 = adapter.supported_formats()
        f2 = adapter.supported_formats()
        assert f1 == f2
        assert f1 is not f2

    def test_is_renderer_adapter(self) -> None:
        adapter = self._make_adapter()
        assert isinstance(adapter, RendererAdapter)

    def test_detect_returns_string_or_none(self) -> None:
        adapter = self._make_adapter()
        result = adapter.detect()
        assert result is None or isinstance(result, str)

    def test_detect_with_binary(self) -> None:
        """When appleseed.cli is in PATH and reports a version."""
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

    def test_render_missing_scene_file(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "nonexistent.appleseed"

        with (
            patch(
                "renderscope.adapters.appleseed.AppleseedAdapter._find_binary",
                return_value="appleseed.cli",
            ),
            pytest.raises(RenderError, match="not found"),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_gpu_warning_logged(self, tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
        """appleseed is CPU-only; GPU request should produce a warning."""
        from renderscope.adapters.appleseed import AppleseedAdapter

        adapter = AppleseedAdapter()
        scene = tmp_path / "scene.appleseed"
        scene.write_text("<project></project>")

        mock_result = MagicMock()
        mock_result.exit_code = 0
        mock_result.stdout = ""
        mock_result.stderr = ""
        mock_result.elapsed_seconds = 1.0
        mock_result.peak_memory_mb = 100.0

        # Create a fake output file
        output = tmp_path / "out.exr"

        with (
            patch(
                "renderscope.adapters.appleseed.AppleseedAdapter._find_binary",
                return_value="appleseed.cli",
            ),
            patch("renderscope.adapters.appleseed.run_subprocess", return_value=mock_result),
            patch("renderscope.adapters.appleseed.AppleseedAdapter.detect", return_value="2.1.0"),
            patch("renderscope.adapters.appleseed.RenderResultBuilder") as mock_builder_cls,
        ):
            mock_builder = MagicMock()
            mock_builder_cls.return_value = mock_builder
            mock_builder.build.return_value = MagicMock()
            output.write_bytes(b"\x00" * 10)

            import logging

            with caplog.at_level(logging.WARNING, logger="renderscope.adapters.appleseed"):
                adapter.render(scene, output, RenderSettings(gpu=True))

            assert any("CPU-only" in record.message for record in caplog.records)


# ===================================================================
# Google Filament Adapter Tests
# ===================================================================


class TestFilamentAdapter:
    """Tests for the FilamentAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.filament import FilamentAdapter

        return FilamentAdapter()

    def test_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.name == "filament"

    def test_display_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.display_name == "Google Filament"

    def test_supported_formats(self) -> None:
        adapter = self._make_adapter()
        formats = adapter.supported_formats()
        assert "gltf" in formats
        assert "glb" in formats

    def test_supported_formats_returns_new_list(self) -> None:
        adapter = self._make_adapter()
        f1 = adapter.supported_formats()
        f2 = adapter.supported_formats()
        assert f1 == f2
        assert f1 is not f2

    def test_is_renderer_adapter(self) -> None:
        adapter = self._make_adapter()
        assert isinstance(adapter, RendererAdapter)

    def test_detect_returns_string_or_none(self) -> None:
        adapter = self._make_adapter()
        result = adapter.detect()
        assert result is None or isinstance(result, str)

    def test_detect_with_viewer(self) -> None:
        """When gltf_viewer is in PATH."""
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

    def test_detect_via_supplementary_tool(self) -> None:
        """When gltf_viewer is absent but matc is found."""
        from renderscope.adapters.filament import FilamentAdapter

        adapter = FilamentAdapter()
        mock_result = MagicMock()
        mock_result.stdout = "matc v1.32.0"
        mock_result.stderr = ""

        def mock_which(name: str) -> str | None:
            if name == "matc":
                return "/usr/bin/matc"
            return None

        with (
            patch("shutil.which", side_effect=mock_which),
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

    def test_render_missing_scene_file(self, tmp_path: Path) -> None:
        adapter = self._make_adapter()
        scene = tmp_path / "nonexistent.gltf"

        with (
            patch("shutil.which", return_value="/usr/bin/gltf_viewer"),
            pytest.raises(RenderError, match="not found"),
        ):
            adapter.render(scene, tmp_path / "out.png", RenderSettings())

    def test_detect_available_tools(self) -> None:
        from renderscope.adapters.filament import FilamentAdapter

        def mock_which(name: str) -> str | None:
            if name in ("gltf_viewer", "matc"):
                return f"/usr/bin/{name}"
            return None

        with patch("shutil.which", side_effect=mock_which):
            tools = FilamentAdapter._detect_available_tools()
        assert "gltf_viewer" in tools
        assert "matc" in tools


# ===================================================================
# Intel OSPRay Adapter Tests
# ===================================================================


class TestOSPRayAdapter:
    """Tests for the OSPRayAdapter."""

    def _make_adapter(self) -> RendererAdapter:
        from renderscope.adapters.ospray import OSPRayAdapter

        return OSPRayAdapter()

    def test_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.name == "ospray"

    def test_display_name(self) -> None:
        adapter = self._make_adapter()
        assert adapter.display_name == "Intel OSPRay"

    def test_supported_formats(self) -> None:
        adapter = self._make_adapter()
        formats = adapter.supported_formats()
        assert "obj" in formats
        assert "gltf" in formats
        assert "glb" in formats
        assert "ospray" in formats

    def test_supported_formats_returns_new_list(self) -> None:
        adapter = self._make_adapter()
        f1 = adapter.supported_formats()
        f2 = adapter.supported_formats()
        assert f1 == f2
        assert f1 is not f2

    def test_is_renderer_adapter(self) -> None:
        adapter = self._make_adapter()
        assert isinstance(adapter, RendererAdapter)

    def test_detect_returns_string_or_none(self) -> None:
        adapter = self._make_adapter()
        result = adapter.detect()
        assert result is None or isinstance(result, str)

    def test_detect_with_studio(self) -> None:
        """When ospStudio is in PATH."""
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

    def test_detect_via_examples(self) -> None:
        """When ospStudio is absent but ospExamples is found."""
        from renderscope.adapters.ospray import OSPRayAdapter

        adapter = OSPRayAdapter()
        mock_result = MagicMock()
        mock_result.stdout = "OSPRay v3.0.0"
        mock_result.stderr = ""

        def mock_which(name: str) -> str | None:
            if name == "ospExamples":
                return "/usr/bin/ospExamples"
            return None

        with (
            patch("shutil.which", side_effect=mock_which),
            patch("renderscope.adapters.ospray.run_subprocess", return_value=mock_result),
        ):
            version = adapter.detect()
        assert version == "3.0.0"

    def test_detect_via_python_bindings(self) -> None:
        """When only Python bindings are available."""
        from renderscope.adapters.ospray import OSPRayAdapter

        adapter = OSPRayAdapter()
        mock_osp = MagicMock()
        mock_osp.__version__ = "3.1.0"

        with (
            patch("shutil.which", return_value=None),
            patch.dict("sys.modules", {"ospray": mock_osp}),
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

    def test_render_bad_format_raises(self, tmp_path: Path) -> None:
        from renderscope.adapters.ospray import OSPRayAdapter, _IntegrationPath

        adapter = OSPRayAdapter()
        adapter._integration_path = _IntegrationPath.STUDIO
        adapter._cli_binary = "ospStudio"
        scene = tmp_path / "scene.pbrt"
        scene.touch()

        with (
            patch.object(type(adapter), "detect", return_value="3.1.0"),
            pytest.raises(SceneFormatError),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_render_missing_scene_file(self, tmp_path: Path) -> None:
        from renderscope.adapters.ospray import OSPRayAdapter, _IntegrationPath

        adapter = OSPRayAdapter()
        adapter._integration_path = _IntegrationPath.STUDIO
        adapter._cli_binary = "ospStudio"
        scene = tmp_path / "nonexistent.obj"

        with (
            patch.object(type(adapter), "detect", return_value="3.1.0"),
            pytest.raises(RenderError, match="not found"),
        ):
            adapter.render(scene, tmp_path / "out.exr", RenderSettings())

    def test_build_studio_cmd(self, tmp_path: Path) -> None:
        from renderscope.adapters.ospray import OSPRayAdapter

        scene = tmp_path / "scene.gltf"
        output = tmp_path / "out.exr"
        settings = RenderSettings(width=800, height=600, samples=16)

        cmd = OSPRayAdapter._build_studio_cmd(scene, output, settings, "pathtracer")
        assert "ospStudio" in cmd
        assert "--batch" in cmd
        assert "--renderer" in cmd
        assert "pathtracer" in cmd
        assert "--size" in cmd
        assert "800" in cmd
        assert "600" in cmd
        assert "--spp" in cmd
        assert "16" in cmd
        assert str(scene) in cmd

    def test_renderer_types(self) -> None:
        from renderscope.adapters.ospray import _DEFAULT_RENDERER_TYPE, _RENDERER_TYPES

        assert _DEFAULT_RENDERER_TYPE in _RENDERER_TYPES
        assert "pathtracer" in _RENDERER_TYPES
        assert "scivis" in _RENDERER_TYPES
        assert "ao" in _RENDERER_TYPES


# ===================================================================
# Cross-adapter contract tests (all 7 adapters)
# ===================================================================


class TestAllAdaptersRegistered:
    """Verify all 7 adapters are registered after lazy initialization.

    Uses the global ``registry`` singleton, which is where adapters
    self-register at import time.
    """

    def test_seven_adapters_registered(self) -> None:
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
        }
        assert expected.issubset(set(names)), f"Missing adapters: {expected - set(names)}"

    def test_registry_adapter_count(self) -> None:
        from renderscope.core.registry import registry

        all_adapters = registry.list_all()
        assert len(all_adapters) >= 7

    def test_get_each_new_adapter(self) -> None:
        from renderscope.core.registry import registry

        for name in ("luxcore", "appleseed", "filament", "ospray"):
            adapter = registry.get(name)
            assert adapter is not None, f"Adapter '{name}' not found in registry"
            assert adapter.name == name

    def test_unique_names(self) -> None:
        from renderscope.core.registry import registry

        all_adapters = registry.list_all()
        names = [a.name for a in all_adapters]
        assert len(names) == len(set(names)), f"Duplicate names: {names}"

    def test_all_have_non_empty_formats(self) -> None:
        from renderscope.core.registry import registry

        for adapter in registry.list_all():
            formats = adapter.supported_formats()
            assert len(formats) > 0, f"{adapter.name} has no supported formats"

    def test_all_detect_returns_correct_type(self) -> None:
        from renderscope.core.registry import registry

        for adapter in registry.list_all():
            result = adapter.detect()
            assert result is None or isinstance(result, str), (
                f"{adapter.name}.detect() returned {type(result)}"
            )


# ===================================================================
# CLI integration tests
# ===================================================================


class TestCLIIntegration:
    """Test that new adapters work with existing CLI commands."""

    def test_list_command_includes_new_adapters(self) -> None:
        from typer.testing import CliRunner

        from renderscope.cli.main import app

        runner = CliRunner()
        result = runner.invoke(app, ["list", "--all", "--format", "json"])
        assert result.exit_code == 0
        output = result.output.lower()
        assert "luxcorerender" in output
        assert "appleseed" in output
        assert "filament" in output
        assert "ospray" in output

    def test_info_luxcore(self) -> None:
        from typer.testing import CliRunner

        from renderscope.cli.main import app

        runner = CliRunner()
        # Uses alias "luxcore" → "luxcorerender" from _resolve_renderer_id
        result = runner.invoke(app, ["info", "luxcore"])
        assert result.exit_code == 0
        assert "luxcore" in result.output.lower()

    def test_info_appleseed(self) -> None:
        from typer.testing import CliRunner

        from renderscope.cli.main import app

        runner = CliRunner()
        result = runner.invoke(app, ["info", "appleseed"])
        assert result.exit_code == 0
        assert "appleseed" in result.output.lower()

    def test_info_filament(self) -> None:
        from typer.testing import CliRunner

        from renderscope.cli.main import app

        runner = CliRunner()
        result = runner.invoke(app, ["info", "filament"])
        assert result.exit_code == 0
        assert "filament" in result.output.lower()

    def test_info_ospray(self) -> None:
        from typer.testing import CliRunner

        from renderscope.cli.main import app

        runner = CliRunner()
        result = runner.invoke(app, ["info", "ospray"])
        assert result.exit_code == 0
        assert "ospray" in result.output.lower()


# ===================================================================
# Integration tests (require actual renderer installation)
# ===================================================================


class TestLuxCoreIntegration:
    """Integration tests requiring LuxCoreRender to be installed."""

    @pytest.fixture(autouse=True)
    def _skip_if_not_installed(self) -> None:
        from renderscope.adapters.luxcore import LuxCoreAdapter

        adapter = LuxCoreAdapter()
        if adapter.detect() is None:
            pytest.skip("LuxCoreRender not installed")

    def test_detect_returns_version(self) -> None:
        from renderscope.adapters.luxcore import LuxCoreAdapter

        adapter = LuxCoreAdapter()
        version = adapter.detect()
        assert version is not None
        assert isinstance(version, str)
        assert len(version) > 0


class TestAppleseedIntegration:
    """Integration tests requiring appleseed to be installed."""

    @pytest.fixture(autouse=True)
    def _skip_if_not_installed(self) -> None:
        from renderscope.adapters.appleseed import AppleseedAdapter

        adapter = AppleseedAdapter()
        if adapter.detect() is None:
            pytest.skip("appleseed not installed")

    def test_detect_returns_version(self) -> None:
        from renderscope.adapters.appleseed import AppleseedAdapter

        adapter = AppleseedAdapter()
        version = adapter.detect()
        assert version is not None
        assert isinstance(version, str)
        assert len(version) > 0


class TestFilamentIntegration:
    """Integration tests requiring Google Filament to be installed."""

    @pytest.fixture(autouse=True)
    def _skip_if_not_installed(self) -> None:
        from renderscope.adapters.filament import FilamentAdapter

        adapter = FilamentAdapter()
        if adapter.detect() is None:
            pytest.skip("Google Filament not installed")

    def test_detect_returns_version(self) -> None:
        from renderscope.adapters.filament import FilamentAdapter

        adapter = FilamentAdapter()
        version = adapter.detect()
        assert version is not None
        assert isinstance(version, str)
        assert len(version) > 0


class TestOSPRayIntegration:
    """Integration tests requiring Intel OSPRay to be installed."""

    @pytest.fixture(autouse=True)
    def _skip_if_not_installed(self) -> None:
        from renderscope.adapters.ospray import OSPRayAdapter

        adapter = OSPRayAdapter()
        if adapter.detect() is None:
            pytest.skip("Intel OSPRay not installed")

    def test_detect_returns_version(self) -> None:
        from renderscope.adapters.ospray import OSPRayAdapter

        adapter = OSPRayAdapter()
        version = adapter.detect()
        assert version is not None
        assert isinstance(version, str)
        assert len(version) > 0
