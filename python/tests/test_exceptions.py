"""Tests for custom adapter exceptions."""

from __future__ import annotations

from renderscope.adapters.exceptions import (
    RendererNotFoundError,
    RenderError,
    SceneFormatError,
)


class TestRendererNotFoundError:
    """Tests for RendererNotFoundError."""

    def test_basic_message(self) -> None:
        err = RendererNotFoundError("PBRT v4")
        assert "PBRT v4" in str(err)
        assert "not installed" in str(err)
        assert err.renderer_name == "PBRT v4"
        assert err.install_hint is None

    def test_with_install_hint(self) -> None:
        err = RendererNotFoundError("Mitsuba 3", install_hint="pip install mitsuba")
        assert "pip install mitsuba" in str(err)
        assert err.install_hint == "pip install mitsuba"

    def test_inherits_from_exception(self) -> None:
        err = RendererNotFoundError("test")
        assert isinstance(err, Exception)


class TestRenderError:
    """Tests for RenderError."""

    def test_basic_message(self) -> None:
        err = RenderError("PBRT v4", "Segmentation fault")
        assert "PBRT v4" in str(err)
        assert "Segmentation fault" in str(err)
        assert err.renderer_name == "PBRT v4"
        assert err.exit_code is None
        assert err.stderr_output is None

    def test_with_exit_code(self) -> None:
        err = RenderError("PBRT v4", "Failed", exit_code=1)
        assert "Exit code: 1" in str(err)
        assert err.exit_code == 1

    def test_with_stderr(self) -> None:
        err = RenderError("PBRT v4", "Failed", stderr_output="Error details here")
        assert "Error details here" in str(err)

    def test_stderr_truncation(self) -> None:
        long_output = "x" * 3000
        err = RenderError("PBRT v4", "Failed", stderr_output=long_output)
        assert "truncated" in str(err)

    def test_empty_stderr_ignored(self) -> None:
        err = RenderError("PBRT v4", "Failed", stderr_output="   \n  ")
        msg = str(err)
        assert "Renderer output:" not in msg

    def test_inherits_from_exception(self) -> None:
        err = RenderError("test", "reason")
        assert isinstance(err, Exception)


class TestSceneFormatError:
    """Tests for SceneFormatError."""

    def test_basic_message(self) -> None:
        err = SceneFormatError("PBRT v4", "/path/to/scene.obj", "obj", ["pbrt"])
        assert "PBRT v4" in str(err)
        assert ".obj" in str(err)
        assert ".pbrt" in str(err)
        assert err.renderer_name == "PBRT v4"
        assert err.scene_path == "/path/to/scene.obj"
        assert err.scene_format == "obj"
        assert err.supported_formats == ["pbrt"]

    def test_multiple_supported_formats(self) -> None:
        err = SceneFormatError("Mitsuba 3", "/scene.fbx", "fbx", ["xml", "obj", "ply"])
        msg = str(err)
        assert ".xml" in msg
        assert ".obj" in msg
        assert ".ply" in msg

    def test_includes_tip(self) -> None:
        err = SceneFormatError("Test", "/s.x", "x", ["y"])
        assert "renderscope list" in str(err)

    def test_inherits_from_exception(self) -> None:
        err = SceneFormatError("test", "/p", "f", ["g"])
        assert isinstance(err, Exception)
