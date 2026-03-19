"""Integration tests for the full report-generation pipeline.

Validates end-to-end generation of HTML, JSON, CSV, and Markdown reports
from serialized benchmark results.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from renderscope.report.csv_export import CSVExporter
from renderscope.report.json_export import JSONExporter
from renderscope.report.markdown_export import MarkdownExporter

pytestmark = pytest.mark.integration


class TestJSONReportPipeline:
    """End-to-end JSON report generation."""

    def test_json_roundtrip(self, sample_results_json: Path) -> None:
        """Generated JSON can be parsed back and contains all entries."""
        exporter = JSONExporter(sample_results_json)
        text = exporter.export()
        data = json.loads(text)
        assert isinstance(data, list)
        assert len(data) == 2

    def test_json_contains_renderer_names(self, sample_results_json: Path) -> None:
        exporter = JSONExporter(sample_results_json)
        text = exporter.export()
        data = json.loads(text)
        renderers = {entry["renderer"] for entry in data}
        assert renderers == {"pbrt", "mitsuba3"}

    def test_json_writes_to_file(self, sample_results_json: Path, tmp_output_dir: Path) -> None:
        output = tmp_output_dir / "report.json"
        exporter = JSONExporter(sample_results_json)
        exporter.export(output=output)
        assert output.is_file()
        data = json.loads(output.read_text(encoding="utf-8"))
        assert len(data) == 2

    def test_json_sorted_keys(self, sample_results_json: Path) -> None:
        exporter = JSONExporter(sample_results_json)
        text = exporter.export()
        data = json.loads(text)
        for entry in data:
            keys = list(entry.keys())
            assert keys == sorted(keys), "JSON keys should be sorted alphabetically"


class TestCSVReportPipeline:
    """End-to-end CSV report generation."""

    def test_csv_row_count(self, sample_results_json: Path) -> None:
        """CSV should have header + one row per result."""
        exporter = CSVExporter(sample_results_json)
        text = exporter.export()
        lines = [line for line in text.strip().split("\n") if line.strip()]
        assert len(lines) == 3  # header + 2 data rows

    def test_csv_contains_header_columns(self, sample_results_json: Path) -> None:
        exporter = CSVExporter(sample_results_json)
        text = exporter.export()
        header = text.strip().split("\n")[0]
        assert "scene" in header
        assert "renderer" in header
        assert "render_time_seconds" in header

    def test_csv_contains_data(self, sample_results_json: Path) -> None:
        exporter = CSVExporter(sample_results_json)
        text = exporter.export()
        assert "pbrt" in text
        assert "mitsuba3" in text
        assert "cornell_box" in text

    def test_csv_writes_to_file(self, sample_results_json: Path, tmp_output_dir: Path) -> None:
        output = tmp_output_dir / "report.csv"
        exporter = CSVExporter(sample_results_json)
        exporter.export(output=output)
        assert output.is_file()
        assert output.stat().st_size > 0


class TestMarkdownReportPipeline:
    """End-to-end Markdown report generation."""

    def test_markdown_contains_title(self, sample_results_json: Path) -> None:
        exporter = MarkdownExporter(sample_results_json)
        text = exporter.export()
        assert "# RenderScope Benchmark Report" in text

    def test_markdown_contains_table_syntax(self, sample_results_json: Path) -> None:
        exporter = MarkdownExporter(sample_results_json)
        text = exporter.export()
        assert "|" in text
        assert "---" in text

    def test_markdown_contains_renderer_names(self, sample_results_json: Path) -> None:
        exporter = MarkdownExporter(sample_results_json)
        text = exporter.export()
        assert "pbrt" in text
        assert "mitsuba3" in text

    def test_markdown_contains_hardware_section(self, sample_results_json: Path) -> None:
        exporter = MarkdownExporter(sample_results_json)
        text = exporter.export()
        assert "## Hardware" in text

    def test_markdown_writes_to_file(self, sample_results_json: Path, tmp_output_dir: Path) -> None:
        output = tmp_output_dir / "report.md"
        exporter = MarkdownExporter(sample_results_json)
        exporter.export(output=output)
        assert output.is_file()
        assert output.stat().st_size > 0


class TestHTMLReportPipeline:
    """End-to-end HTML report generation."""

    def test_html_contains_expected_markers(self, sample_results_json: Path) -> None:
        from renderscope.report.html_report import HTMLReportGenerator

        generator = HTMLReportGenerator(sample_results_json)
        html = generator.generate()

        assert "<!DOCTYPE html>" in html or "<html" in html
        assert "pbrt" in html
        assert "mitsuba3" in html

    def test_html_is_self_contained(self, sample_results_json: Path) -> None:
        """Generated HTML should have inlined CSS (no external links)."""
        from renderscope.report.html_report import HTMLReportGenerator

        generator = HTMLReportGenerator(sample_results_json)
        html = generator.generate()

        assert "<style" in html


class TestReportFromFixtures:
    """Tests using the bundled fixture JSON files."""

    def test_fixture_file_produces_valid_csv(self) -> None:
        fixture = Path(__file__).resolve().parent.parent / "fixtures" / "sample_results.json"
        if not fixture.is_file():
            pytest.skip("Fixture file not found")
        exporter = CSVExporter(fixture)
        text = exporter.export()
        lines = text.strip().split("\n")
        assert len(lines) >= 2  # header + at least one row

    def test_fixture_file_produces_valid_json(self) -> None:
        fixture = Path(__file__).resolve().parent.parent / "fixtures" / "sample_results.json"
        if not fixture.is_file():
            pytest.skip("Fixture file not found")
        exporter = JSONExporter(fixture)
        text = exporter.export()
        data = json.loads(text)
        assert isinstance(data, list)
        assert len(data) >= 1
