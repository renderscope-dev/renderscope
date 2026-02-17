"""Tests for the render execution infrastructure in core/runner.py."""

from __future__ import annotations

import sys
import time

import pytest

from renderscope.core.runner import (
    InProcessTimer,
    InProcessTimerResult,
    RenderResultBuilder,
    SubprocessResult,
    run_subprocess,
)
from renderscope.models.settings import RenderSettings


class TestSubprocessResult:
    """Tests for the SubprocessResult dataclass."""

    def test_frozen(self) -> None:
        result = SubprocessResult(
            exit_code=0,
            stdout="hello",
            stderr="",
            elapsed_seconds=1.5,
            peak_memory_mb=100.0,
        )
        with pytest.raises(AttributeError):
            result.exit_code = 1  # type: ignore[misc]

    def test_fields(self) -> None:
        result = SubprocessResult(
            exit_code=42,
            stdout="out",
            stderr="err",
            elapsed_seconds=2.0,
            peak_memory_mb=50.0,
        )
        assert result.exit_code == 42
        assert result.stdout == "out"
        assert result.stderr == "err"
        assert result.elapsed_seconds == 2.0
        assert result.peak_memory_mb == 50.0


class TestRunSubprocess:
    """Tests for run_subprocess — runs real subprocesses."""

    def test_echo_command(self) -> None:
        """Run a simple echo command and check output."""
        result = run_subprocess(
            [sys.executable, "-c", "print('hello world')"],
            timeout=10.0,
        )
        assert result.exit_code == 0
        assert "hello world" in result.stdout
        assert result.elapsed_seconds > 0
        assert result.peak_memory_mb >= 0

    def test_nonzero_exit_code(self) -> None:
        """A failing command should capture the exit code."""
        result = run_subprocess(
            [sys.executable, "-c", "import sys; sys.exit(42)"],
            timeout=10.0,
        )
        assert result.exit_code == 42

    def test_stderr_capture(self) -> None:
        """Stderr should be captured."""
        result = run_subprocess(
            [sys.executable, "-c", "import sys; print('err', file=sys.stderr)"],
            timeout=10.0,
        )
        assert "err" in result.stderr

    def test_timeout(self) -> None:
        """A long-running process should be killed on timeout."""
        from renderscope.adapters.exceptions import RenderError

        with pytest.raises(RenderError, match="timed out"):
            run_subprocess(
                [sys.executable, "-c", "import time; time.sleep(30)"],
                timeout=0.5,
            )

    def test_command_not_found(self) -> None:
        """A nonexistent binary should raise FileNotFoundError."""
        with pytest.raises(FileNotFoundError, match="Command not found"):
            run_subprocess(["nonexistent_binary_xyz_12345"])

    def test_elapsed_time_reasonable(self) -> None:
        """Elapsed time should be positive and not wildly wrong."""
        result = run_subprocess(
            [sys.executable, "-c", "import time; time.sleep(0.1)"],
            timeout=10.0,
        )
        assert result.elapsed_seconds >= 0.05
        assert result.elapsed_seconds < 10.0


class TestInProcessTimer:
    """Tests for the InProcessTimer context manager."""

    def test_timing(self) -> None:
        timer = InProcessTimer()
        with timer:
            time.sleep(0.05)
        assert timer.result.elapsed_seconds >= 0.04
        assert timer.result.elapsed_seconds < 5.0

    def test_memory_tracking(self) -> None:
        timer = InProcessTimer()
        with timer:
            # Allocate some memory to give the monitor something to measure
            _ = bytearray(1024 * 1024)
            time.sleep(0.3)
        assert timer.result.peak_memory_mb > 0
        assert timer.result.baseline_memory_mb > 0

    def test_default_result(self) -> None:
        timer = InProcessTimer()
        result = timer.result
        assert isinstance(result, InProcessTimerResult)
        assert result.elapsed_seconds == 0.0


class TestRenderResultBuilder:
    """Tests for the RenderResultBuilder."""

    def test_build_minimal(self) -> None:
        builder = RenderResultBuilder(
            renderer="test-renderer",
            scene="test-scene",
            output_path="/tmp/out.png",
            render_time_seconds=1.0,
            peak_memory_mb=100.0,
        )
        result = builder.build()
        assert result.renderer == "test-renderer"
        assert result.scene == "test-scene"
        assert result.output_path == "/tmp/out.png"
        assert result.render_time_seconds == 1.0
        assert result.peak_memory_mb == 100.0
        assert result.hardware is not None
        assert result.hardware.cpu != ""
        assert result.timestamp != ""

    def test_build_with_settings(self) -> None:
        settings = RenderSettings(width=640, height=480, samples=64, gpu=True)
        builder = RenderResultBuilder(
            renderer="pbrt",
            scene="cornell-box",
            output_path="/tmp/out.exr",
            render_time_seconds=10.0,
            peak_memory_mb=512.0,
            settings=settings,
        )
        result = builder.build()
        assert result.settings.width == 640
        assert result.settings.height == 480
        assert result.settings.samples == 64
        assert result.settings.gpu is True

    def test_build_with_metadata(self) -> None:
        builder = RenderResultBuilder(
            renderer="pbrt",
            scene="test",
            output_path="/tmp/out.exr",
            metadata={"binary": "pbrt", "version": "4.0.0"},
        )
        result = builder.build()
        assert result.metadata["binary"] == "pbrt"
        assert result.metadata["version"] == "4.0.0"

    def test_hardware_auto_detected(self) -> None:
        builder = RenderResultBuilder(renderer="test", scene="test", output_path="/tmp/out.png")
        result = builder.build()
        # Should have auto-detected hardware
        assert result.hardware.os != ""
        assert result.hardware.python_version != ""
