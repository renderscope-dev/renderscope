"""Markdown export for benchmark results.

Produces Markdown tables that render correctly on GitHub, in Jupyter notebooks,
and in paper drafts.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from pathlib import Path

from renderscope.report._loader import load_results_raw

logger = logging.getLogger(__name__)


class MarkdownExporter:
    """Export benchmark results as Markdown tables."""

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
        """Export results as Markdown.

        If *output* is provided, writes to that file.
        Always returns the Markdown string.
        """
        sections: list[str] = []

        # Title and metadata.
        sections.append(_build_header(self._raw))

        if not self._raw:
            sections.append("*No benchmark results to display.*\n")
        else:
            # Hardware section.
            sections.append(_build_hardware_section(self._raw))

            # Per-scene tables.
            scenes = _group_by_scene(self._raw)
            for scene_id, results in scenes.items():
                sections.append(_build_scene_section(scene_id, results))

            # Summary table.
            if len(scenes) > 1 or len(self._raw) > 1:
                sections.append(_build_summary_section(self._raw))

        # Footer.
        sections.append(_build_footer(self._raw))

        text = "\n".join(sections)

        if output is not None:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(text, encoding="utf-8")
            logger.info("Markdown report saved to %s", output)

        return text


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------


def _build_header(raw: list[dict[str, Any]]) -> str:
    """Build the report title and metadata."""
    lines = ["# RenderScope Benchmark Report", ""]

    if raw:
        first = raw[0]
        version = _get(first, "hardware", "renderscope_version") or "unknown"
        timestamp = first.get("timestamp", "")
        hardware = first.get("hardware", {})

        # Count unique renderers and scenes.
        renderers = {r.get("renderer", "") for r in raw}
        scenes = {r.get("scene", "") for r in raw}

        cpu = _get(hardware, "cpu") or ""
        gpu = _get(hardware, "gpu") or "N/A"
        ram = _get(hardware, "ram_gb") or ""
        os_name = _get(hardware, "os") or ""

        lines.append(f"**Generated:** {timestamp}  ")
        lines.append(f"**RenderScope:** v{version}  ")
        lines.append(f"**System:** {cpu} / {gpu} / {_fmt_gb(ram)} RAM / {os_name}  ")
        lines.append(f"**Scope:** {len(renderers)} renderer(s), {len(scenes)} scene(s)")
    lines.append("")
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def _build_hardware_section(raw: list[dict[str, Any]]) -> str:
    """Build the hardware specifications section."""
    if not raw:
        return ""
    hw = raw[0].get("hardware", {})
    if not isinstance(hw, dict):
        return ""

    lines = ["## Hardware", ""]
    lines.append("| Spec | Value |")
    lines.append("|------|-------|")
    lines.append(
        f"| CPU | {_get(hw, 'cpu') or 'N/A'} ({_get(hw, 'cpu_cores_logical') or '?'} threads) |"
    )
    lines.append(f"| GPU | {_get(hw, 'gpu') or 'N/A'} |")
    lines.append(f"| RAM | {_fmt_gb(_get(hw, 'ram_gb'))} |")
    lines.append(f"| OS | {_get(hw, 'os') or 'N/A'} |")
    lines.append(f"| Python | {_get(hw, 'python_version') or 'N/A'} |")
    lines.append("")
    return "\n".join(lines)


def _build_scene_section(scene_id: str, results: list[dict[str, Any]]) -> str:
    """Build a per-scene result table."""
    scene_name = _format_scene_name(scene_id)
    lines = [f"## {scene_name}", ""]

    has_quality = any(_get(r, "quality_vs_reference", "psnr") is not None for r in results)

    # Build header.
    header = "| Renderer | Render Time | Peak Memory |"
    separator = "|----------|-------------|-------------|"
    if has_quality:
        header += " PSNR (dB) | SSIM | MSE |"
        separator += "-----------|------|-----|"

    lines.append(header)
    lines.append(separator)

    for r in results:
        res = r.get("results", {})
        if not isinstance(res, dict):
            res = {}
        quality = r.get("quality_vs_reference") or {}
        if not isinstance(quality, dict):
            quality = {}

        renderer = r.get("renderer", "unknown")
        time_s = res.get("render_time_seconds")
        mem_mb = res.get("peak_memory_mb")

        row = f"| {renderer} | {_fmt_time(time_s)} | {_fmt_memory(mem_mb)} |"
        if has_quality:
            psnr = quality.get("psnr")
            ssim = quality.get("ssim")
            mse = quality.get("mse")
            row += f" {_fmt_metric(psnr, '{:.1f}')} | {_fmt_metric(ssim, '{:.3f}')} | {_fmt_metric(mse, '{:.5f}')} |"

        lines.append(row)

    lines.append("")
    return "\n".join(lines)


def _build_summary_section(raw: list[dict[str, Any]]) -> str:
    """Build a summary table averaging across scenes."""
    lines = ["## Summary (Averages)", ""]

    # Group by renderer.
    renderers: dict[str, list[dict[str, Any]]] = {}
    for r in raw:
        name = r.get("renderer", "unknown")
        renderers.setdefault(name, []).append(r)

    has_quality = any(_get(r, "quality_vs_reference", "psnr") is not None for r in raw)

    header = "| Renderer | Avg Time | Avg Memory |"
    separator = "|----------|----------|------------|"
    if has_quality:
        header += " Avg PSNR | Avg SSIM |"
        separator += "----------|----------|"
    header += " Scenes |"
    separator += "--------|"

    lines.append(header)
    lines.append(separator)

    for renderer, results in sorted(renderers.items()):
        times = [
            _get(r, "results", "render_time_seconds")
            for r in results
            if _get(r, "results", "render_time_seconds") is not None
        ]
        mems = [
            _get(r, "results", "peak_memory_mb")
            for r in results
            if _get(r, "results", "peak_memory_mb") is not None
        ]
        psnrs = [
            _get(r, "quality_vs_reference", "psnr")
            for r in results
            if _get(r, "quality_vs_reference", "psnr") is not None
        ]
        ssims = [
            _get(r, "quality_vs_reference", "ssim")
            for r in results
            if _get(r, "quality_vs_reference", "ssim") is not None
        ]

        avg_time = sum(times) / len(times) if times else None
        avg_mem = sum(mems) / len(mems) if mems else None

        row = f"| {renderer} | {_fmt_time(avg_time)} | {_fmt_memory(avg_mem)} |"
        if has_quality:
            avg_psnr = sum(psnrs) / len(psnrs) if psnrs else None
            avg_ssim = sum(ssims) / len(ssims) if ssims else None
            row += f" {_fmt_metric(avg_psnr, '{:.1f}')} | {_fmt_metric(avg_ssim, '{:.3f}')} |"
        row += f" {len(results)} |"

        lines.append(row)

    lines.append("")
    return "\n".join(lines)


def _build_footer(raw: list[dict[str, Any]]) -> str:
    """Build the report footer."""
    lines = ["---", ""]
    version = "unknown"
    if raw:
        version = _get(raw[0], "hardware", "renderscope_version") or "unknown"
    lines.append(
        f"*Generated by [RenderScope](https://github.com/renderscope-dev/renderscope) v{version}*"
    )
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _group_by_scene(raw: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Group results by scene ID, preserving insertion order."""
    groups: dict[str, list[dict[str, Any]]] = {}
    for r in raw:
        scene = r.get("scene", "unknown")
        groups.setdefault(scene, []).append(r)
    return groups


def _get(data: Any, *keys: str) -> Any:
    """Safely traverse nested dicts."""
    current = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        else:
            return None
    return current


def _format_scene_name(scene_id: str) -> str:
    """Convert a scene slug to a human-readable title."""
    return scene_id.replace("-", " ").replace("_", " ").title()


def _fmt_time(seconds: Any) -> str:
    """Format seconds into a human-readable string."""
    if seconds is None:
        return ""
    s = float(seconds)
    if s < 60:
        return f"{s:.1f}s"
    minutes = int(s // 60)
    secs = s % 60
    return f"{minutes}m {secs:.0f}s"


def _fmt_memory(mb: Any) -> str:
    """Format megabytes into a human-readable string."""
    if mb is None:
        return ""
    m = float(mb)
    if m >= 1024:
        return f"{m / 1024:.1f} GB"
    return f"{m:.0f} MB"


def _fmt_gb(value: Any) -> str:
    """Format a value as GB."""
    if value is None:
        return "N/A"
    return f"{float(value):.0f} GB"


def _fmt_metric(value: Any, fmt: str) -> str:
    """Format a metric value, returning empty string for None."""
    if value is None:
        return ""
    return fmt.format(float(value))
