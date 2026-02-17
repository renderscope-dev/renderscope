"""Render execution infrastructure — timing and memory monitoring.

Provides ``run_subprocess`` for external renderer processes (PBRT,
Blender/Cycles) and ``InProcessTimer`` for Python-native renderers
(Mitsuba 3).  Both capture wall-clock timing and peak memory usage
with consistent measurement methodology.

Also provides ``RenderResultBuilder`` to construct ``RenderResult``
objects from raw measurements — ensuring every adapter produces
identically-structured output.

The ``BenchmarkRunner`` class remains a skeleton for Phase 18.
"""

from __future__ import annotations

import logging
import os
import subprocess
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from pathlib import Path

import psutil

from renderscope.adapters.exceptions import RenderError
from renderscope.models.benchmark import RenderResult
from renderscope.models.settings import RenderSettings
from renderscope.utils.hardware import detect_hardware

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Subprocess result
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SubprocessResult:
    """Result of a monitored subprocess execution.

    Attributes:
        exit_code: Process exit code.
        stdout: Captured standard output (decoded).
        stderr: Captured standard error (decoded).
        elapsed_seconds: Wall-clock execution time.
        peak_memory_mb: Peak resident set size in megabytes.
    """

    exit_code: int
    stdout: str
    stderr: str
    elapsed_seconds: float
    peak_memory_mb: float


# ---------------------------------------------------------------------------
# Memory monitor
# ---------------------------------------------------------------------------


class _MemoryMonitor:
    """Background thread that polls process memory at a fixed interval.

    Tracks the peak RSS (Resident Set Size) of a target process and all
    its descendants.  Must be explicitly stopped via ``stop()``.
    """

    def __init__(self, pid: int, poll_interval: float = 0.2) -> None:
        self._pid = pid
        self._poll_interval = poll_interval
        self._peak_mb: float = 0.0
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    @property
    def peak_mb(self) -> float:
        """Peak RSS in megabytes observed during monitoring."""
        return self._peak_mb

    def start(self) -> None:
        """Start the background monitoring thread."""
        self._thread.start()

    def stop(self) -> None:
        """Signal the monitor to stop and wait for the thread to finish."""
        self._stop_event.set()
        self._thread.join(timeout=2.0)

    def _run(self) -> None:
        """Poll loop — runs in a daemon thread."""
        try:
            process = psutil.Process(self._pid)
        except psutil.NoSuchProcess:
            return

        while not self._stop_event.is_set():
            try:
                total_rss = process.memory_info().rss
                try:
                    for child in process.children(recursive=True):
                        try:
                            total_rss += child.memory_info().rss
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            continue
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

                mb = total_rss / (1024 * 1024)
                if mb > self._peak_mb:
                    self._peak_mb = mb
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                break

            self._stop_event.wait(self._poll_interval)


# ---------------------------------------------------------------------------
# Subprocess execution
# ---------------------------------------------------------------------------


def run_subprocess(
    cmd: list[str],
    *,
    timeout: float | None = None,
    env: dict[str, str] | None = None,
    cwd: str | Path | None = None,
    poll_interval: float = 0.2,
) -> SubprocessResult:
    """Execute a command with timing and memory monitoring.

    This is the primary mechanism for running external renderer binaries
    (PBRT, Blender, LuxCore CLI, etc.).  It launches the process, monitors
    peak memory in a background thread, captures stdout/stderr, and returns
    structured results.

    Args:
        cmd: Command and arguments to execute.
        timeout: Maximum execution time in seconds.  ``None`` for no limit.
        env: Environment variables for the child process.  If ``None``,
            the current environment is inherited.
        cwd: Working directory for the child process.
        poll_interval: Memory polling interval in seconds.

    Returns:
        A ``SubprocessResult`` with exit code, output, timing, and memory.

    Raises:
        RenderError: If the process times out.
        FileNotFoundError: If the command binary is not found.
    """
    merged_env: dict[str, str] | None = None
    if env is not None:
        merged_env = {**os.environ, **env}

    logger.debug("Running: %s", " ".join(cmd))
    start_time = time.perf_counter()

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=merged_env,
            cwd=str(cwd) if cwd is not None else None,
        )
    except FileNotFoundError:
        raise FileNotFoundError(f"Command not found: {cmd[0]}") from None

    monitor = _MemoryMonitor(process.pid, poll_interval=poll_interval)
    monitor.start()

    try:
        stdout_bytes, stderr_bytes = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        process.communicate()
        monitor.stop()
        elapsed = time.perf_counter() - start_time
        raise RenderError(
            renderer_name=cmd[0],
            reason=f"Process timed out after {elapsed:.1f}s (limit: {timeout}s)",
            exit_code=-1,
        ) from None
    finally:
        monitor.stop()

    elapsed = time.perf_counter() - start_time

    return SubprocessResult(
        exit_code=process.returncode,
        stdout=stdout_bytes.decode("utf-8", errors="replace"),
        stderr=stderr_bytes.decode("utf-8", errors="replace"),
        elapsed_seconds=elapsed,
        peak_memory_mb=monitor.peak_mb,
    )


# ---------------------------------------------------------------------------
# In-process timer
# ---------------------------------------------------------------------------


@dataclass
class InProcessTimerResult:
    """Result of an in-process timed execution.

    Attributes:
        elapsed_seconds: Wall-clock time for the timed block.
        peak_memory_mb: Peak RSS during execution (includes interpreter).
        baseline_memory_mb: RSS before the timed block started.
    """

    elapsed_seconds: float = 0.0
    peak_memory_mb: float = 0.0
    baseline_memory_mb: float = 0.0


class InProcessTimer:
    """Context manager for timing in-process operations.

    Used for renderers that expose a Python API (e.g., Mitsuba 3).

    Usage::

        timer = InProcessTimer()
        with timer:
            mi.render(scene)
        print(timer.result.elapsed_seconds)

    Memory tracking uses the current process RSS.  The
    ``baseline_memory_mb`` is recorded at entry for rough isolation
    of render-specific memory from interpreter overhead.
    """

    def __init__(self, poll_interval: float = 0.2) -> None:
        self._poll_interval = poll_interval
        self._result = InProcessTimerResult()
        self._monitor: _MemoryMonitor | None = None
        self._start_time: float = 0.0

    @property
    def result(self) -> InProcessTimerResult:
        """Timing and memory result (populated after context exit)."""
        return self._result

    def __enter__(self) -> InProcessTimer:
        proc = psutil.Process(os.getpid())
        self._result.baseline_memory_mb = proc.memory_info().rss / (1024 * 1024)

        self._monitor = _MemoryMonitor(os.getpid(), poll_interval=self._poll_interval)
        self._monitor.start()
        self._start_time = time.perf_counter()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> None:
        self._result.elapsed_seconds = time.perf_counter() - self._start_time
        if self._monitor is not None:
            self._monitor.stop()
            self._result.peak_memory_mb = self._monitor.peak_mb


# ---------------------------------------------------------------------------
# Result builder
# ---------------------------------------------------------------------------


@dataclass
class RenderResultBuilder:
    """Accumulates data for constructing a ``RenderResult``.

    Adapters populate the builder during render execution, then call
    ``build()`` to get a validated model with auto-detected hardware.
    """

    renderer: str = ""
    scene: str = ""
    output_path: str = ""
    render_time_seconds: float = 0.0
    peak_memory_mb: float = 0.0
    settings: RenderSettings = field(default_factory=RenderSettings)
    metadata: dict[str, Any] = field(default_factory=dict)

    def build(self) -> RenderResult:
        """Construct a validated ``RenderResult`` with current hardware."""
        hardware = detect_hardware()
        return RenderResult(
            renderer=self.renderer,
            scene=self.scene,
            output_path=self.output_path,
            render_time_seconds=self.render_time_seconds,
            peak_memory_mb=self.peak_memory_mb,
            settings=self.settings,
            hardware=hardware,
            timestamp=datetime.now(tz=timezone.utc).isoformat(),
            metadata=self.metadata,
        )


# ---------------------------------------------------------------------------
# BenchmarkRunner — skeleton for Phase 18
# ---------------------------------------------------------------------------


class BenchmarkRunner:
    """Orchestrates benchmark execution across renderers and scenes.

    Manages adapter invocation, timing, memory monitoring, and result
    collection.  Full implementation in Phase 18.
    """
