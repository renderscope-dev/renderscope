"""Consolidated tests for report generation: HTML, CSV, JSON, and Markdown exporters.

This file merges the previously separate test_html_report.py, test_csv_export.py,
test_json_export.py, and test_markdown_export.py into a single module while keeping
all test classes intact.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path

import pytest

from renderscope.report.csv_export import CSV_COLUMNS, CSVExporter
from renderscope.report.html_report import HTMLReportGenerator, get_metric_class
from renderscope.report.json_export import JSONExporter
from renderscope.report.markdown_export import MarkdownExporter

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
SAMPLE = FIXTURES / "sample_results.json"
MINIMAL = FIXTURES / "minimal_results.json"
EMPTY = FIXTURES / "empty_results.json"


# ============================================================================
# HTML Report Tests
# ============================================================================


class TestHTMLReportGeneration:
    """Tests for HTMLReportGenerator.generate()."""

    def test_generate_basic_report(self) -> None:
        """Load sample_results.json and verify the HTML contains expected content."""
        gen = HTMLReportGenerator(SAMPLE)
        html = gen.generate()

        assert isinstance(html, str)
        assert len(html) > 0
        assert "<!DOCTYPE html>" in html
        assert "</html>" in html

        # Report title.
        assert "RenderScope Benchmark Report" in html

        # Version.
        assert "0.1.0" in html

        # Hardware info.
        assert "AMD Ryzen 9 7950X" in html
        assert "NVIDIA GeForce RTX 4090" in html

        # Scene names.
        assert "Cornell Box" in html
        assert "Sponza" in html

        # Renderer names.
        assert "pbrt" in html
        assert "mitsuba3" in html

        # Metric values.
        assert "42.3" in html
        assert "0.987" in html

        # CSS variables present (self-contained).
        assert "--rs-bg" in html
        assert "--rs-primary" in html

    def test_no_external_resources(self) -> None:
        """Verify the HTML has no external resource references."""
        gen = HTMLReportGenerator(SAMPLE)
        html = gen.generate()

        # No external stylesheets.
        assert '<link rel="stylesheet"' not in html
        # No external scripts.
        assert "<script src=" not in html
        # No external images (only data: URIs or none).
        # Check there are no http/https image sources.
        assert 'src="http' not in html

    def test_generate_no_images(self) -> None:
        """Generate with include_images=False -- no data:image/ strings."""
        gen = HTMLReportGenerator(SAMPLE, include_images=False)
        html = gen.generate()

        assert "data:image/jpeg" not in html
        assert "<!DOCTYPE html>" in html
        assert "Cornell Box" in html

    def test_generate_custom_title(self) -> None:
        """Generate with a custom title."""
        custom = "My Custom Benchmark Report"
        gen = HTMLReportGenerator(SAMPLE, title=custom)
        html = gen.generate()

        assert custom in html

    def test_missing_images_graceful(self) -> None:
        """Generate from results with nonexistent image paths -- no crash."""
        gen = HTMLReportGenerator(SAMPLE, include_images=True)
        html = gen.generate()

        # Should still generate successfully.
        assert "<!DOCTYPE html>" in html
        # Should contain placeholder text.
        assert "Image not available" in html
        # Metric values still present.
        assert "42.3" in html

    def test_convergence_chart_included(self) -> None:
        """Cornell Box has convergence data -- SVG chart should be present."""
        gen = HTMLReportGenerator(SAMPLE)
        html = gen.generate()

        assert "<svg" in html
        assert "<polyline" in html
        assert "Convergence" in html

    def test_convergence_chart_excluded_when_disabled(self) -> None:
        """With include_convergence=False, no SVG charts."""
        gen = HTMLReportGenerator(SAMPLE, include_convergence=False)
        html = gen.generate()

        assert "<polyline" not in html

    def test_save_to_file(self, tmp_path: Path) -> None:
        """Generate and save to a temp file."""
        output = tmp_path / "report.html"
        gen = HTMLReportGenerator(SAMPLE)
        gen.save(output)

        assert output.is_file()
        content = output.read_text(encoding="utf-8")
        assert "<!DOCTYPE html>" in content
        assert len(content) > 100

    def test_empty_results(self) -> None:
        """Generate from empty_results.json -- no crash, shows message."""
        gen = HTMLReportGenerator(EMPTY)
        html = gen.generate()

        assert "<!DOCTYPE html>" in html
        assert "No results to display" in html

    def test_html_is_self_contained(self) -> None:
        """Parse HTML and verify no external URLs."""
        gen = HTMLReportGenerator(SAMPLE)
        html = gen.generate()

        # No <link> with external href.
        assert "<link rel=" not in html or 'href="http' not in html
        # All styles are inlined.
        assert "<style>" in html
        # All scripts are inlined.
        lines = html.split("\n")
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("<script") and "src=" in stripped:
                pytest.fail(f"External script found: {stripped}")

    def test_print_media_styles(self) -> None:
        """Verify the HTML contains @media print CSS block."""
        gen = HTMLReportGenerator(SAMPLE)
        html = gen.generate()

        assert "@media print" in html

    def test_minimal_results(self) -> None:
        """Minimal results with one renderer, no quality metrics."""
        gen = HTMLReportGenerator(MINIMAL)
        html = gen.generate()

        assert "<!DOCTYPE html>" in html
        assert "Cornell Box" in html
        assert "pbrt" in html

    def test_interactive_slider_js(self) -> None:
        """Verify the slider JavaScript is included."""
        gen = HTMLReportGenerator(SAMPLE)
        html = gen.generate()

        assert "data-slider" in html
        assert "mousedown" in html
        assert "touchstart" in html
        assert "clip-path" in html or "clipPath" in html

    def test_copy_buttons(self) -> None:
        """Verify copy-to-clipboard buttons exist."""
        gen = HTMLReportGenerator(SAMPLE)
        html = gen.generate()

        assert "rs-copy-btn" in html
        assert "navigator.clipboard" in html

    def test_responsive_meta_tag(self) -> None:
        """Verify viewport meta tag for responsiveness."""
        gen = HTMLReportGenerator(SAMPLE)
        html = gen.generate()

        assert 'name="viewport"' in html


class TestGetMetricClass:
    """Tests for the metric CSS class helper."""

    def test_psnr_good(self) -> None:
        assert get_metric_class("psnr", 42.0) == "metric-good"
        assert get_metric_class("psnr", 35.0) == "metric-good"

    def test_psnr_ok(self) -> None:
        assert get_metric_class("psnr", 30.0) == "metric-ok"
        assert get_metric_class("psnr", 25.0) == "metric-ok"

    def test_psnr_poor(self) -> None:
        assert get_metric_class("psnr", 20.0) == "metric-poor"
        assert get_metric_class("psnr", 10.0) == "metric-poor"

    def test_ssim_good(self) -> None:
        assert get_metric_class("ssim", 0.99) == "metric-good"
        assert get_metric_class("ssim", 0.95) == "metric-good"

    def test_ssim_ok(self) -> None:
        assert get_metric_class("ssim", 0.90) == "metric-ok"
        assert get_metric_class("ssim", 0.85) == "metric-ok"

    def test_ssim_poor(self) -> None:
        assert get_metric_class("ssim", 0.80) == "metric-poor"
        assert get_metric_class("ssim", 0.50) == "metric-poor"

    def test_none_value(self) -> None:
        assert get_metric_class("psnr", None) == ""
        assert get_metric_class("ssim", None) == ""

    def test_unknown_metric(self) -> None:
        assert get_metric_class("unknown", 42.0) == ""

    def test_boundary_psnr(self) -> None:
        """Test exact boundary values."""
        assert get_metric_class("psnr", 35.0) == "metric-good"
        assert get_metric_class("psnr", 34.9) == "metric-ok"
        assert get_metric_class("psnr", 25.0) == "metric-ok"
        assert get_metric_class("psnr", 24.9) == "metric-poor"

    def test_boundary_ssim(self) -> None:
        """Test exact boundary values."""
        assert get_metric_class("ssim", 0.95) == "metric-good"
        assert get_metric_class("ssim", 0.949) == "metric-ok"
        assert get_metric_class("ssim", 0.85) == "metric-ok"
        assert get_metric_class("ssim", 0.849) == "metric-poor"


# ============================================================================
# CSV Export Tests
# ============================================================================


class TestCSVExport:
    """Tests for CSVExporter."""

    def test_basic_export(self) -> None:
        """Export sample_results.json -- verify header + 4 data rows."""
        exporter = CSVExporter(SAMPLE)
        text = exporter.export()

        reader = csv.reader(io.StringIO(text))
        rows = list(reader)

        # Header + 4 data rows (2 renderers x 2 scenes).
        assert len(rows) == 5
        assert rows[0] == CSV_COLUMNS

    def test_column_order(self) -> None:
        """Verify the header columns are in the expected order."""
        exporter = CSVExporter(SAMPLE)
        text = exporter.export()

        reader = csv.reader(io.StringIO(text))
        header = next(reader)

        assert header[0] == "scene"
        assert header[1] == "renderer"
        assert header[2] == "render_time_seconds"
        assert header[3] == "peak_memory_mb"
        assert header[4] == "psnr_db"
        assert header[5] == "ssim"
        assert header[6] == "mse"
        assert header[-1] == "timestamp"

    def test_data_values(self) -> None:
        """Verify specific data values appear correctly."""
        exporter = CSVExporter(SAMPLE)
        text = exporter.export()

        reader = csv.reader(io.StringIO(text))
        rows = list(reader)

        # First data row (cornell-box, pbrt).
        row1 = rows[1]
        assert row1[0] == "cornell-box"
        assert row1[1] == "pbrt"
        assert row1[2] == "34.2"  # render_time_seconds
        assert row1[3] == "1228.8"  # peak_memory_mb
        assert row1[4] == "42.3"  # psnr
        assert row1[5] == "0.987"  # ssim

    def test_missing_metrics(self) -> None:
        """Export results with no quality metrics -- empty cells, not 'None'."""
        exporter = CSVExporter(MINIMAL)
        text = exporter.export()

        reader = csv.reader(io.StringIO(text))
        rows = list(reader)

        assert len(rows) == 2  # header + 1 data row

        # Quality metric cells should be empty.
        row = rows[1]
        psnr_col = CSV_COLUMNS.index("psnr_db")
        ssim_col = CSV_COLUMNS.index("ssim")
        assert row[psnr_col] == ""
        assert row[ssim_col] == ""

        # "None" should never appear in the CSV.
        assert "None" not in text

    def test_output_to_file(self, tmp_path: Path) -> None:
        """Export to a temp file, verify content matches return value."""
        output = tmp_path / "results.csv"
        exporter = CSVExporter(SAMPLE)
        text = exporter.export(output)

        assert output.is_file()
        file_content = output.read_text(encoding="utf-8")
        assert file_content == text

    def test_empty_results(self) -> None:
        """Export empty results -- only header row present."""
        exporter = CSVExporter(EMPTY)
        text = exporter.export()

        reader = csv.reader(io.StringIO(text))
        rows = list(reader)

        assert len(rows) == 1
        assert rows[0] == CSV_COLUMNS

    def test_valid_csv(self) -> None:
        """Verify the output is parseable CSV."""
        exporter = CSVExporter(SAMPLE)
        text = exporter.export()

        # Should not raise.
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        assert all(len(row) == len(CSV_COLUMNS) for row in rows)


# ============================================================================
# JSON Export Tests
# ============================================================================


class TestJSONExport:
    """Tests for JSONExporter."""

    def test_basic_export(self) -> None:
        """Export sample_results.json and verify all results are present."""
        exporter = JSONExporter(SAMPLE)
        text = exporter.export()

        data = json.loads(text)
        assert isinstance(data, list)
        assert len(data) == 4

    def test_sorted_keys(self) -> None:
        """Verify JSON keys are alphabetically sorted."""
        exporter = JSONExporter(SAMPLE)
        text = exporter.export()

        data = json.loads(text)
        for entry in data:
            keys = list(entry.keys())
            assert keys == sorted(keys), f"Keys not sorted: {keys}"

    def test_relative_paths(self) -> None:
        """Verify file paths are relative, not absolute."""
        exporter = JSONExporter(SAMPLE)
        text = exporter.export()

        data = json.loads(text)
        for entry in data:
            results = entry.get("results", {})
            output_path = results.get("output_path", "")
            if output_path:
                assert not Path(output_path).is_absolute(), f"Path is absolute: {output_path}"

    def test_valid_json(self) -> None:
        """Verify output is valid JSON."""
        exporter = JSONExporter(SAMPLE)
        text = exporter.export()

        # Should not raise.
        parsed = json.loads(text)
        assert parsed is not None

    def test_deterministic_output(self) -> None:
        """Run export twice, assert identical output."""
        exporter = JSONExporter(SAMPLE)
        text1 = exporter.export()
        text2 = exporter.export()

        assert text1 == text2

    def test_output_to_file(self, tmp_path: Path) -> None:
        """Export to a temp file, verify content matches return value."""
        output = tmp_path / "clean.json"
        exporter = JSONExporter(SAMPLE)
        text = exporter.export(output)

        assert output.is_file()
        file_content = output.read_text(encoding="utf-8")
        assert file_content == text

    def test_empty_results(self) -> None:
        """Export empty results -- valid JSON with empty array."""
        exporter = JSONExporter(EMPTY)
        text = exporter.export()

        data = json.loads(text)
        assert isinstance(data, list)
        assert len(data) == 0

    def test_pretty_printed(self) -> None:
        """Verify output is pretty-printed with indentation."""
        exporter = JSONExporter(SAMPLE)
        text = exporter.export()

        # Pretty-printed JSON has newlines and indentation.
        assert "\n" in text
        assert "  " in text

    def test_custom_indent(self) -> None:
        """Verify custom indent parameter works."""
        exporter = JSONExporter(SAMPLE)
        text = exporter.export(indent=4)

        # Should have 4-space indentation.
        assert "    " in text


# ============================================================================
# Markdown Export Tests
# ============================================================================


class TestMarkdownExport:
    """Tests for MarkdownExporter."""

    def test_basic_export(self) -> None:
        """Export sample_results.json -- contains Markdown table markers."""
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export()

        assert isinstance(text, str)
        assert len(text) > 0

        # Markdown tables have pipes and separator rows.
        assert "|" in text
        assert "---" in text

    def test_title(self) -> None:
        """Verify the report has a title heading."""
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export()

        assert "# RenderScope Benchmark Report" in text

    def test_hardware_section(self) -> None:
        """Verify hardware info is present."""
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export()

        assert "## Hardware" in text
        assert "AMD Ryzen 9 7950X" in text
        assert "NVIDIA GeForce RTX 4090" in text

    def test_per_scene_tables(self) -> None:
        """Verify both scene names appear as headers."""
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export()

        assert "## Cornell Box" in text
        assert "## Sponza" in text

    def test_summary_table(self) -> None:
        """Verify summary/averages table is present."""
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export()

        assert "## Summary" in text

    def test_footer(self) -> None:
        """Verify RenderScope attribution is present."""
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export()

        assert "RenderScope" in text
        assert "renderscope-dev" in text

    def test_output_to_file(self, tmp_path: Path) -> None:
        """Export to a temp file, verify content matches return value."""
        output = tmp_path / "results.md"
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export(output)

        assert output.is_file()
        file_content = output.read_text(encoding="utf-8")
        assert file_content == text

    def test_empty_results(self) -> None:
        """Export empty results -- no crash."""
        exporter = MarkdownExporter(EMPTY)
        text = exporter.export()

        assert "# RenderScope Benchmark Report" in text
        assert "No benchmark results to display" in text

    def test_minimal_results(self) -> None:
        """Minimal results with one renderer."""
        exporter = MarkdownExporter(MINIMAL)
        text = exporter.export()

        assert "Cornell Box" in text
        assert "pbrt" in text

    def test_metric_values(self) -> None:
        """Verify specific metric values appear in the output."""
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export()

        assert "42.3" in text  # PSNR
        assert "0.987" in text  # SSIM

    def test_render_time_formatting(self) -> None:
        """Verify render times are human-readable."""
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export()

        # 34.2 seconds -> "34.2s"
        assert "34.2s" in text
        # 156.3 seconds -> "2m 36s"
        assert "2m 36s" in text

    def test_memory_formatting(self) -> None:
        """Verify memory values are formatted with units."""
        exporter = MarkdownExporter(SAMPLE)
        text = exporter.export()

        # 1228.8 MB -> "1.2 GB"
        assert "1.2 GB" in text
        # 819.2 MB -> "819 MB"
        assert "819 MB" in text
