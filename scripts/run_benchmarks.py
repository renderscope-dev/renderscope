#!/usr/bin/env python3
"""RenderScope batch benchmark orchestrator.

Reads ``benchmark_config.yaml``, loops through all enabled renderer × scene
combinations, calls ``renderscope benchmark`` for each, collects results into
``data/benchmarks/``, and produces a summary report.

Usage examples::

    # Run all enabled combinations
    python scripts/run_benchmarks.py

    # Dry run — show what would be executed
    python scripts/run_benchmarks.py --dry-run

    # Run specific renderer(s)
    python scripts/run_benchmarks.py --renderer pbrt mitsuba3

    # Run specific scene(s)
    python scripts/run_benchmarks.py --scene cornell-box

    # Skip combinations that already have results
    python scripts/run_benchmarks.py --skip-existing

    # Also generate reference renders (slow!)
    python scripts/run_benchmarks.py --include-reference

    # Use a custom config file
    python scripts/run_benchmarks.py --config my_config.yaml

    # Verbose output (show renderer stdout/stderr)
    python scripts/run_benchmarks.py --verbose
"""

from __future__ import annotations

import argparse
import json
import platform
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Ensure the script works when invoked directly from the repo root.
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent

# ---------------------------------------------------------------------------
# Third-party imports — graceful degradation.
# ---------------------------------------------------------------------------
try:
    import yaml
except ImportError:
    sys.exit(
        "ERROR: PyYAML is required.\n"
        "Install it with:  pip install pyyaml\n"
        "Or:               pip install -r scripts/requirements-scripts.txt"
    )

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import (
        BarColumn,
        Progress,
        SpinnerColumn,
        TextColumn,
        TimeElapsedColumn,
    )
    from rich.table import Table
    from rich.text import Text
except ImportError:
    sys.exit(
        "ERROR: Rich is required for terminal output.\n"
        "Install it with:  pip install rich\n"
        "Or:               pip install -r scripts/requirements-scripts.txt"
    )

console = Console()
err_console = Console(stderr=True)

# ---------------------------------------------------------------------------
# Configuration models
# ---------------------------------------------------------------------------

_DEFAULT_RESOLUTION = (1920, 1080)
_DEFAULT_SPP = 1024
_DEFAULT_MAX_BOUNCES = 8
_DEFAULT_TIMEOUT = 3600
_DEFAULT_CONVERGENCE = [1, 4, 16, 64, 256, 1024]
_DEFAULT_OUTPUT_FORMAT = "exr"
_MIN_FREE_DISK_GB = 10

# Memory estimates (MB) for stress scenes — used for warnings only.
_SCENE_MEMORY_ESTIMATES: dict[str, int] = {
    "san-miguel": 16_000,   # ~16 GB estimated minimum
    "bmw": 8_000,           # ~8 GB estimated minimum
    "classroom": 6_000,     # ~6 GB estimated minimum
}


@dataclass(frozen=True)
class RenderSettings:
    """Merged render settings for one benchmark run."""

    resolution: tuple[int, int] = _DEFAULT_RESOLUTION
    samples_per_pixel: int | None = _DEFAULT_SPP
    max_bounces: int = _DEFAULT_MAX_BOUNCES
    timeout_seconds: int = _DEFAULT_TIMEOUT
    convergence_checkpoints: list[int] = field(
        default_factory=lambda: list(_DEFAULT_CONVERGENCE)
    )
    output_format: str = _DEFAULT_OUTPUT_FORMAT
    gpu_enabled: bool = False
    frame_count: int | None = None
    warmup_frames: int | None = None
    msaa_samples: int | None = None
    ospray_renderer: str | None = None


@dataclass(frozen=True)
class SceneConfig:
    id: str
    enabled: bool = True
    settings_override: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RendererConfig:
    id: str
    enabled: bool = True
    paradigm: str = "path_tracing"  # path_tracing | rasterization
    settings_override: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SkipCombination:
    """A renderer x scene combination to skip, with a human-readable reason."""

    renderer: str
    scene: str
    reason: str


@dataclass(frozen=True)
class ReferenceConfig:
    renderer: str = "pbrt"
    samples_per_pixel: int = 65536
    timeout_seconds: int = 86400


@dataclass(frozen=True)
class OutputConfig:
    benchmarks_dir: str = "data/benchmarks"
    renders_dir: str = "assets/renders"
    logs_dir: str = "logs/benchmarks"


@dataclass
class BenchmarkConfig:
    version: int
    defaults: RenderSettings
    reference: ReferenceConfig
    scenes: list[SceneConfig]
    renderers: list[RendererConfig]
    output: OutputConfig
    skip_combinations: list[SkipCombination] = field(default_factory=list)


@dataclass
class RunResult:
    """Outcome of a single benchmark subprocess."""

    renderer: str
    scene: str
    status: str  # success | failed | timeout | skipped | not_found
    paradigm: str = "path_tracing"  # path_tracing | rasterization
    elapsed: float = 0.0
    render_time: float | None = None
    peak_memory_mb: float | None = None
    frame_time_ms_median: float | None = None
    returncode: int | None = None
    error: str = ""
    output_json: str = ""
    output_image: str = ""

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "renderer": self.renderer,
            "scene": self.scene,
            "status": self.status,
            "paradigm": self.paradigm,
        }
        if self.status == "success":
            d["render_time_seconds"] = self.render_time
            d["peak_memory_mb"] = self.peak_memory_mb
            d["output_json"] = self.output_json
            d["output_image"] = self.output_image
            if self.frame_time_ms_median is not None:
                d["frame_time_ms_median"] = self.frame_time_ms_median
        elif self.status in ("failed", "timeout"):
            d["elapsed_seconds"] = self.elapsed
            d["error"] = self.error
            if self.returncode is not None:
                d["returncode"] = self.returncode
        elif self.status == "skipped":
            d["reason"] = self.error
        return d


# ---------------------------------------------------------------------------
# Config loading and validation
# ---------------------------------------------------------------------------


def _parse_resolution(raw: Any) -> tuple[int, int]:
    """Convert a YAML list ``[w, h]`` into a ``(w, h)`` tuple."""
    if isinstance(raw, (list, tuple)) and len(raw) == 2:
        w, h = int(raw[0]), int(raw[1])
        if w > 0 and h > 0:
            return (w, h)
    msg = f"Invalid resolution value: {raw!r}. Expected [width, height] with positive ints."
    raise ValueError(msg)


def _build_render_settings(raw: dict[str, Any]) -> RenderSettings:
    """Build a ``RenderSettings`` from the ``defaults`` section."""
    res = raw.get("resolution", list(_DEFAULT_RESOLUTION))
    spp_raw = raw.get("samples_per_pixel", _DEFAULT_SPP)
    spp: int | None = None if spp_raw is None else int(spp_raw)
    return RenderSettings(
        resolution=_parse_resolution(res),
        samples_per_pixel=spp,
        max_bounces=int(raw.get("max_bounces", _DEFAULT_MAX_BOUNCES)),
        timeout_seconds=int(raw.get("timeout_seconds", _DEFAULT_TIMEOUT)),
        convergence_checkpoints=[
            int(x) for x in raw.get("convergence_checkpoints", _DEFAULT_CONVERGENCE)
        ],
        output_format=str(raw.get("output_format", _DEFAULT_OUTPUT_FORMAT)),
        gpu_enabled=bool(raw.get("gpu_enabled", False)),
        frame_count=int(raw["frame_count"]) if raw.get("frame_count") is not None else None,
        warmup_frames=int(raw["warmup_frames"]) if raw.get("warmup_frames") is not None else None,
        msaa_samples=int(raw["msaa_samples"]) if raw.get("msaa_samples") is not None else None,
        ospray_renderer=str(raw["ospray_renderer"]) if raw.get("ospray_renderer") is not None else None,
    )


def load_config(path: Path) -> BenchmarkConfig:
    """Load and validate ``benchmark_config.yaml``."""
    if not path.is_file():
        err_console.print(f"[red]Config file not found: {path}[/red]")
        sys.exit(1)

    with open(path, encoding="utf-8") as fh:
        raw = yaml.safe_load(fh)

    if not isinstance(raw, dict):
        err_console.print("[red]Config file must contain a YAML mapping.[/red]")
        sys.exit(1)

    version = int(raw.get("version", 1))

    # Defaults
    defaults_raw = raw.get("defaults", {})
    if not isinstance(defaults_raw, dict):
        defaults_raw = {}
    defaults = _build_render_settings(defaults_raw)

    # Reference
    ref_raw = raw.get("reference", {})
    if not isinstance(ref_raw, dict):
        ref_raw = {}
    reference = ReferenceConfig(
        renderer=str(ref_raw.get("renderer", "pbrt")),
        samples_per_pixel=int(ref_raw.get("samples_per_pixel", 65536)),
        timeout_seconds=int(ref_raw.get("timeout_seconds", 86400)),
    )

    # Scenes
    scenes_raw = raw.get("scenes")
    if not isinstance(scenes_raw, list) or len(scenes_raw) == 0:
        err_console.print("[red]Config must have a non-empty 'scenes' list.[/red]")
        sys.exit(1)
    scenes: list[SceneConfig] = []
    for entry in scenes_raw:
        if not isinstance(entry, dict) or "id" not in entry:
            err_console.print(f"[red]Invalid scene entry: {entry!r}[/red]")
            sys.exit(1)
        scenes.append(
            SceneConfig(
                id=str(entry["id"]),
                enabled=bool(entry.get("enabled", True)),
                settings_override=entry.get("settings_override") or {},
            )
        )

    # Renderers
    renderers_raw = raw.get("renderers")
    if not isinstance(renderers_raw, list) or len(renderers_raw) == 0:
        err_console.print("[red]Config must have a non-empty 'renderers' list.[/red]")
        sys.exit(1)
    renderers: list[RendererConfig] = []
    for entry in renderers_raw:
        if not isinstance(entry, dict) or "id" not in entry:
            err_console.print(f"[red]Invalid renderer entry: {entry!r}[/red]")
            sys.exit(1)
        renderers.append(
            RendererConfig(
                id=str(entry["id"]),
                enabled=bool(entry.get("enabled", True)),
                paradigm=str(entry.get("paradigm", "path_tracing")),
                settings_override=entry.get("settings_override") or {},
            )
        )

    # Output
    out_raw = raw.get("output", {})
    if not isinstance(out_raw, dict):
        out_raw = {}
    output = OutputConfig(
        benchmarks_dir=str(out_raw.get("benchmarks_dir", "data/benchmarks")),
        renders_dir=str(out_raw.get("renders_dir", "assets/renders")),
        logs_dir=str(out_raw.get("logs_dir", "logs/benchmarks")),
    )

    # Skip combinations
    skip_raw = raw.get("skip_combinations", [])
    skip_combinations: list[SkipCombination] = []
    if isinstance(skip_raw, list):
        for entry in skip_raw:
            if isinstance(entry, dict) and "renderer" in entry and "scene" in entry:
                skip_combinations.append(
                    SkipCombination(
                        renderer=str(entry["renderer"]),
                        scene=str(entry["scene"]),
                        reason=str(entry.get("reason", "Incompatible combination")),
                    )
                )

    return BenchmarkConfig(
        version=version,
        defaults=defaults,
        reference=reference,
        scenes=scenes,
        renderers=renderers,
        output=output,
        skip_combinations=skip_combinations,
    )


def merge_settings(
    defaults: RenderSettings,
    scene_override: dict[str, Any],
    renderer_override: dict[str, Any],
) -> RenderSettings:
    """Merge default settings with per-scene and per-renderer overrides.

    Per-renderer overrides take precedence over per-scene overrides.
    """
    merged: dict[str, Any] = {}
    for fld in (
        "resolution",
        "samples_per_pixel",
        "max_bounces",
        "timeout_seconds",
        "convergence_checkpoints",
        "output_format",
        "gpu_enabled",
        "frame_count",
        "warmup_frames",
        "msaa_samples",
        "ospray_renderer",
    ):
        val = getattr(defaults, fld)
        if fld in scene_override:
            val = scene_override[fld]
        if fld in renderer_override:
            val = renderer_override[fld]
        merged[fld] = val

    res = merged["resolution"]
    if isinstance(res, (list, tuple)):
        merged["resolution"] = _parse_resolution(res)

    merged["convergence_checkpoints"] = [int(x) for x in merged["convergence_checkpoints"]]

    # Ensure int | None types for nullable integer fields.
    spp = merged["samples_per_pixel"]
    merged["samples_per_pixel"] = None if spp is None else int(spp)

    for int_fld in ("frame_count", "warmup_frames", "msaa_samples"):
        v = merged[int_fld]
        merged[int_fld] = int(v) if v is not None else None

    osp = merged["ospray_renderer"]
    merged["ospray_renderer"] = str(osp) if osp is not None else None

    return RenderSettings(**merged)


# ---------------------------------------------------------------------------
# Combination planning
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BenchmarkCombination:
    renderer: RendererConfig
    scene: SceneConfig
    settings: RenderSettings


def plan_combinations(
    config: BenchmarkConfig,
    renderer_filter: list[str] | None,
    scene_filter: list[str] | None,
) -> list[BenchmarkCombination]:
    """Determine which renderer × scene combinations to run."""
    scenes = [s for s in config.scenes if s.enabled]
    renderers = [r for r in config.renderers if r.enabled]

    if scene_filter:
        scenes = [s for s in scenes if s.id in scene_filter]
    if renderer_filter:
        renderers = [r for r in renderers if r.id in renderer_filter]

    combos: list[BenchmarkCombination] = []
    for renderer in renderers:
        for scene in scenes:
            settings = merge_settings(
                config.defaults,
                scene.settings_override,
                renderer.settings_override,
            )
            combos.append(BenchmarkCombination(renderer=renderer, scene=scene, settings=settings))

    return combos


# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------


def check_renderscope_cli() -> str | None:
    """Check that ``renderscope`` is installed and accessible. Return version or None."""
    renderscope_path = shutil.which("renderscope")
    if renderscope_path is None:
        return None
    try:
        result = subprocess.run(
            ["renderscope", "version"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        return result.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def detect_installed_renderers() -> set[str]:
    """Probe for installed renderers via the registry (if importable)."""
    installed: set[str] = set()
    try:
        from renderscope.core.registry import registry

        for adapter in registry.all():
            version = adapter.detect()
            if version is not None:
                installed.add(adapter.name)
    except ImportError:
        # Fall back to ``renderscope list`` subprocess.
        try:
            result = subprocess.run(
                ["renderscope", "list", "--installed-only"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0:
                for line in result.stdout.splitlines():
                    stripped = line.strip()
                    if stripped and not stripped.startswith(("-", "=", "#", "Renderer")):
                        # First column is typically the renderer id.
                        parts = stripped.split()
                        if parts:
                            installed.add(parts[0].lower())
        except Exception:
            pass
    return installed


def check_scene_exists(scene_id: str) -> bool:
    """Return True if the scene's metadata JSON exists."""
    scene_json = _REPO_ROOT / "data" / "scenes" / f"{scene_id}.json"
    return scene_json.is_file()


def check_disk_space(path: Path) -> float:
    """Return free disk space in GB at *path*."""
    try:
        usage = shutil.disk_usage(str(path))
        return usage.free / (1024**3)
    except Exception:
        return float("inf")


def get_hardware_info() -> dict[str, Any]:
    """Collect basic hardware information for the batch summary."""
    info: dict[str, Any] = {
        "cpu": platform.processor() or platform.machine(),
        "os": f"{platform.system()} {platform.release()}",
        "ram_gb": 0,
        "python": platform.python_version(),
    }
    try:
        import psutil

        info["ram_gb"] = round(psutil.virtual_memory().total / (1024**3), 1)
        info["cpu"] = platform.processor() or platform.machine()
    except ImportError:
        pass
    # Try to detect GPU
    try:
        from renderscope.utils.hardware import detect_hardware

        hw = detect_hardware()
        info["cpu"] = hw.cpu
        info["ram_gb"] = hw.ram_gb
        if hw.gpu:
            info["gpu"] = hw.gpu
        info["os"] = hw.os
    except Exception:
        pass
    return info


# ---------------------------------------------------------------------------
# Skip / compatibility / memory checks
# ---------------------------------------------------------------------------


def should_skip(
    renderer_id: str, scene_id: str, config: BenchmarkConfig
) -> str | None:
    """Check if this combination is in the skip list.

    Returns the skip reason string, or ``None`` if the combination is allowed.
    """
    for skip in config.skip_combinations:
        if skip.renderer == renderer_id and skip.scene == scene_id:
            return skip.reason
    return None


def _load_scene_metadata(scene_id: str) -> dict[str, Any]:
    """Load a scene's metadata JSON from ``data/scenes/<id>.json``."""
    path = _REPO_ROOT / "data" / "scenes" / f"{scene_id}.json"
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))  # type: ignore[no-any-return]
    except (json.JSONDecodeError, OSError):
        return {}


# Hardcoded renderer → supported scene format map.
# Mirrors the adapter ``supported_formats()`` without importing the adapter
# registry (the script may run in a different Python environment).
_RENDERER_FORMATS: dict[str, set[str]] = {
    "pbrt": {"pbrt"},
    "mitsuba3": {"xml", "obj", "ply", "serialized"},
    "blender-cycles": {"blend", "obj", "fbx", "gltf", "glb"},
    "luxcore": {"obj", "ply", "blend"},
    "appleseed": {"obj", "ply"},
    "filament": {"gltf", "glb"},
    "ospray": {"obj", "gltf", "glb", "ply"},
}


def check_format_compatibility(renderer_id: str, scene_id: str) -> tuple[bool, str]:
    """Check if the renderer can read any of the scene's available formats.

    Returns:
        ``(compatible, detail_message)``
    """
    scene_meta = _load_scene_metadata(scene_id)
    scene_formats = set(scene_meta.get("available_formats", []))
    if not scene_formats:
        # No format info available — assume compatible (don't block).
        return True, "No format metadata for scene; assuming compatible"

    renderer_formats = _RENDERER_FORMATS.get(renderer_id, set())
    if not renderer_formats:
        # Unknown renderer — assume compatible.
        return True, "Unknown renderer format support; assuming compatible"

    overlap = scene_formats & renderer_formats
    if overlap:
        return True, f"Compatible formats: {', '.join(sorted(overlap))}"

    return (
        False,
        f"No compatible format: scene has {sorted(scene_formats)}, "
        f"renderer supports {sorted(renderer_formats)}",
    )


def check_memory_for_scene(scene_id: str) -> tuple[bool, int]:
    """Check if available RAM is likely sufficient for this scene.

    Returns:
        ``(sufficient, available_mb)``.  Always returns ``True`` when
        ``psutil`` is unavailable or the scene has no known estimate.
    """
    estimate_mb = _SCENE_MEMORY_ESTIMATES.get(scene_id)
    if estimate_mb is None:
        return True, 0

    try:
        import psutil

        available_mb = int(psutil.virtual_memory().available / (1024 * 1024))
        return available_mb >= estimate_mb, available_mb
    except ImportError:
        return True, 0


# ---------------------------------------------------------------------------
# Benchmark execution
# ---------------------------------------------------------------------------


def run_single_benchmark(
    combo: BenchmarkCombination,
    config: BenchmarkConfig,
    root: Path,
    verbose: bool = False,
) -> RunResult:
    """Execute a single ``renderscope benchmark`` subprocess.

    Builds a paradigm-aware command:
    - **path_tracing**: ``--samples``, ``--convergence``, ``--max-bounces``
    - **rasterization**: no SPP flags; adapter handles frame counting internally
    """
    renderer_id = combo.renderer.id
    scene_id = combo.scene.id
    settings = combo.settings
    paradigm = combo.renderer.paradigm

    # Output paths.
    benchmarks_dir = root / config.output.benchmarks_dir / scene_id
    renders_dir = root / config.output.renders_dir / scene_id
    benchmarks_dir.mkdir(parents=True, exist_ok=True)
    renders_dir.mkdir(parents=True, exist_ok=True)

    output_json = benchmarks_dir / f"{renderer_id}.json"

    # Output image path depends on paradigm.
    if paradigm == "rasterization":
        output_image = renders_dir / f"{renderer_id}_frame.png"
    else:
        spp = settings.samples_per_pixel or _DEFAULT_SPP
        ext = settings.output_format if settings.output_format != "exr" else "exr"
        output_image = renders_dir / f"{renderer_id}_{spp}spp.{ext}"

    # Use a temp file for the benchmark runner's output, then move atomically.
    tmp_json = None
    try:
        tmp_fd, tmp_json_path = tempfile.mkstemp(suffix=".json", prefix=f"rs-bench-{renderer_id}-{scene_id}-")
        tmp_json = Path(tmp_json_path)
        # Close the fd immediately — subprocess writes to the path.
        import os

        os.close(tmp_fd)

        w, h = settings.resolution
        cmd: list[str] = [
            "renderscope",
            "benchmark",
            "--renderer",
            renderer_id,
            "--scene",
            scene_id,
            "--resolution",
            f"{w}x{h}",
            "--output",
            str(tmp_json),
        ]

        if paradigm == "rasterization":
            # Real-time renderers: no SPP, no convergence tracking.
            # The adapter handles multi-frame averaging internally.
            if settings.gpu_enabled:
                cmd.append("--gpu")
        else:
            # Progressive path tracers: standard SPP-based benchmarking.
            spp = settings.samples_per_pixel or _DEFAULT_SPP
            cmd.extend(["--samples", str(spp)])
            cmd.extend(["--max-bounces", str(settings.max_bounces)])
            cmd.append("--convergence")
            if settings.gpu_enabled:
                cmd.append("--gpu")

        start = time.monotonic()

        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=settings.timeout_seconds,
            cwd=str(root),
        )

        elapsed = time.monotonic() - start

        if verbose:
            if proc.stdout.strip():
                console.print(f"[dim]  stdout: {proc.stdout.strip()[:500]}[/dim]")
            if proc.stderr.strip():
                console.print(f"[dim]  stderr: {proc.stderr.strip()[:500]}[/dim]")

        if proc.returncode == 0:
            # Parse render time, memory, and frame-time stats from the result JSON.
            render_time: float | None = None
            peak_mem: float | None = None
            frame_time_median: float | None = None
            if tmp_json.is_file():
                try:
                    result_data = json.loads(tmp_json.read_text(encoding="utf-8"))
                    results_block = result_data.get("results", {})
                    render_time = results_block.get("render_time_seconds")
                    peak_mem = results_block.get("peak_memory_mb")
                    frame_time_median = results_block.get("frame_time_ms_median")
                except Exception:
                    pass

                # Atomic move: temp -> final.
                shutil.move(str(tmp_json), str(output_json))
                tmp_json = None

            return RunResult(
                renderer=renderer_id,
                scene=scene_id,
                status="success",
                paradigm=paradigm,
                elapsed=elapsed,
                render_time=render_time,
                peak_memory_mb=peak_mem,
                frame_time_ms_median=frame_time_median,
                returncode=0,
                output_json=str(output_json.relative_to(root)),
                output_image=str(output_image.relative_to(root)),
            )

        # Non-zero exit.
        return RunResult(
            renderer=renderer_id,
            scene=scene_id,
            status="failed",
            paradigm=paradigm,
            elapsed=elapsed,
            returncode=proc.returncode,
            error=proc.stderr.strip()[:2000] or f"Exit code {proc.returncode}",
        )

    except subprocess.TimeoutExpired:
        return RunResult(
            renderer=renderer_id,
            scene=scene_id,
            status="timeout",
            paradigm=paradigm,
            elapsed=float(settings.timeout_seconds),
            error=f"Timed out after {settings.timeout_seconds}s",
        )

    except FileNotFoundError:
        return RunResult(
            renderer=renderer_id,
            scene=scene_id,
            status="not_found",
            paradigm=paradigm,
            error="renderscope CLI not found. Is it installed? (pip install -e python/)",
        )

    finally:
        # Clean up temp file if it wasn't moved.
        if tmp_json is not None and tmp_json.is_file():
            try:
                tmp_json.unlink()
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Summary reporting
# ---------------------------------------------------------------------------


def _fmt_time(seconds: float | None) -> str:
    if seconds is None:
        return "—"
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    if minutes < 60:
        return f"{minutes}m {secs:.0f}s"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h {mins}m {secs:.0f}s"


def _fmt_memory(mb: float | None) -> str:
    if mb is None:
        return "—"
    if mb >= 1024:
        return f"{mb / 1024:.1f} GB"
    return f"{mb:.0f} MB"


def _status_icon(status: str) -> str:
    icons = {
        "success": "[green]\u2705[/green]",
        "failed": "[red]\u274c[/red]",
        "timeout": "[yellow]\u23f0[/yellow]",
        "skipped": "[dim]\u23ed\ufe0f[/dim]",
        "not_found": "[red]\u2753[/red]",
    }
    return icons.get(status, status)


_PARADIGM_LABELS = {
    "path_tracing": "PT",
    "rasterization": "RT",
    "scientific_visualization": "SV",
}


def _fmt_render_time(result: RunResult) -> str:
    """Format render time with paradigm-awareness.

    Rasterization results show median frame time in ms; path tracing shows
    total render time.
    """
    if result.paradigm == "rasterization" and result.frame_time_ms_median is not None:
        return f"{result.frame_time_ms_median:.1f}ms (med)"
    return _fmt_time(result.render_time)


def print_summary_table(results: list[RunResult], total_elapsed: float) -> None:
    """Print a Rich table summarising the batch run."""
    table = Table(show_header=True, header_style="bold", padding=(0, 1))
    table.add_column("Renderer", style="cyan", min_width=16)
    table.add_column("Scene", min_width=16)
    table.add_column("Paradigm", min_width=8, justify="center")
    table.add_column("Time", min_width=14, justify="right")
    table.add_column("Memory", min_width=10, justify="right")
    table.add_column("Status", min_width=8, justify="center")

    for r in results:
        table.add_row(
            r.renderer,
            r.scene,
            _PARADIGM_LABELS.get(r.paradigm, r.paradigm),
            _fmt_render_time(r),
            _fmt_memory(r.peak_memory_mb),
            _status_icon(r.status),
        )

    console.print()
    console.print(Panel(table, title="Batch Summary", border_style="bright_blue"))

    succeeded = sum(1 for r in results if r.status == "success")
    failed = sum(1 for r in results if r.status == "failed")
    timed_out = sum(1 for r in results if r.status == "timeout")
    skipped = sum(1 for r in results if r.status == "skipped")

    parts: list[str] = [f"[green]Completed: {succeeded}[/green]"]
    if failed:
        parts.append(f"[red]Failed: {failed}[/red]")
    if timed_out:
        parts.append(f"[yellow]Timed out: {timed_out}[/yellow]")
    if skipped:
        parts.append(f"[dim]Skipped: {skipped}[/dim]")
    parts.append(f"Total time: {_fmt_time(total_elapsed)}")

    console.print("  " + " | ".join(parts))
    console.print("  PT = Path Tracing (SPP-based)    RT = Real-Time (frame-averaged)")
    console.print()


def save_batch_summary(
    results: list[RunResult],
    total_elapsed: float,
    config_path: str,
    hardware: dict[str, Any],
    logs_dir: Path,
) -> None:
    """Write machine-readable and human-readable batch summaries."""
    logs_dir.mkdir(parents=True, exist_ok=True)

    batch_id = datetime.now(tz=timezone.utc).isoformat(timespec="seconds")

    summary: dict[str, Any] = {
        "batch_id": batch_id,
        "config_file": config_path,
        "total_combinations": len(results),
        "completed": sum(1 for r in results if r.status == "success"),
        "failed": sum(1 for r in results if r.status in ("failed", "timeout")),
        "skipped": sum(1 for r in results if r.status == "skipped"),
        "total_elapsed_seconds": round(total_elapsed, 2),
        "hardware": hardware,
        "results": [r.to_dict() for r in results],
    }

    # JSON
    json_path = logs_dir / "batch_summary.json"
    tmp_path = json_path.with_suffix(".json.tmp")
    tmp_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    shutil.move(str(tmp_path), str(json_path))

    # Human-readable text
    txt_path = logs_dir / "batch_summary.txt"
    lines: list[str] = [
        f"RenderScope Batch Summary — {batch_id}",
        "=" * 60,
        f"Config:      {config_path}",
        f"Hardware:    {hardware.get('cpu', 'unknown')}",
    ]
    if "gpu" in hardware:
        lines.append(f"             {hardware['gpu']}")
    lines.extend(
        [
            f"             {hardware.get('ram_gb', '?')} GB RAM, {hardware.get('os', 'unknown')}",
            "",
            f"Total:       {len(results)} combinations",
            f"Completed:   {summary['completed']}",
            f"Failed:      {summary['failed']}",
            f"Skipped:     {summary['skipped']}",
            f"Time:        {_fmt_time(total_elapsed)}",
            "",
            f"{'Renderer':<20} {'Scene':<20} {'Type':>4} {'Time':>14} {'Memory':>10} {'Status':>8}",
            "-" * 80,
        ]
    )
    for r in results:
        t = _fmt_render_time(r) if r.status == "success" else "---"
        m = _fmt_memory(r.peak_memory_mb) if r.status == "success" else "---"
        paradigm_label = _PARADIGM_LABELS.get(r.paradigm, r.paradigm[:4])
        lines.append(f"{r.renderer:<20} {r.scene:<20} {paradigm_label:>4} {t:>14} {m:>10} {r.status:>8}")

    # Failed details
    failures = [r for r in results if r.status in ("failed", "timeout")]
    if failures:
        lines.extend(["", "Failures:", "-" * 72])
        for r in failures:
            lines.append(f"  {r.renderer} x {r.scene}: {r.error[:200]}")

    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def save_error_log(result: RunResult, logs_dir: Path) -> None:
    """Save detailed error info for a failed benchmark."""
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_path = logs_dir / f"{result.scene}_{result.renderer}_error.log"
    lines = [
        f"Renderer: {result.renderer}",
        f"Scene:    {result.scene}",
        f"Status:   {result.status}",
        f"Elapsed:  {result.elapsed:.1f}s",
    ]
    if result.returncode is not None:
        lines.append(f"Exit code: {result.returncode}")
    lines.extend(["", "Error output:", "-" * 40, result.error])
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# Dry-run display
# ---------------------------------------------------------------------------


def print_dry_run(
    combos: list[BenchmarkCombination],
    skipped: list[tuple[str, str, str]] | None = None,
) -> None:
    """Print the execution plan without running anything.

    Args:
        combos: Combinations that will be executed.
        skipped: Optional list of ``(renderer, scene, reason)`` that were skipped.
    """
    table = Table(
        title="Benchmark Execution Plan (Dry Run)",
        show_header=True,
        header_style="bold",
        padding=(0, 1),
    )
    table.add_column("#", style="dim", justify="right", min_width=3)
    table.add_column("Renderer", style="cyan", min_width=16)
    table.add_column("Scene", min_width=16)
    table.add_column("Paradigm", min_width=8, justify="center")
    table.add_column("Resolution", min_width=12)
    table.add_column("SPP", min_width=6, justify="right")
    table.add_column("Timeout", min_width=8, justify="right")
    table.add_column("GPU", min_width=5, justify="center")

    for idx, combo in enumerate(combos, 1):
        s = combo.settings
        w, h = s.resolution
        paradigm_label = _PARADIGM_LABELS.get(combo.renderer.paradigm, combo.renderer.paradigm)
        spp_str = str(s.samples_per_pixel) if s.samples_per_pixel is not None else "N/A"
        table.add_row(
            str(idx),
            combo.renderer.id,
            combo.scene.id,
            paradigm_label,
            f"{w}\u00d7{h}",
            spp_str,
            _fmt_time(float(s.timeout_seconds)),
            "\u2705" if s.gpu_enabled else "\u274c",
        )

    console.print()
    console.print(table)
    console.print(f"\n  Total combinations: [bold]{len(combos)}[/bold]")

    if skipped:
        console.print(f"\n  [dim]Skipped combinations ({len(skipped)}):[/dim]")
        for renderer, scene, reason in skipped:
            console.print(f"    [dim]{renderer} x {scene}: {reason}[/dim]")

    console.print()


# ---------------------------------------------------------------------------
# CLI argument parser
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="RenderScope batch benchmark orchestrator.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python scripts/run_benchmarks.py --dry-run\n"
            "  python scripts/run_benchmarks.py --renderer pbrt mitsuba3\n"
            "  python scripts/run_benchmarks.py --scene cornell-box --skip-existing\n"
            "  python scripts/run_benchmarks.py --include-reference --verbose\n"
        ),
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=_SCRIPT_DIR / "benchmark_config.yaml",
        help="Path to benchmark config YAML (default: scripts/benchmark_config.yaml).",
    )
    parser.add_argument(
        "--renderer",
        nargs="*",
        metavar="ID",
        help="Only run these renderer(s). Omit to run all enabled.",
    )
    parser.add_argument(
        "--scene",
        nargs="*",
        metavar="ID",
        help="Only run these scene(s). Omit to run all enabled.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be executed without running anything.",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip combinations that already have a result JSON.",
    )
    parser.add_argument(
        "--include-reference",
        action="store_true",
        help="Also generate reference renders (very slow).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show renderer stdout/stderr.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Override the base output directory (default: from config).",
    )
    return parser


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    # ── Load config ──────────────────────────────────────────────────────
    config_path: Path = args.config.resolve()
    config = load_config(config_path)

    if args.output_dir:
        config.output = OutputConfig(
            benchmarks_dir=str(args.output_dir / "benchmarks"),
            renders_dir=str(args.output_dir / "renders"),
            logs_dir=str(args.output_dir / "logs"),
        )

    # ── Plan combinations ────────────────────────────────────────────────
    combos = plan_combinations(config, args.renderer, args.scene)

    if not combos:
        err_console.print("[yellow]No matching renderer \u00d7 scene combinations found.[/yellow]")
        err_console.print(
            "Check that your --renderer/--scene filters match enabled entries in the config."
        )
        sys.exit(1)

    # ── Apply skip-combinations filter ──────────────────────────────────
    skip_info: list[tuple[str, str, str]] = []  # (renderer, scene, reason)
    filtered_combos: list[BenchmarkCombination] = []
    for combo in combos:
        skip_reason = should_skip(combo.renderer.id, combo.scene.id, config)
        if skip_reason:
            skip_info.append((combo.renderer.id, combo.scene.id, skip_reason))
        else:
            filtered_combos.append(combo)
    combos = filtered_combos

    # ── Dry run ──────────────────────────────────────────────────────────
    if args.dry_run:
        print_dry_run(combos, skipped=skip_info or None)
        sys.exit(0)

    # ── Pre-flight checks ────────────────────────────────────────────────
    console.print()
    console.print("[bold bright_blue]RenderScope Batch Benchmark[/bold bright_blue]")
    console.print()

    # Check renderscope CLI
    cli_version = check_renderscope_cli()
    if cli_version is None:
        err_console.print(
            "[red]renderscope CLI not found.[/red]\n"
            "Install it with: cd python && pip install -e ."
        )
        sys.exit(1)
    console.print(f"  CLI version:  [green]{cli_version}[/green]")

    # Detect installed renderers
    installed = detect_installed_renderers()
    requested = {c.renderer.id for c in combos}
    found = requested & installed
    missing = requested - installed
    console.print(
        f"  Renderers:    [green]{len(found)}[/green] of {len(requested)} installed"
        + (f"  [yellow](missing: {', '.join(sorted(missing))})[/yellow]" if missing else "")
    )

    # Check scenes
    scene_ids = {c.scene.id for c in combos}
    scenes_ok = {s for s in scene_ids if check_scene_exists(s)}
    scenes_missing = scene_ids - scenes_ok
    console.print(
        f"  Scenes:       [green]{len(scenes_ok)}[/green] of {len(scene_ids)} found"
        + (
            f"  [yellow](missing: {', '.join(sorted(scenes_missing))})[/yellow]"
            if scenes_missing
            else ""
        )
    )

    # Check disk space
    free_gb = check_disk_space(_REPO_ROOT)
    if free_gb < _MIN_FREE_DISK_GB:
        console.print(
            f"  Disk space:   [red]{free_gb:.1f} GB free — less than {_MIN_FREE_DISK_GB} GB recommended[/red]"
        )
    else:
        console.print(f"  Disk space:   [green]{free_gb:.1f} GB free[/green]")

    console.print(f"  Combinations: [bold]{len(combos)}[/bold]")
    console.print()

    # ── Print skip-combinations info ────────────────────────────────────
    if skip_info:
        console.print(f"  Skip list:    [dim]{len(skip_info)} incompatible combinations[/dim]")
        for renderer, scene, reason in skip_info:
            console.print(f"                [dim]{renderer} x {scene}: {reason}[/dim]")

    # ── Filter out missing renderers, scenes, and incompatible formats ──
    runnable: list[BenchmarkCombination] = []
    skipped_results: list[RunResult] = []

    # Record skip-combinations as skipped results.
    for renderer, scene, reason in skip_info:
        skipped_results.append(
            RunResult(
                renderer=renderer,
                scene=scene,
                status="skipped",
                error=reason,
            )
        )

    for combo in combos:
        if combo.renderer.id not in installed:
            skipped_results.append(
                RunResult(
                    renderer=combo.renderer.id,
                    scene=combo.scene.id,
                    status="skipped",
                    paradigm=combo.renderer.paradigm,
                    error=f"Renderer '{combo.renderer.id}' not installed",
                )
            )
            continue
        if combo.scene.id not in scenes_ok:
            skipped_results.append(
                RunResult(
                    renderer=combo.renderer.id,
                    scene=combo.scene.id,
                    status="skipped",
                    paradigm=combo.renderer.paradigm,
                    error=f"Scene '{combo.scene.id}' metadata not found",
                )
            )
            continue

        # Format compatibility pre-check.
        compat, compat_detail = check_format_compatibility(combo.renderer.id, combo.scene.id)
        if not compat:
            console.print(
                f"  [yellow]Skipping {combo.renderer.id} x {combo.scene.id}: {compat_detail}[/yellow]"
            )
            skipped_results.append(
                RunResult(
                    renderer=combo.renderer.id,
                    scene=combo.scene.id,
                    status="skipped",
                    paradigm=combo.renderer.paradigm,
                    error=f"Format incompatible: {compat_detail}",
                )
            )
            continue

        # Memory warning for stress scenes (warning only — does not block).
        mem_ok, available_mb = check_memory_for_scene(combo.scene.id)
        if not mem_ok:
            estimate = _SCENE_MEMORY_ESTIMATES.get(combo.scene.id, 0)
            console.print(
                f"  [yellow]Warning: {combo.scene.id} may require ~{estimate // 1024} GB RAM "
                f"but only {available_mb // 1024} GB available. Proceeding anyway.[/yellow]"
            )

        runnable.append(combo)

    # ── Skip existing ────────────────────────────────────────────────────
    if args.skip_existing:
        filtered: list[BenchmarkCombination] = []
        for combo in runnable:
            result_path = (
                _REPO_ROOT
                / config.output.benchmarks_dir
                / combo.scene.id
                / f"{combo.renderer.id}.json"
            )
            if result_path.is_file():
                try:
                    json.loads(result_path.read_text(encoding="utf-8"))
                    skipped_results.append(
                        RunResult(
                            renderer=combo.renderer.id,
                            scene=combo.scene.id,
                            status="skipped",
                            error="Result already exists (--skip-existing)",
                        )
                    )
                    console.print(
                        f"  [dim]Skipping {combo.renderer.id} \u00d7 {combo.scene.id} — result exists[/dim]"
                    )
                    continue
                except (json.JSONDecodeError, OSError):
                    pass  # Corrupt file — re-run.
            filtered.append(combo)
        runnable = filtered

    if not runnable:
        console.print("[yellow]All combinations were skipped. Nothing to run.[/yellow]")
        # Still save summary with skipped entries.
        if skipped_results:
            hardware = get_hardware_info()
            logs_dir = _REPO_ROOT / config.output.logs_dir
            save_batch_summary(
                skipped_results, 0.0, str(config_path), hardware, logs_dir
            )
        sys.exit(0)

    # ── Execute benchmarks ───────────────────────────────────────────────
    all_results: list[RunResult] = list(skipped_results)
    batch_start = time.monotonic()
    interrupted = False

    # Handle Ctrl+C gracefully.
    original_sigint = signal.getsignal(signal.SIGINT)

    def _handle_interrupt(sig: int, frame: Any) -> None:
        nonlocal interrupted
        interrupted = True
        console.print("\n[yellow]Interrupt received — finishing current render...[/yellow]")
        # Restore the original handler so a second Ctrl+C kills immediately.
        signal.signal(signal.SIGINT, original_sigint)

    signal.signal(signal.SIGINT, _handle_interrupt)

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}[/bold blue]"),
        BarColumn(bar_width=30),
        TextColumn("{task.completed}/{task.total}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Benchmarking...", total=len(runnable))

        for idx, combo in enumerate(runnable):
            if interrupted:
                # Mark remaining as skipped.
                for remaining in runnable[idx:]:
                    all_results.append(
                        RunResult(
                            renderer=remaining.renderer.id,
                            scene=remaining.scene.id,
                            status="skipped",
                            error="Interrupted by user",
                        )
                    )
                break

            label = f"{combo.renderer.id} \u00d7 {combo.scene.id}"
            progress.update(
                task,
                description=f"[{idx + 1}/{len(runnable)}] {label}",
            )

            result = run_single_benchmark(combo, config, _REPO_ROOT, verbose=args.verbose)
            all_results.append(result)

            # Save error log for failures.
            if result.status in ("failed", "timeout"):
                logs_dir = _REPO_ROOT / config.output.logs_dir
                save_error_log(result, logs_dir)

            progress.advance(task)

    # Restore signal handler.
    signal.signal(signal.SIGINT, original_sigint)

    batch_elapsed = time.monotonic() - batch_start

    # ── Summary ──────────────────────────────────────────────────────────
    print_summary_table(all_results, batch_elapsed)

    hardware = get_hardware_info()
    logs_dir = _REPO_ROOT / config.output.logs_dir
    save_batch_summary(
        all_results, batch_elapsed, str(config_path), hardware, logs_dir
    )
    console.print(f"  Batch summary saved to [bold]{logs_dir / 'batch_summary.json'}[/bold]")

    # Print next-steps hint for failures.
    failures = [r for r in all_results if r.status in ("failed", "timeout")]
    if failures:
        console.print()
        console.print("[bold yellow]Next Steps for Failures:[/bold yellow]")
        for f in failures:
            log_file = logs_dir / f"{f.scene}_{f.renderer}_error.log"
            console.print(f"  \u2022 {f.renderer} \u00d7 {f.scene}: see {log_file}")
        console.print(
            "\n  Retry failed combinations with:\n"
            "    python scripts/run_benchmarks.py --renderer "
            + " ".join(sorted({f.renderer for f in failures}))
        )

    # ── Reference renders ────────────────────────────────────────────────
    if args.include_reference:
        console.print()
        console.print("[bold bright_blue]Generating Reference Renders[/bold bright_blue]")
        console.print("  Delegating to scripts/generate_reference_renders.py ...")
        ref_script = _SCRIPT_DIR / "generate_reference_renders.py"
        if ref_script.is_file():
            ref_args: list[str] = [sys.executable, str(ref_script), "--skip-existing"]
            if args.scene:
                for s in args.scene:
                    ref_args.extend(["--scene", s])
            subprocess.run(ref_args, cwd=str(_REPO_ROOT))
        else:
            console.print(f"  [red]Reference script not found: {ref_script}[/red]")

    sys.exit(0)


if __name__ == "__main__":
    main()
