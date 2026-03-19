"""CSV export for benchmark results.

Produces a flat table with one row per renderer x scene result, suitable for
import into Excel, Google Sheets, R, or Pandas.
"""

from __future__ import annotations

import csv
import io
import logging
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from pathlib import Path

from renderscope.report._loader import load_results_raw

logger = logging.getLogger(__name__)

# Column names in export order.
CSV_COLUMNS: list[str] = [
    "scene",
    "renderer",
    "render_time_seconds",
    "peak_memory_mb",
    "psnr_db",
    "ssim",
    "mse",
    "samples",
    "resolution_width",
    "resolution_height",
    "cpu",
    "gpu",
    "ram_gb",
    "os",
    "timestamp",
]


class CSVExporter:
    """Export benchmark results as a CSV file."""

    def __init__(self, results_path: Path) -> None:
        """Load and validate results from a JSON file.

        Args:
            results_path: Path to the benchmark results JSON file.

        Raises:
            FileNotFoundError: If *results_path* does not exist.
            json.JSONDecodeError: If the file is not valid JSON.
        """
        self._results_path = results_path
        self._raw = load_results_raw(results_path)

    def export(self, output: Path | None = None) -> str:
        """Export results as CSV.

        If *output* is provided, writes to that file.
        Always returns the CSV string.
        """
        buf = io.StringIO()
        writer = csv.writer(buf, lineterminator="\n")
        writer.writerow(CSV_COLUMNS)

        for entry in self._raw:
            row = _entry_to_row(entry)
            writer.writerow(row)

        text = buf.getvalue()

        if output is not None:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(text, encoding="utf-8")
            logger.info("CSV report saved to %s", output)

        return text


def _get_nested(data: dict[str, Any], *keys: str) -> Any:
    """Safely traverse nested dicts, returning ``None`` on missing keys."""
    current: Any = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        else:
            return None
    return current


def _fmt(value: Any) -> str:
    """Format a value for CSV: ``None`` becomes empty string."""
    if value is None:
        return ""
    return str(value)


def _entry_to_row(entry: dict[str, Any]) -> list[str]:
    """Convert a single benchmark result dict to a CSV row."""
    results = entry.get("results", {})
    if not isinstance(results, dict):
        results = {}

    quality = entry.get("quality_vs_reference") or {}
    if not isinstance(quality, dict):
        quality = {}

    settings = entry.get("settings", {})
    if not isinstance(settings, dict):
        settings = {}

    hardware = entry.get("hardware", {})
    if not isinstance(hardware, dict):
        hardware = {}

    return [
        _fmt(entry.get("scene")),
        _fmt(entry.get("renderer")),
        _fmt(_get_nested(results, "render_time_seconds")),
        _fmt(_get_nested(results, "peak_memory_mb")),
        _fmt(quality.get("psnr")),
        _fmt(quality.get("ssim")),
        _fmt(quality.get("mse")),
        _fmt(settings.get("samples")),
        _fmt(settings.get("width")),
        _fmt(settings.get("height")),
        _fmt(hardware.get("cpu")),
        _fmt(hardware.get("gpu")),
        _fmt(hardware.get("ram_gb")),
        _fmt(hardware.get("os")),
        _fmt(entry.get("timestamp")),
    ]
