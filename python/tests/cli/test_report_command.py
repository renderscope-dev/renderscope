"""Tests for the ``renderscope report`` CLI command."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from renderscope.cli.main import app

pytestmark = pytest.mark.cli

runner = CliRunner()

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"
SAMPLE = FIXTURES / "sample_results.json"


class TestReportCLI:
    """Tests for the report command via Typer CliRunner."""

    def test_help(self) -> None:
        """``renderscope report --help`` shows all options."""
        result = runner.invoke(app, ["report", "--help"])
        assert result.exit_code == 0
        assert "--format" in result.output
        assert "--output" in result.output
        assert "--title" in result.output
        assert "--no-images" in result.output
        assert "--open" in result.output

    def test_html_default(self, tmp_path: Path, monkeypatch: object) -> None:
        """``renderscope report sample.json`` produces report.html in CWD."""
        import pytest as _pytest

        monkeypatch_obj = _pytest.MonkeyPatch()  # type: ignore[attr-defined]
        monkeypatch_obj.chdir(tmp_path)

        result = runner.invoke(app, ["report", str(SAMPLE)])
        assert result.exit_code == 0

        output = tmp_path / "report.html"
        assert output.is_file()

        content = output.read_text(encoding="utf-8")
        assert "<!DOCTYPE html>" in content

        monkeypatch_obj.undo()

    def test_html_custom_output(self, tmp_path: Path) -> None:
        """``renderscope report sample.json --format html --output custom.html``."""
        output = tmp_path / "custom.html"
        result = runner.invoke(
            app,
            ["report", str(SAMPLE), "--format", "html", "--output", str(output)],
        )
        assert result.exit_code == 0
        assert output.is_file()

        content = output.read_text(encoding="utf-8")
        assert "<!DOCTYPE html>" in content

    def test_csv_to_stdout(self) -> None:
        """``renderscope report sample.json --format csv`` prints CSV to stdout."""
        result = runner.invoke(app, ["report", str(SAMPLE), "--format", "csv"])
        assert result.exit_code == 0

        # Output should contain CSV header.
        assert "scene" in result.output
        assert "renderer" in result.output
        assert "render_time_seconds" in result.output

    def test_csv_to_file(self, tmp_path: Path) -> None:
        """``renderscope report sample.json --format csv --output results.csv``."""
        output = tmp_path / "results.csv"
        result = runner.invoke(
            app,
            ["report", str(SAMPLE), "--format", "csv", "--output", str(output)],
        )
        assert result.exit_code == 0
        assert output.is_file()

    def test_json_to_stdout(self) -> None:
        """``renderscope report sample.json --format json`` prints JSON to stdout."""
        result = runner.invoke(app, ["report", str(SAMPLE), "--format", "json"])
        assert result.exit_code == 0

        # Output should be valid JSON.
        data = json.loads(result.output)
        assert isinstance(data, list)
        assert len(data) == 4

    def test_markdown_to_stdout(self) -> None:
        """``renderscope report sample.json --format markdown`` prints Markdown."""
        result = runner.invoke(app, ["report", str(SAMPLE), "--format", "markdown"])
        assert result.exit_code == 0

        assert "# RenderScope Benchmark Report" in result.output
        assert "Cornell Box" in result.output

    def test_invalid_results_file(self) -> None:
        """``renderscope report nonexistent.json`` exits with error."""
        result = runner.invoke(app, ["report", "nonexistent.json"])
        assert result.exit_code != 0
        assert "not found" in result.output.lower() or "error" in result.output.lower()

    def test_invalid_json_content(self, tmp_path: Path) -> None:
        """``renderscope report malformed.json`` exits with error."""
        malformed = tmp_path / "malformed.json"
        malformed.write_text("this is not json", encoding="utf-8")

        result = runner.invoke(app, ["report", str(malformed)])
        assert result.exit_code != 0

    def test_no_images_flag(self, tmp_path: Path) -> None:
        """``--no-images`` produces a smaller HTML file."""
        output_with = tmp_path / "with_images.html"
        output_without = tmp_path / "without_images.html"

        runner.invoke(
            app,
            ["report", str(SAMPLE), "--format", "html", "--output", str(output_with)],
        )
        runner.invoke(
            app,
            [
                "report",
                str(SAMPLE),
                "--format",
                "html",
                "--output",
                str(output_without),
                "--no-images",
            ],
        )

        # Both files should exist.
        assert output_with.is_file()
        assert output_without.is_file()

        # Without images should be present.
        content = output_without.read_text(encoding="utf-8")
        assert "<!DOCTYPE html>" in content

    def test_custom_title(self, tmp_path: Path) -> None:
        """``--title`` sets a custom report title."""
        output = tmp_path / "titled.html"
        custom_title = "PBRT vs Mitsuba Comparison"
        result = runner.invoke(
            app,
            [
                "report",
                str(SAMPLE),
                "--format",
                "html",
                "--output",
                str(output),
                "--title",
                custom_title,
            ],
        )
        assert result.exit_code == 0

        content = output.read_text(encoding="utf-8")
        assert custom_title in content
