"""Self-contained HTML benchmark report generator.

The generated HTML file has all CSS, JavaScript, and images inlined so it
can be opened in any modern browser without external dependencies.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from jinja2 import BaseLoader, Environment, TemplateNotFound
from PIL import Image

from renderscope.report._loader import load_results_raw

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Metric thresholds for color-coded cells
# ---------------------------------------------------------------------------

_PSNR_GOOD = 35.0
_PSNR_OK = 25.0
_SSIM_GOOD = 0.95
_SSIM_OK = 0.85


# ---------------------------------------------------------------------------
# Template loader: reads from the installed package
# ---------------------------------------------------------------------------


class _PackageTemplateLoader(BaseLoader):
    """Load Jinja2 templates from the ``renderscope.report.templates`` package."""

    def get_source(
        self,
        environment: Environment,
        template: str,
    ) -> tuple[str, str | None, Any]:
        """Load a template by name (e.g. ``"report.html"`` or ``"components/header.html"``)."""
        import importlib.resources

        parts = template.replace("\\", "/").split("/")
        if len(parts) > 1:
            package_path = f"renderscope.report.templates.{'.'.join(parts[:-1])}"
            filename = parts[-1]
        else:
            package_path = "renderscope.report.templates"
            filename = parts[0]

        try:
            source = importlib.resources.files(package_path).joinpath(filename).read_text("utf-8")
        except (FileNotFoundError, ModuleNotFoundError, TypeError) as exc:
            raise TemplateNotFound(template) from exc

        return source, None, lambda: True


def _create_jinja_env() -> Environment:
    """Build a Jinja2 environment with RenderScope-specific filters."""
    env = Environment(
        loader=_PackageTemplateLoader(),
        autoescape=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["fmt_time"] = _fmt_time
    env.filters["fmt_memory"] = _fmt_memory
    env.filters["fmt_metric"] = _fmt_metric_filter
    return env


# ---------------------------------------------------------------------------
# HTMLReportGenerator
# ---------------------------------------------------------------------------


class HTMLReportGenerator:
    """Generates self-contained HTML benchmark reports.

    The generated HTML file has all CSS, JavaScript, and images inlined,
    so it can be opened in any browser without external dependencies.
    """

    def __init__(
        self,
        results_path: Path,
        *,
        title: str | None = None,
        include_images: bool = True,
        include_convergence: bool = True,
        include_raw_data: bool = True,
        max_image_width: int = 1200,
        image_quality: int = 85,
    ) -> None:
        """Initialize the report generator.

        Args:
            results_path: Path to the benchmark results JSON file.
            title: Custom report title. Defaults to ``"RenderScope Benchmark Report"``.
            include_images: Whether to embed base64-encoded images.
            include_convergence: Whether to include convergence charts.
            include_raw_data: Whether to include the collapsible raw JSON section.
            max_image_width: Maximum width in pixels for embedded images.
            image_quality: JPEG quality (1-100) for base64-encoded images.
        """
        self._results_path = results_path
        self._title = title or "RenderScope Benchmark Report"
        self._include_images = include_images
        self._include_convergence = include_convergence
        self._include_raw_data = include_raw_data
        self._max_image_width = max_image_width
        self._image_quality = image_quality
        self._env = _create_jinja_env()

    def generate(self) -> str:
        """Generate the complete HTML report as a string.

        Returns:
            The full HTML document as a string.

        Raises:
            FileNotFoundError: If the results JSON file doesn't exist.
            ValueError: If the results JSON doesn't match the expected format.
        """
        raw = load_results_raw(self._results_path)
        context = self._build_template_context(raw)
        template = self._env.get_template("report.html")
        return template.render(**context)

    def save(self, output_path: Path) -> None:
        """Generate and write the HTML report to a file.

        Args:
            output_path: Where to write the HTML file.
        """
        html = self.generate()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(html, encoding="utf-8")
        logger.info("HTML report saved to %s", output_path)

    # ------------------------------------------------------------------
    # Template context
    # ------------------------------------------------------------------

    def _build_template_context(self, raw: list[dict[str, Any]]) -> dict[str, Any]:
        """Assemble the complete Jinja2 context dictionary."""
        from renderscope import __version__

        now = datetime.now(tz=timezone.utc)

        # Extract hardware from first result (all results share the same hardware).
        hardware = raw[0].get("hardware", {}) if raw else {}

        # Group results by scene.
        scene_groups = self._group_by_scene(raw)

        # Build per-scene data with images and metrics.
        scenes_data: list[dict[str, Any]] = []
        for scene_id, results in scene_groups.items():
            scenes_data.append(self._build_scene_data(scene_id, results))

        # Build summary data.
        summary = self._build_summary(raw)

        # Compute renderer colors for charts.
        renderer_colors = self._assign_renderer_colors(raw)

        return {
            "title": self._title,
            "timestamp": now.strftime("%B %d, %Y at %I:%M %p UTC"),
            "version": __version__,
            "hardware": hardware,
            "scenes": scenes_data,
            "summary": summary,
            "renderer_colors": renderer_colors,
            "num_renderers": len({r.get("renderer") for r in raw}),
            "num_scenes": len(scene_groups),
            "include_images": self._include_images,
            "include_convergence": self._include_convergence,
            "include_raw_data": self._include_raw_data,
            "raw_json": json.dumps(raw, indent=2, ensure_ascii=False),
            "has_results": len(raw) > 0,
        }

    def _group_by_scene(self, raw: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        """Group results by scene ID."""
        groups: dict[str, list[dict[str, Any]]] = {}
        for r in raw:
            scene = r.get("scene", "unknown")
            groups.setdefault(scene, []).append(r)
        return groups

    def _build_scene_data(self, scene_id: str, results: list[dict[str, Any]]) -> dict[str, Any]:
        """Build per-scene template data including images and metrics."""
        scene_name = scene_id.replace("-", " ").replace("_", " ").title()

        # Check if quality metrics are available.
        has_quality = any(_safe_get(r, "quality_vs_reference", "psnr") is not None for r in results)

        # Build per-renderer data.
        renderer_data: list[dict[str, Any]] = []
        for r in results:
            res = r.get("results", {})
            if not isinstance(res, dict):
                res = {}

            quality = r.get("quality_vs_reference") or {}
            if not isinstance(quality, dict):
                quality = {}

            image_data_uri = ""
            if self._include_images:
                output_path = res.get("output_path", "")
                if output_path:
                    image_data_uri = self._encode_image(
                        Path(output_path), self._results_path.parent
                    )

            is_placeholder = image_data_uri.startswith("data:image/svg+xml")

            renderer_data.append(
                {
                    "name": r.get("renderer", "unknown"),
                    "render_time": res.get("render_time_seconds"),
                    "peak_memory": res.get("peak_memory_mb"),
                    "psnr": quality.get("psnr"),
                    "ssim": quality.get("ssim"),
                    "mse": quality.get("mse"),
                    "psnr_class": get_metric_class("psnr", quality.get("psnr")),
                    "ssim_class": get_metric_class("ssim", quality.get("ssim")),
                    "time_class": "",  # Set after all renderers computed
                    "memory_class": "",
                    "image": image_data_uri,
                    "is_placeholder": is_placeholder,
                    "settings": r.get("settings", {}),
                }
            )

        # Set time/memory classes (relative to best in group).
        _set_relative_classes(renderer_data)

        # Mark best values.
        _mark_best_values(renderer_data, has_quality)

        # Convergence data.
        has_convergence = self._include_convergence and any(r.get("convergence") for r in results)
        convergence_svg = ""
        if has_convergence:
            convergence_svg = self._build_convergence_svg(results)

        return {
            "id": scene_id,
            "name": scene_name,
            "has_quality": has_quality,
            "has_convergence": has_convergence,
            "convergence_svg": convergence_svg,
            "renderers": renderer_data,
            "show_slider": len(renderer_data) == 2 and self._include_images,
        }

    def _build_summary(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Build summary data aggregated by renderer."""
        renderers: dict[str, list[dict[str, Any]]] = {}
        for r in raw:
            name = r.get("renderer", "unknown")
            renderers.setdefault(name, []).append(r)

        summary: list[dict[str, Any]] = []
        for renderer, results in sorted(renderers.items()):
            times = [
                _safe_get(r, "results", "render_time_seconds")
                for r in results
                if _safe_get(r, "results", "render_time_seconds") is not None
            ]
            mems = [
                _safe_get(r, "results", "peak_memory_mb")
                for r in results
                if _safe_get(r, "results", "peak_memory_mb") is not None
            ]
            psnrs = [
                _safe_get(r, "quality_vs_reference", "psnr")
                for r in results
                if _safe_get(r, "quality_vs_reference", "psnr") is not None
            ]
            ssims = [
                _safe_get(r, "quality_vs_reference", "ssim")
                for r in results
                if _safe_get(r, "quality_vs_reference", "ssim") is not None
            ]

            summary.append(
                {
                    "name": renderer,
                    "avg_time": sum(times) / len(times) if times else None,
                    "avg_memory": sum(mems) / len(mems) if mems else None,
                    "avg_psnr": sum(psnrs) / len(psnrs) if psnrs else None,
                    "avg_ssim": sum(ssims) / len(ssims) if ssims else None,
                    "scenes_tested": len(results),
                    "psnr_class": get_metric_class(
                        "psnr", sum(psnrs) / len(psnrs) if psnrs else None
                    ),
                    "ssim_class": get_metric_class(
                        "ssim", sum(ssims) / len(ssims) if ssims else None
                    ),
                }
            )

        return summary

    def _assign_renderer_colors(self, raw: list[dict[str, Any]]) -> dict[str, str]:
        """Assign consistent colors to each renderer for charts."""
        palette = [
            "#4da6ff",
            "#2dd471",
            "#a855f7",
            "#ec4899",
            "#f97316",
            "#eab308",
            "#06b6d4",
            "#8b5cf6",
        ]
        renderer_names = sorted({r.get("renderer", "") for r in raw})
        return {name: palette[i % len(palette)] for i, name in enumerate(renderer_names)}

    # ------------------------------------------------------------------
    # Image encoding
    # ------------------------------------------------------------------

    def _encode_image(self, image_path: Path, base_dir: Path) -> str:
        """Load, process, and base64-encode an image as a JPEG data URI.

        Returns a ``data:image/jpeg;base64,...`` string, or a placeholder
        SVG if the image cannot be loaded.
        """
        # Resolve relative paths against the base directory.
        if not image_path.is_absolute():
            image_path = base_dir / image_path

        if not image_path.is_file():
            logger.warning("Image not found: %s", image_path)
            return _placeholder_svg(str(image_path))

        try:
            return self._load_and_encode(image_path)
        except Exception:
            logger.warning("Failed to load image: %s", image_path, exc_info=True)
            return _placeholder_svg(str(image_path))

    def _load_and_encode(self, image_path: Path) -> str:
        """Load an image, optionally tonemap and resize, then base64-encode."""
        from renderscope.utils.image_io import is_hdr, load_image, tonemap

        img_array = load_image(image_path)

        # Tonemap HDR images.
        if is_hdr(image_path):
            img_array = tonemap(img_array)

        # Convert to uint8 for PIL.
        clipped = np.clip(img_array, 0.0, 1.0)
        uint8_data = (clipped * 255.0 + 0.5).astype(np.uint8)
        pil_image = Image.fromarray(uint8_data, mode="RGB")

        # Resize if too wide.
        if pil_image.width > self._max_image_width:
            ratio = self._max_image_width / pil_image.width
            new_height = int(pil_image.height * ratio)
            pil_image = pil_image.resize(
                (self._max_image_width, new_height), Image.Resampling.LANCZOS
            )

        # Encode as JPEG.
        buf = io.BytesIO()
        pil_image.save(buf, format="JPEG", quality=self._image_quality)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{b64}"

    # ------------------------------------------------------------------
    # Convergence SVG chart
    # ------------------------------------------------------------------

    def _build_convergence_svg(self, results: list[dict[str, Any]]) -> str:
        """Generate an inline SVG convergence chart.

        Plots PSNR (Y-axis) vs sample count (X-axis) for each renderer.
        """
        # Collect convergence data per renderer.
        renderer_data: dict[str, list[dict[str, Any]]] = {}
        for r in results:
            conv = r.get("convergence")
            if not conv:
                continue
            name = r.get("renderer", "unknown")
            renderer_data[name] = conv

        if not renderer_data:
            return ""

        colors = self._assign_renderer_colors(results)

        # Chart dimensions.
        width = 600
        height = 300
        margin_left = 55
        margin_right = 20
        margin_top = 30
        margin_bottom = 40
        plot_w = width - margin_left - margin_right
        plot_h = height - margin_top - margin_bottom

        # Compute axis ranges from all data.
        all_samples: list[int] = []
        all_psnr: list[float] = []
        for points in renderer_data.values():
            for p in points:
                if p.get("samples") is not None:
                    all_samples.append(int(p["samples"]))
                psnr_val = p.get("psnr")
                if psnr_val is not None:
                    all_psnr.append(float(psnr_val))

        if not all_samples or not all_psnr:
            return ""

        x_min = max(1, min(all_samples))
        x_max = max(all_samples)
        y_min = max(0, min(all_psnr) - 2)
        y_max = max(all_psnr) + 2

        def x_pos(samples: int) -> float:
            """Map sample count (log scale) to X pixel position."""
            if x_max <= x_min:
                return margin_left + plot_w / 2
            log_min = math.log10(max(1, x_min))
            log_max = math.log10(max(1, x_max))
            if log_max <= log_min:
                return margin_left + plot_w / 2
            frac = (math.log10(max(1, samples)) - log_min) / (log_max - log_min)
            return margin_left + frac * plot_w

        def y_pos(psnr: float) -> float:
            """Map PSNR value to Y pixel position (inverted: top = high)."""
            if y_max <= y_min:
                return margin_top + plot_h / 2
            frac = (psnr - y_min) / (y_max - y_min)
            return margin_top + plot_h * (1 - frac)

        svg_parts: list[str] = []
        svg_parts.append(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
            f'class="convergence-chart" role="img" '
            f'aria-label="Convergence chart showing PSNR vs sample count">'
        )

        # Background.
        svg_parts.append(
            f'<rect x="0" y="0" width="{width}" height="{height}" '
            f'fill="var(--rs-bg-card, #121218)" rx="6"/>'
        )

        # Grid lines (horizontal).
        y_ticks = _nice_ticks(y_min, y_max, 5)
        for tick in y_ticks:
            yp = y_pos(tick)
            if margin_top <= yp <= margin_top + plot_h:
                svg_parts.append(
                    f'<line x1="{margin_left}" y1="{yp:.1f}" '
                    f'x2="{margin_left + plot_w}" y2="{yp:.1f}" '
                    f'stroke="var(--rs-border, #262630)" stroke-dasharray="4,4"/>'
                )
                svg_parts.append(
                    f'<text x="{margin_left - 8}" y="{yp + 4:.1f}" '
                    f'fill="var(--rs-text-muted, #87878f)" font-size="11" '
                    f'text-anchor="end" font-family="sans-serif">{tick:.0f}</text>'
                )

        # Y-axis label.
        svg_parts.append(
            f'<text x="14" y="{margin_top + plot_h / 2}" '
            f'fill="var(--rs-text-muted, #87878f)" font-size="11" '
            f'text-anchor="middle" font-family="sans-serif" '
            f'transform="rotate(-90, 14, {margin_top + plot_h / 2})">PSNR (dB)</text>'
        )

        # X-axis ticks (log scale).
        x_ticks = [s for s in sorted(set(all_samples))]
        for tick in x_ticks:
            xp = x_pos(tick)
            svg_parts.append(
                f'<text x="{xp:.1f}" y="{margin_top + plot_h + 18}" '
                f'fill="var(--rs-text-muted, #87878f)" font-size="10" '
                f'text-anchor="middle" font-family="sans-serif">{tick}</text>'
            )

        # X-axis label.
        svg_parts.append(
            f'<text x="{margin_left + plot_w / 2}" y="{height - 4}" '
            f'fill="var(--rs-text-muted, #87878f)" font-size="11" '
            f'text-anchor="middle" font-family="sans-serif">Samples per pixel</text>'
        )

        # Plot data lines.
        legend_items: list[tuple[str, str]] = []
        for renderer_name, points in renderer_data.items():
            color = colors.get(renderer_name, "#4da6ff")
            legend_items.append((renderer_name, color))

            # Filter valid points.
            valid = [
                p for p in points if p.get("samples") is not None and p.get("psnr") is not None
            ]
            if not valid:
                continue

            valid.sort(key=lambda p: p["samples"])

            # Polyline.
            coords = " ".join(f"{x_pos(p['samples']):.1f},{y_pos(p['psnr']):.1f}" for p in valid)
            svg_parts.append(
                f'<polyline points="{coords}" fill="none" '
                f'stroke="{color}" stroke-width="2" stroke-linecap="round" '
                f'stroke-linejoin="round"/>'
            )

            # Data points with tooltips.
            for p in valid:
                xp = x_pos(p["samples"])
                yp = y_pos(p["psnr"])
                svg_parts.append(
                    f'<circle cx="{xp:.1f}" cy="{yp:.1f}" r="3.5" '
                    f'fill="{color}" stroke="var(--rs-bg-card, #121218)" stroke-width="1.5">'
                    f"<title>{renderer_name}: {p['samples']} SPP, "
                    f"PSNR={p['psnr']:.1f} dB</title></circle>"
                )

        # Legend.
        legend_x = margin_left + plot_w - 10
        legend_y = margin_top + 10
        for i, (name, color) in enumerate(legend_items):
            ly = legend_y + i * 18
            svg_parts.append(
                f'<rect x="{legend_x - 100}" y="{ly}" width="10" height="10" '
                f'fill="{color}" rx="2"/>'
            )
            svg_parts.append(
                f'<text x="{legend_x - 85}" y="{ly + 9}" '
                f'fill="var(--rs-text, #f2f2f2)" font-size="11" '
                f'font-family="sans-serif">{name}</text>'
            )

        svg_parts.append("</svg>")
        return "\n".join(svg_parts)

    # ------------------------------------------------------------------
    # Diff image generation
    # ------------------------------------------------------------------

    def _generate_diff_image(
        self,
        output_path_a: Path,
        output_path_b: Path,
        base_dir: Path,
    ) -> str:
        """Generate a false-color diff map between two images."""
        from renderscope.core.metrics import ImageMetrics
        from renderscope.utils.image_io import is_hdr, load_image, tonemap

        path_a = output_path_a if output_path_a.is_absolute() else base_dir / output_path_a
        path_b = output_path_b if output_path_b.is_absolute() else base_dir / output_path_b

        if not path_a.is_file() or not path_b.is_file():
            return ""

        try:
            img_a = load_image(path_a)
            img_b = load_image(path_b)
            if is_hdr(path_a):
                img_a = tonemap(img_a)
            if is_hdr(path_b):
                img_b = tonemap(img_b)

            if img_a.shape != img_b.shape:
                return ""

            diff = ImageMetrics.absolute_diff(img_a, img_b)
            false_color = ImageMetrics.false_color_map(diff, colormap="inferno")
            clipped = np.clip(false_color, 0.0, 1.0)
            uint8_data = (clipped * 255.0 + 0.5).astype(np.uint8)
            pil_image = Image.fromarray(uint8_data, mode="RGB")

            buf = io.BytesIO()
            pil_image.save(buf, format="JPEG", quality=self._image_quality)
            b64 = base64.b64encode(buf.getvalue()).decode("ascii")
            return f"data:image/jpeg;base64,{b64}"
        except Exception:
            logger.warning("Failed to generate diff image", exc_info=True)
            return ""


# ---------------------------------------------------------------------------
# Public helper for metric CSS classes
# ---------------------------------------------------------------------------


def get_metric_class(metric_name: str, value: float | None) -> str:
    """Return a CSS class name based on the metric value.

    Args:
        metric_name: ``"psnr"`` or ``"ssim"``.
        value: The metric value.

    Returns:
        One of ``"metric-good"``, ``"metric-ok"``, ``"metric-poor"``,
        or ``""`` if value is ``None``.
    """
    if value is None:
        return ""

    if metric_name == "psnr":
        if value >= _PSNR_GOOD:
            return "metric-good"
        if value >= _PSNR_OK:
            return "metric-ok"
        return "metric-poor"

    if metric_name == "ssim":
        if value >= _SSIM_GOOD:
            return "metric-good"
        if value >= _SSIM_OK:
            return "metric-ok"
        return "metric-poor"

    return ""


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _safe_get(data: Any, *keys: str) -> Any:
    """Safely traverse nested dicts."""
    current = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        else:
            return None
    return current


def _set_relative_classes(renderer_data: list[dict[str, Any]]) -> None:
    """Set time/memory CSS classes relative to the group's best."""
    times = [r["render_time"] for r in renderer_data if r["render_time"] is not None]
    mems = [r["peak_memory"] for r in renderer_data if r["peak_memory"] is not None]

    if len(times) >= 2:
        best_time = min(times)
        worst_time = max(times)
        for r in renderer_data:
            t = r["render_time"]
            if t is not None and worst_time > best_time:
                ratio = (t - best_time) / (worst_time - best_time)
                if ratio <= 0.2:
                    r["time_class"] = "metric-good"
                elif ratio <= 0.6:
                    r["time_class"] = "metric-ok"
                else:
                    r["time_class"] = "metric-poor"

    if len(mems) >= 2:
        best_mem = min(mems)
        worst_mem = max(mems)
        for r in renderer_data:
            m = r["peak_memory"]
            if m is not None and worst_mem > best_mem:
                ratio = (m - best_mem) / (worst_mem - best_mem)
                if ratio <= 0.2:
                    r["memory_class"] = "metric-good"
                elif ratio <= 0.6:
                    r["memory_class"] = "metric-ok"
                else:
                    r["memory_class"] = "metric-poor"


def _mark_best_values(renderer_data: list[dict[str, Any]], has_quality: bool) -> None:
    """Add ``is_best_*`` flags to mark the best value in each column."""
    if not renderer_data:
        return

    # PSNR: highest is best.
    if has_quality:
        psnrs = [(i, r["psnr"]) for i, r in enumerate(renderer_data) if r["psnr"] is not None]
        if psnrs:
            best_idx = max(psnrs, key=lambda x: x[1])[0]
            renderer_data[best_idx]["is_best_psnr"] = True

        ssims = [(i, r["ssim"]) for i, r in enumerate(renderer_data) if r["ssim"] is not None]
        if ssims:
            best_idx = max(ssims, key=lambda x: x[1])[0]
            renderer_data[best_idx]["is_best_ssim"] = True

    # Time: lowest is best.
    times = [
        (i, r["render_time"]) for i, r in enumerate(renderer_data) if r["render_time"] is not None
    ]
    if times:
        best_idx = min(times, key=lambda x: x[1])[0]
        renderer_data[best_idx]["is_best_time"] = True

    # Memory: lowest is best.
    mems = [
        (i, r["peak_memory"]) for i, r in enumerate(renderer_data) if r["peak_memory"] is not None
    ]
    if mems:
        best_idx = min(mems, key=lambda x: x[1])[0]
        renderer_data[best_idx]["is_best_memory"] = True


def _nice_ticks(vmin: float, vmax: float, count: int) -> list[float]:
    """Generate nicely spaced tick values for chart axes."""
    if vmax <= vmin:
        return [vmin]
    raw_step = (vmax - vmin) / count
    magnitude = 10 ** math.floor(math.log10(raw_step))
    residual = raw_step / magnitude
    if residual <= 1.5:
        step = magnitude
    elif residual <= 3:
        step = 2 * magnitude
    elif residual <= 7:
        step = 5 * magnitude
    else:
        step = 10 * magnitude

    start = math.ceil(vmin / step) * step
    ticks: list[float] = []
    tick = start
    while tick <= vmax + step * 0.01:
        ticks.append(tick)
        tick += step
    return ticks


def _placeholder_svg(path_text: str) -> str:
    """Generate a placeholder SVG data URI for missing images."""
    # Truncate long paths.
    display = path_text if len(path_text) < 60 else "..." + path_text[-57:]
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" '
        'viewBox="0 0 400 225">'
        '<rect width="400" height="225" fill="#1a1a24" rx="8"/>'
        '<text x="200" y="100" fill="#87878f" font-size="14" '
        'text-anchor="middle" font-family="sans-serif">Image not available</text>'
        f'<text x="200" y="130" fill="#555560" font-size="10" '
        f'text-anchor="middle" font-family="monospace">{_escape_xml(display)}</text>'
        "</svg>"
    )
    b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{b64}"


def _escape_xml(text: str) -> str:
    """Escape XML special characters."""
    return (
        text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
    )


# ---------------------------------------------------------------------------
# Jinja2 filters
# ---------------------------------------------------------------------------


def _fmt_time(seconds: float | None) -> str:
    """Format seconds into a human-readable string."""
    if seconds is None:
        return "—"
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes}m {secs:.0f}s"


def _fmt_memory(mb: float | None) -> str:
    """Format megabytes into a human-readable string."""
    if mb is None:
        return "—"
    if mb >= 1024:
        return f"{mb / 1024:.1f} GB"
    return f"{mb:.0f} MB"


def _fmt_metric_filter(value: float | None, fmt: str = ".3f") -> str:
    """Format a metric value for display."""
    if value is None:
        return "—"
    return f"{value:{fmt}}"
