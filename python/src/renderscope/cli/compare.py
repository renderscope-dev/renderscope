"""The ``renderscope compare`` command — compute image quality metrics.

Compares a pair of images (or entire directories) and reports PSNR, SSIM,
MSE, and optionally LPIPS.  Can also generate absolute-difference images
and false-color SSIM heatmaps.
"""

from __future__ import annotations

import csv
import io
import json
import math
from pathlib import Path

import numpy as np
import typer
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from renderscope.core.metrics import ImageMetrics
from renderscope.utils.console import console, err_console
from renderscope.utils.image_io import (
    SUPPORTED_EXTENSIONS,
    is_hdr,
    load_image,
    save_image,
    tonemap,
)

# Default metrics when none are specified.
_DEFAULT_METRICS: list[str] = ["psnr", "ssim", "mse"]

# All metrics the command understands.
_KNOWN_METRICS: frozenset[str] = frozenset({"psnr", "ssim", "mse", "lpips"})

# Valid colormap names.
_VALID_COLORMAPS: frozenset[str] = frozenset({"viridis", "inferno", "magma"})


# ---------------------------------------------------------------------------
# Quality-rating helpers
# ---------------------------------------------------------------------------


def _quality_bar(score: float) -> str:
    """Return a 10-character Unicode bar for a 0-1 normalized score."""
    filled = max(0, min(10, round(score * 10)))
    return "\u2588" * filled + "\u2591" * (10 - filled)


def _quality_label(metric: str, value: float) -> str:
    """Return a human-readable quality label for a metric value."""
    if math.isinf(value):
        return "Identical"

    if metric == "psnr":
        if value >= 40:
            return "Excellent"
        if value >= 30:
            return "Good"
        if value >= 20:
            return "Fair"
        return "Poor"

    if metric == "ssim":
        if value >= 0.95:
            return "Excellent"
        if value >= 0.85:
            return "Good"
        if value >= 0.70:
            return "Fair"
        return "Poor"

    if metric == "lpips":
        if value <= 0.05:
            return "Excellent"
        if value <= 0.15:
            return "Good"
        if value <= 0.30:
            return "Fair"
        return "Poor"

    # MSE and others: no quality bar.
    return ""


def _quality_score(metric: str, value: float) -> float:
    """Map a metric value to a 0-1 score for the bar chart."""
    if math.isinf(value):
        return 1.0

    if metric == "psnr":
        return min(value / 50.0, 1.0)
    if metric == "ssim":
        return max(value, 0.0)
    if metric == "lpips":
        return max(1.0 - value * 2.0, 0.0)
    # MSE: no bar.
    return 0.0


def _format_value(metric: str, value: float) -> str:
    """Format a metric value for display."""
    if math.isinf(value):
        return "\u221e dB"
    if metric == "psnr":
        return f"{value:.2f} dB"
    if metric == "ssim":
        return f"{value:.4f}"
    if metric == "mse":
        return f"{value:.6f}"
    if metric == "lpips":
        return f"{value:.4f}"
    return f"{value:.4f}"


# ---------------------------------------------------------------------------
# Metric computation
# ---------------------------------------------------------------------------


def _compute_metrics(
    ref_path: Path,
    test_path: Path,
    metric_names: list[str],
) -> dict[str, float]:
    """Load two images and compute the requested metrics."""
    ref = load_image(ref_path)
    tst = load_image(test_path)

    # Tone-map HDR images before computing metrics.
    if is_hdr(ref_path):
        ref = tonemap(ref)
    if is_hdr(test_path):
        tst = tonemap(tst)

    results: dict[str, float] = {}

    for name in metric_names:
        if name == "psnr":
            results["psnr"] = float(ImageMetrics.psnr(ref, tst))
        elif name == "ssim":
            results["ssim"] = float(ImageMetrics.ssim(ref, tst))
        elif name == "mse":
            results["mse"] = float(ImageMetrics.mse(ref, tst))
        elif name == "lpips":
            results["lpips"] = float(ImageMetrics.lpips(ref, tst))

    return results


# ---------------------------------------------------------------------------
# Output formatters
# ---------------------------------------------------------------------------


def _print_table(
    ref_path: Path,
    test_path: Path,
    metrics_dict: dict[str, float],
    *,
    extra_lines: list[str] | None = None,
) -> None:
    """Display a Rich panel with a metrics table and quality indicators."""
    height, width = _image_dimensions(ref_path)

    table = Table(show_header=True, header_style="bold", box=None, padding=(0, 2))
    table.add_column("Metric", style="cyan", min_width=8)
    table.add_column("Value", min_width=14)
    table.add_column("Quality", min_width=24)

    for metric, value in metrics_dict.items():
        fmt = _format_value(metric, value)
        label = _quality_label(metric, value)
        score = _quality_score(metric, value)

        if label:
            bar = _quality_bar(score)
            quality = Text(f"{bar} {label}")
        else:
            quality = Text("")

        table.add_row(metric.upper(), fmt, quality)

    # Build the panel content.
    lines = Text()
    lines.append("Reference: ", style="dim")
    lines.append(str(ref_path), style="bold")
    lines.append("\n")
    lines.append("Test:      ", style="dim")
    lines.append(str(test_path), style="bold")
    lines.append("\n")
    lines.append("Size:      ", style="dim")
    lines.append(f"{width} \u00d7 {height}")
    lines.append("\n")

    content = lines
    console.print()
    console.print(
        Panel(
            content,
            title="Image Comparison",
            border_style="bright_blue",
        )
    )
    console.print(table)

    if extra_lines:
        console.print()
        for line in extra_lines:
            console.print(f"  [success]\u2713[/success] {line}")

    console.print()


def _print_json(
    ref_path: Path,
    test_path: Path,
    metrics_dict: dict[str, float],
) -> None:
    """Print metrics as structured JSON."""
    height, width = _image_dimensions(ref_path)
    output = {
        "reference": str(ref_path),
        "test": str(test_path),
        "width": width,
        "height": height,
        "metrics": {k: (None if math.isinf(v) else float(v)) for k, v in metrics_dict.items()},
    }
    # Use print() to avoid Rich markup/ANSI in structured output.
    print(json.dumps(output, indent=2))


def _print_csv_row(
    ref_path: Path,
    test_path: Path,
    metrics_dict: dict[str, float],
    *,
    header: bool = True,
) -> None:
    """Print metrics as a CSV row."""
    buf = io.StringIO()
    metric_names = list(metrics_dict.keys())
    writer = csv.writer(buf)

    if header:
        writer.writerow(["reference", "test", *metric_names])

    values = ["" if math.isinf(v) else f"{v:.6f}" for v in metrics_dict.values()]
    writer.writerow([str(ref_path), str(test_path), *values])
    # Use print() to avoid Rich markup/ANSI in structured output.
    print(buf.getvalue().rstrip())


def _image_dimensions(path: Path) -> tuple[int, int]:
    """Return ``(height, width)`` without loading the full array."""
    from PIL import Image as PILImage

    with PILImage.open(str(path)) as im:
        return im.height, im.width


# ---------------------------------------------------------------------------
# Directory comparison
# ---------------------------------------------------------------------------


def _compare_directory(
    dir_a: Path,
    dir_b: Path,
    metric_names: list[str],
    output_format: str,
) -> None:
    """Compare matching image pairs across two directories."""
    stems_a = {
        p.stem: p for p in sorted(dir_a.iterdir()) if p.suffix.lower() in SUPPORTED_EXTENSIONS
    }
    stems_b = {
        p.stem: p for p in sorted(dir_b.iterdir()) if p.suffix.lower() in SUPPORTED_EXTENSIONS
    }

    matched = sorted(stems_a.keys() & stems_b.keys())
    unmatched_a = sorted(stems_a.keys() - stems_b.keys())
    unmatched_b = sorted(stems_b.keys() - stems_a.keys())

    if not matched:
        err_console.print("[warning]No matching image pairs found.[/warning]")
        if unmatched_a:
            err_console.print(f"  Only in {dir_a}: {', '.join(unmatched_a)}")
        if unmatched_b:
            err_console.print(f"  Only in {dir_b}: {', '.join(unmatched_b)}")
        raise typer.Exit(code=1)

    # Accumulate metrics for averaging.
    all_results: list[dict[str, float]] = []
    first_row = True

    for stem in matched:
        ref_path = stems_a[stem]
        test_path = stems_b[stem]

        try:
            result = _compute_metrics(ref_path, test_path, metric_names)
        except (ValueError, FileNotFoundError) as exc:
            err_console.print(f"[warning]Skipping {stem}: {exc}[/warning]")
            continue

        all_results.append(result)

        if output_format == "json":
            _print_json(ref_path, test_path, result)
        elif output_format == "csv":
            _print_csv_row(ref_path, test_path, result, header=first_row)
            first_row = False
        else:
            _print_table(ref_path, test_path, result)

    # Summary for table format.
    if output_format == "table" and all_results:
        _print_directory_summary(all_results, metric_names, len(matched))

    # Report unmatched files.
    if unmatched_a or unmatched_b:
        console.print()
        if unmatched_a:
            console.print(f"  [warning]Unmatched in {dir_a}:[/warning] {', '.join(unmatched_a)}")
        if unmatched_b:
            console.print(f"  [warning]Unmatched in {dir_b}:[/warning] {', '.join(unmatched_b)}")


def _print_directory_summary(
    all_results: list[dict[str, float]],
    metric_names: list[str],
    total_pairs: int,
) -> None:
    """Print a summary table with averaged metrics across all pairs."""
    table = Table(
        title=f"Summary ({len(all_results)}/{total_pairs} pairs)",
        show_header=True,
        header_style="bold",
    )
    table.add_column("Metric", style="cyan")
    table.add_column("Mean", min_width=14)
    table.add_column("Min", min_width=14)
    table.add_column("Max", min_width=14)

    for name in metric_names:
        values = [r[name] for r in all_results if name in r and not math.isinf(r[name])]
        if not values:
            table.add_row(name.upper(), "N/A", "N/A", "N/A")
            continue
        table.add_row(
            name.upper(),
            _format_value(name, sum(values) / len(values)),
            _format_value(name, min(values)),
            _format_value(name, max(values)),
        )

    console.print()
    console.print(table)


# ---------------------------------------------------------------------------
# CLI command
# ---------------------------------------------------------------------------


def compare_cmd(
    image_a: Path = typer.Argument(
        help="Path to the first (reference) image or directory.",
    ),
    image_b: Path = typer.Argument(
        help="Path to the second (test) image or directory.",
    ),
    metrics: list[str] | None = typer.Option(
        None,
        "--metrics",
        "-m",
        help="Metrics to compute (psnr, ssim, mse, lpips). Defaults to psnr, ssim, mse.",
    ),
    diff_image: Path | None = typer.Option(
        None,
        "--diff-image",
        help="Save the absolute difference image to this path.",
    ),
    ssim_heatmap: Path | None = typer.Option(
        None,
        "--ssim-heatmap",
        help="Save the false-color SSIM heatmap to this path.",
    ),
    amplify: float = typer.Option(
        5.0,
        "--amplify",
        help="Amplification factor for the difference image.",
    ),
    colormap: str = typer.Option(
        "inferno",
        "--colormap",
        help="Colormap for heatmaps (viridis, inferno, magma).",
    ),
    recursive: bool = typer.Option(
        False,
        "--recursive",
        help="Compare all matching images in two directories.",
    ),
    output_format: str = typer.Option(
        "table",
        "--format",
        "-f",
        help="Output format (table, json, csv).",
    ),
) -> None:
    """Compute image quality metrics between two rendered images.

    Supports PSNR, SSIM, MSE, and optionally LPIPS (requires the
    ``renderscope[ml]`` extra).  Can also generate visual difference
    maps and SSIM heatmaps.
    """
    # Resolve metric list.
    metric_names = list(metrics) if metrics else list(_DEFAULT_METRICS)

    # Validate metric names.
    unknown = set(metric_names) - _KNOWN_METRICS
    if unknown:
        err_console.print(
            f"[error]Unknown metric(s): {', '.join(sorted(unknown))}[/error]\n"
            f"Valid metrics: {', '.join(sorted(_KNOWN_METRICS))}"
        )
        raise typer.Exit(code=1)

    # Validate colormap.
    if colormap not in _VALID_COLORMAPS:
        err_console.print(
            f"[error]Unknown colormap: '{colormap}'[/error]\n"
            f"Valid colormaps: {', '.join(sorted(_VALID_COLORMAPS))}"
        )
        raise typer.Exit(code=1)

    # Directory mode.
    if recursive or (image_a.is_dir() and image_b.is_dir()):
        if not image_a.is_dir() or not image_b.is_dir():
            err_console.print(
                "[error]Both paths must be directories when using --recursive.[/error]"
            )
            raise typer.Exit(code=1)
        _compare_directory(image_a, image_b, metric_names, output_format)
        raise typer.Exit(code=0)

    # Single image pair mode.
    if not image_a.is_file():
        err_console.print(f"[error]File not found: {image_a}[/error]")
        raise typer.Exit(code=1)
    if not image_b.is_file():
        err_console.print(f"[error]File not found: {image_b}[/error]")
        raise typer.Exit(code=1)

    # Compute metrics.
    try:
        metrics_dict = _compute_metrics(image_a, image_b, metric_names)
    except (ValueError, ImportError) as exc:
        err_console.print(f"[error]{exc}[/error]")
        raise typer.Exit(code=1) from None

    # Generate optional output images.
    extra_lines: list[str] = []

    if diff_image is not None or ssim_heatmap is not None:
        ref = load_image(image_a)
        tst = load_image(image_b)

        if is_hdr(image_a):
            ref = tonemap(ref)
        if is_hdr(image_b):
            tst = tonemap(tst)

        if diff_image is not None:
            diff = ImageMetrics.absolute_diff(ref, tst)
            diff_amplified = np.clip(diff * amplify, 0.0, 1.0).astype(np.float32)
            save_image(diff_amplified, diff_image)
            extra_lines.append(f"Diff image saved: {diff_image}")

        if ssim_heatmap is not None:
            smap = ImageMetrics.ssim_map(ref, tst)
            # Show error (1 - SSIM) so brighter = more different.
            error = 1.0 - smap
            heatmap = ImageMetrics.false_color_map(error, colormap=colormap, normalize=True)
            save_image(heatmap, ssim_heatmap)
            extra_lines.append(f"SSIM heatmap saved: {ssim_heatmap}")

    # Print results.
    if output_format == "json":
        _print_json(image_a, image_b, metrics_dict)
    elif output_format == "csv":
        _print_csv_row(image_a, image_b, metrics_dict)
    else:
        _print_table(image_a, image_b, metrics_dict, extra_lines=extra_lines)

    raise typer.Exit(code=0)
