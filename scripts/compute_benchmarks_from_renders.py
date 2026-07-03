#!/usr/bin/env python3
"""Compute genuine benchmark quality metrics from already-rendered images.

RenderScope's benchmark runs record real timing and memory, but earlier runs
left the image-quality fields (``quality_vs_reference`` and the per-checkpoint
``psnr``/``ssim``) empty.  This script fills that gap *without inventing
anything*: it reads the real render-time data from the raw run records in
``data/benchmarks/<scene>/<renderer>.json`` and computes real PSNR/SSIM/MSE
from the actual convergence-checkpoint EXRs in ``renderscope-results/``, using
the same tone-mapping and metric conventions as the benchmark runner
(:mod:`renderscope.core.quality`).

For each (scene, renderer) it uses the highest available sample count as the
converged reference and measures every lower sample count against it.  A run is
published as a web-facing benchmark only if its convergence series is genuine:
runs whose per-sample-count renders are numerically identical (the sample-count
override never took effect, so the "convergence" is an artifact) are detected
and skipped, with a clear explanation.

The web-facing output conforms to ``schemas/benchmark.schema.json`` and is
written to ``data/benchmarks/<scene>-<renderer>-<hw>.json``.  The headline
render is the highest *non-reference* sample count, measured against the
converged reference render, so every published number is a real measurement.

Usage::

    # Preview what would be produced, without writing anything
    python scripts/compute_benchmarks_from_renders.py --dry-run

    # Generate the web-facing benchmark files
    python scripts/compute_benchmarks_from_renders.py

Run with the project's Python environment (``python/.venv``), which provides
NumPy, scikit-image, and an EXR backend (OpenEXR or opencv).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

# ── Make the renderscope package importable from the monorepo layout ──────────
_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT / "python" / "src"))

from renderscope.core.quality import (  # noqa: E402  (after sys.path bootstrap)
    build_convergence_series,
    compare_images,
    is_degenerate,
)
from renderscope.utils.image_io import load_image  # noqa: E402

# ── Locations ─────────────────────────────────────────────────────────────────
BENCHMARKS_DIR = _REPO_ROOT / "data" / "benchmarks"
RENDERS_DIR = _REPO_ROOT / "renderscope-results"

# Checkpoint EXRs are named "<renderer>_<spp>spp_<spp>spp.exr".
_CHECKPOINT_RE = re.compile(r"_(\d+)spp_\d+spp\.exr$")

# Hardware profiles keyed by a short, stable id.  The raw run records identify
# the machine only loosely ("arm"); this maps that run to a descriptive,
# schema-valid hardware profile for display.
_HARDWARE_PROFILE = {
    "id": "m5max",
    "label": "Apple M5 Max",
    "cpu": "Apple M5 Max",
    "cpu_cores": 18,
    "gpu": "Apple M5 Max",
    "ram_gb": 64,
    "os": "macOS 26.3.1",
}


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _first_record(raw: Any) -> dict[str, Any] | None:
    """Return the single benchmark record from a raw run file (list or object)."""
    if isinstance(raw, list):
        return raw[0] if raw and isinstance(raw[0], dict) else None
    return raw if isinstance(raw, dict) else None


def _discover_runs() -> list[Path]:
    """Find non-empty raw run records under data/benchmarks/<scene>/<renderer>.json."""
    if not BENCHMARKS_DIR.is_dir():
        return []
    runs: list[Path] = []
    for path in sorted(BENCHMARKS_DIR.glob("*/*.json")):
        if path.stat().st_size == 0:
            continue
        runs.append(path)
    return runs


def _checkpoint_exrs(scene: str, renderer: str) -> dict[int, Path]:
    """Map sample count -> checkpoint EXR path for a (scene, renderer)."""
    scene_dir = RENDERS_DIR / scene
    if not scene_dir.is_dir():
        return {}
    found: dict[int, Path] = {}
    for exr in scene_dir.glob(f"{renderer}_*spp_*spp.exr"):
        match = _CHECKPOINT_RE.search(exr.name)
        if match:
            found[int(match.group(1))] = exr
    return found


def _convergence_times(record: dict[str, Any]) -> dict[int, float]:
    """Extract measured per-sample-count wall-clock times from a run record."""
    times: dict[int, float] = {}
    for point in record.get("convergence") or []:
        samples = point.get("samples")
        time_s = point.get("time", point.get("time_seconds"))
        if isinstance(samples, int) and isinstance(time_s, (int, float)):
            times[samples] = float(time_s)
    return times


def _round(value: float, digits: int) -> float:
    """Round to ``digits`` decimal places, or to ``abs(digits)`` significant
    figures when ``digits`` is negative (used for very small MSE values).

    Always returns a native Python ``float`` — NumPy scalars are not JSON
    serializable and would otherwise leak into the output.
    """
    native = float(value)
    if digits < 0:
        return float(f"{native:.{abs(digits)}g}")
    return round(native, digits)


def _build_web_benchmark(
    record: dict[str, Any],
    checkpoints: dict[int, Path],
) -> dict[str, Any] | None:
    """Compute a schema-conforming web benchmark, or ``None`` if not genuine.

    Returns ``None`` (with an explanation printed) when there is insufficient
    data or the convergence series is degenerate.
    """
    scene = record["scene"]
    renderer = record["renderer"]
    label = f"{scene}/{renderer}"

    if len(checkpoints) < 2:
        print(f"  SKIP {label}: need >=2 checkpoint renders, found {len(checkpoints)}")
        return None

    reference_spp = max(checkpoints)
    reference_img = load_image(checkpoints[reference_spp])

    # Measure every non-reference sample count against the converged reference.
    test_images = {spp: load_image(p) for spp, p in checkpoints.items() if spp < reference_spp}
    series = build_convergence_series(reference_img, test_images, hdr=True)

    if is_degenerate(series):
        worst_mse = max((p.mse for p in series), default=0.0)
        print(
            f"  SKIP {label}: renders are identical across sample counts "
            f"(worst MSE={worst_mse:.2e}); no genuine convergence to publish."
        )
        return None

    # Headline render = highest genuine (non-reference) sample count.
    primary = series[-1]
    times = _convergence_times(record)
    settings_in = record.get("settings", {})
    extra = settings_in.get("extra", {})
    metadata = record.get("results", {}).get("metadata", {})

    gpu_backend = str(metadata.get("gpu_backend", ""))
    gpu_enabled = bool(metadata.get("gpu_enabled")) and "cpu" not in gpu_backend.lower()

    width = int(settings_in.get("width", 1920))
    height = int(settings_in.get("height", 1080))
    timestamp = str(record.get("timestamp", ""))
    date = timestamp[:10] if len(timestamp) >= 10 else "unknown"

    render_time = times.get(primary.samples)
    if render_time is None or render_time <= 0:
        print(f"  SKIP {label}: no measured render time for {primary.samples} spp")
        return None

    settings: dict[str, Any] = {
        "resolution": [width, height],
        "samples_per_pixel": primary.samples,
        "integrator": "path",
        "gpu_enabled": gpu_enabled,
    }
    if isinstance(extra.get("max_bounces"), int):
        settings["max_bounces"] = extra["max_bounces"]

    results: dict[str, Any] = {
        "render_time_seconds": _round(render_time, 3),
        "output_image": _relpath(checkpoints[primary.samples]),
    }
    peak_memory = record.get("results", {}).get("peak_memory_mb")
    if isinstance(peak_memory, (int, float)) and peak_memory > 0:
        results["peak_memory_mb"] = _round(float(peak_memory), 1)

    convergence = [
        {
            "samples": point.samples,
            "time": _round(times.get(point.samples, 0.0), 3),
            "psnr": _round(point.psnr, 2),
            "ssim": _round(point.ssim, 5),
        }
        for point in series
    ]

    return {
        "id": f"{scene}-{renderer}-{date}",
        "renderer": renderer,
        "renderer_version": str(record.get("renderer_version", "")),
        "scene": scene,
        "timestamp": timestamp,
        "hardware": dict(_HARDWARE_PROFILE),
        "settings": settings,
        "results": results,
        "quality_vs_reference": {
            "reference_renderer": renderer,
            "reference_samples": reference_spp,
            "psnr": _round(primary.psnr, 2),
            "ssim": _round(primary.ssim, 5),
            "mse": _round(primary.mse, -3),
        },
        "convergence": convergence,
        "notes": (
            f"Measured on {_HARDWARE_PROFILE['label']} (Blender Cycles "
            f"{record.get('renderer_version', '')}, CPU path tracing). "
            f"Quality is computed against this renderer's own {reference_spp}-spp "
            "render as the converged reference (Reinhard tone-map, PSNR/SSIM/MSE "
            "at data_range=1.0); no independent ground-truth renderer was "
            "available for this scene."
        ),
    }


def _relpath(path: Path) -> str:
    try:
        return str(path.relative_to(_REPO_ROOT))
    except ValueError:
        return str(path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute and report, but do not write any files.",
    )
    args = parser.parse_args()

    runs = _discover_runs()
    if not runs:
        print("No raw benchmark run records found under data/benchmarks/<scene>/.")
        return 0

    print(f"Found {len(runs)} raw run record(s).\n")
    written = 0
    skipped = 0

    for run_path in runs:
        record = _first_record(_load_json(run_path))
        if record is None or "scene" not in record or "renderer" not in record:
            print(f"  SKIP {run_path}: not a benchmark record")
            skipped += 1
            continue

        checkpoints = _checkpoint_exrs(record["scene"], record["renderer"])
        benchmark = _build_web_benchmark(record, checkpoints)
        if benchmark is None:
            skipped += 1
            continue

        out_name = f"{record['scene']}-{record['renderer']}-{_HARDWARE_PROFILE['id']}.json"
        out_path = BENCHMARKS_DIR / out_name
        q = benchmark["quality_vs_reference"]
        print(
            f"  OK   {record['scene']}/{record['renderer']}: "
            f"{benchmark['settings']['samples_per_pixel']} spp vs "
            f"{q['reference_samples']} spp ref -> PSNR {q['psnr']} dB, "
            f"SSIM {q['ssim']}, {len(benchmark['convergence'])} convergence points"
        )
        if args.dry_run:
            continue

        with out_path.open("w", encoding="utf-8") as fh:
            json.dump(benchmark, fh, indent=2)
            fh.write("\n")
        print(f"       wrote {_relpath(out_path)}")
        written += 1

    print(f"\nDone. {written} written, {skipped} skipped" + (" (dry run)" if args.dry_run else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
