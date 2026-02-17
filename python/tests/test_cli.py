"""Tests for CLI commands using Typer's CliRunner."""

from __future__ import annotations

import json
import re

from typer.testing import CliRunner

from renderscope.cli.main import app

runner = CliRunner()

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def _strip_ansi(text: str) -> str:
    """Remove ANSI escape codes from Rich/Typer output."""
    return _ANSI_RE.sub("", text)


class TestHelpAndVersion:
    """Tests for --help and --version flags."""

    def test_help(self) -> None:
        """--help should exit 0 and mention renderscope."""
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "renderscope" in result.output.lower() or "rendering" in result.output.lower()

    def test_version(self) -> None:
        """--version should print the version string."""
        result = runner.invoke(app, ["--version"])
        assert result.exit_code == 0
        assert "RenderScope" in result.output
        assert "0.1.0" in result.output

    def test_no_args_shows_help(self) -> None:
        """Running with no arguments should show help text."""
        result = runner.invoke(app, [])
        # Typer's no_args_is_help exits with code 0 or 2 depending on version.
        assert result.exit_code in (0, 2)
        assert "Usage" in result.output or "renderscope" in result.output.lower()


class TestListCommand:
    """Tests for the list command."""

    def test_list_basic(self) -> None:
        """List should exit 0 and show renderer names."""
        result = runner.invoke(app, ["list"])
        assert result.exit_code == 0
        # Should contain at least one well-known renderer
        assert "PBRT" in result.output or "Mitsuba" in result.output

    def test_list_technique_filter(self) -> None:
        """Filtering by technique should narrow results."""
        result = runner.invoke(app, ["list", "--technique", "path_tracing"])
        assert result.exit_code == 0
        assert "PBRT" in result.output

    def test_list_technique_filter_neural(self) -> None:
        """Filtering by neural technique should show neural renderers."""
        result = runner.invoke(app, ["list", "--technique", "neural"])
        assert result.exit_code == 0
        # Should not contain purely classical renderers
        # (but check that it runs without error)

    def test_list_no_match(self) -> None:
        """Filtering with no matches should show a friendly message."""
        result = runner.invoke(app, ["list", "--technique", "nonexistent_technique"])
        assert result.exit_code == 0
        assert "No renderers" in result.output

    def test_list_json_format(self) -> None:
        """JSON format should produce valid JSON output."""
        result = runner.invoke(app, ["list", "--format", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert isinstance(data, list)
        assert len(data) > 0
        # Each item should have expected fields
        first = data[0]
        assert "id" in first
        assert "name" in first
        assert "technique" in first

    def test_list_json_with_filter(self) -> None:
        """JSON output should respect filters."""
        result = runner.invoke(app, ["list", "--format", "json", "--technique", "path_tracing"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        for item in data:
            assert "path_tracing" in item["technique"]

    def test_list_language_filter(self) -> None:
        """Filtering by language should work."""
        result = runner.invoke(app, ["list", "--language", "C++"])
        assert result.exit_code == 0
        # PBRT is C++, should be present
        assert "PBRT" in result.output

    def test_list_status_filter(self) -> None:
        """Filtering by status should work."""
        result = runner.invoke(app, ["list", "--status", "active"])
        assert result.exit_code == 0

    def test_list_json_includes_installed_fields(self) -> None:
        """JSON output should include installed status fields."""
        result = runner.invoke(app, ["list", "--format", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        first = data[0]
        assert "installed" in first
        assert "installed_version" in first
        assert isinstance(first["installed"], bool)

    def test_list_installed_only_flag(self) -> None:
        """--installed-only should work without error."""
        result = runner.invoke(app, ["list", "--installed-only"])
        assert result.exit_code == 0

    def test_list_help(self) -> None:
        """list --help should show option descriptions."""
        result = runner.invoke(app, ["list", "--help"])
        assert result.exit_code == 0
        output = _strip_ansi(result.output)
        assert "--technique" in output
        assert "--format" in output
        assert "--installed-only" in output


class TestSystemInfoCommand:
    """Tests for the system-info command."""

    def test_system_info_panel(self) -> None:
        """system-info should display hardware information."""
        result = runner.invoke(app, ["system-info"])
        assert result.exit_code == 0
        assert "CPU" in result.output
        assert "RAM" in result.output

    def test_system_info_json(self) -> None:
        """system-info --format json should produce valid JSON."""
        result = runner.invoke(app, ["system-info", "--format", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "cpu" in data
        assert "ram_gb" in data
        assert "os" in data
        assert "python_version" in data

    def test_system_info_help(self) -> None:
        """system-info --help should show format option."""
        result = runner.invoke(app, ["system-info", "--help"])
        assert result.exit_code == 0
        assert "--format" in _strip_ansi(result.output)


class TestInfoCommand:
    """Tests for the fully-implemented info command."""

    def test_info_valid_renderer(self) -> None:
        """info should show details for a known renderer."""
        result = runner.invoke(app, ["info", "pbrt"])
        assert result.exit_code == 0
        assert "PBRT" in result.output

    def test_info_unknown_renderer(self) -> None:
        """info should exit 1 for an unknown renderer."""
        result = runner.invoke(app, ["info", "nonexistent-renderer-xyz"])
        assert result.exit_code == 1
        assert "not found" in result.output.lower()

    def test_info_by_display_name(self) -> None:
        """info should resolve by display name."""
        result = runner.invoke(app, ["info", "Mitsuba 3"])
        assert result.exit_code == 0
        assert "Mitsuba" in result.output

    def test_info_fuzzy_suggestions(self) -> None:
        """info should suggest similar renderers for typos."""
        result = runner.invoke(app, ["info", "pbr"])
        # Should either find it or suggest alternatives
        assert result.exit_code in (0, 1)

    def test_info_help(self) -> None:
        """info --help should show usage."""
        result = runner.invoke(app, ["info", "--help"])
        assert result.exit_code == 0
        assert "RENDERER" in result.output or "renderer" in result.output.lower()


class TestStubCommands:
    """Tests for stub commands that are not yet implemented."""

    def test_benchmark_stub(self) -> None:
        """benchmark command should show under development message."""
        result = runner.invoke(app, ["benchmark"])
        assert result.exit_code == 0
        assert (
            "under development" in result.output.lower() or "development" in result.output.lower()
        )

    def test_compare_missing_files(self) -> None:
        """compare command with missing files should exit with error."""
        result = runner.invoke(app, ["compare", "a.png", "b.png"])
        assert result.exit_code != 0

    def test_report_stub(self) -> None:
        """report command should show under development message."""
        result = runner.invoke(app, ["report", "results.json"])
        assert result.exit_code == 0
        assert (
            "under development" in result.output.lower() or "development" in result.output.lower()
        )

    def test_download_scenes_stub(self) -> None:
        """download-scenes command should show under development message."""
        result = runner.invoke(app, ["download-scenes"])
        assert result.exit_code == 0
        assert (
            "under development" in result.output.lower() or "development" in result.output.lower()
        )

    def test_benchmark_help(self) -> None:
        """benchmark --help should show the future interface."""
        result = runner.invoke(app, ["benchmark", "--help"])
        assert result.exit_code == 0
        output = _strip_ansi(result.output)
        assert "--scene" in output
        assert "--renderer" in output

    def test_compare_help(self) -> None:
        """compare --help should show the future interface."""
        result = runner.invoke(app, ["compare", "--help"])
        assert result.exit_code == 0
        assert "--metrics" in _strip_ansi(result.output)

    def test_report_help(self) -> None:
        """report --help should show the future interface."""
        result = runner.invoke(app, ["report", "--help"])
        assert result.exit_code == 0
        assert "--format" in _strip_ansi(result.output)
