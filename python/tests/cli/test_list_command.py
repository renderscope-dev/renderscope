"""Tests for the ``renderscope list`` CLI command."""

from __future__ import annotations

import json
import re

import pytest
from typer.testing import CliRunner

from renderscope.cli.main import app

pytestmark = pytest.mark.cli

runner = CliRunner()

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def _strip_ansi(text: str) -> str:
    """Remove ANSI escape codes from Rich/Typer output."""
    return _ANSI_RE.sub("", text)


class TestListCommand:
    """Tests for the list command."""

    def test_list_basic(self) -> None:
        result = runner.invoke(app, ["list"])
        assert result.exit_code == 0
        assert "PBRT" in result.output or "Mitsuba" in result.output

    def test_list_technique_filter(self) -> None:
        result = runner.invoke(app, ["list", "--technique", "path_tracing"])
        assert result.exit_code == 0
        assert "PBRT" in result.output

    def test_list_technique_filter_neural(self) -> None:
        result = runner.invoke(app, ["list", "--technique", "neural"])
        assert result.exit_code == 0

    def test_list_no_match(self) -> None:
        result = runner.invoke(app, ["list", "--technique", "nonexistent_technique"])
        assert result.exit_code == 0
        assert "No renderers" in result.output

    def test_list_json_format(self) -> None:
        result = runner.invoke(app, ["list", "--format", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert isinstance(data, list)
        assert len(data) > 0
        first = data[0]
        assert "id" in first
        assert "name" in first
        assert "technique" in first

    def test_list_json_with_filter(self) -> None:
        result = runner.invoke(app, ["list", "--format", "json", "--technique", "path_tracing"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        for item in data:
            assert "path_tracing" in item["technique"]

    def test_list_language_filter(self) -> None:
        result = runner.invoke(app, ["list", "--language", "C++"])
        assert result.exit_code == 0
        assert "PBRT" in result.output

    def test_list_status_filter(self) -> None:
        result = runner.invoke(app, ["list", "--status", "active"])
        assert result.exit_code == 0

    def test_list_json_includes_installed_fields(self) -> None:
        result = runner.invoke(app, ["list", "--format", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        first = data[0]
        assert "installed" in first
        assert "installed_version" in first
        assert isinstance(first["installed"], bool)

    def test_list_installed_only_flag(self) -> None:
        result = runner.invoke(app, ["list", "--installed-only"])
        assert result.exit_code == 0

    def test_list_help(self) -> None:
        result = runner.invoke(app, ["list", "--help"])
        assert result.exit_code == 0
        output = _strip_ansi(result.output)
        assert "--technique" in output
        assert "--format" in output
        assert "--installed-only" in output

    def test_list_excludes_mock_adapter(self) -> None:
        """The mock adapter should not appear in list JSON output."""
        result = runner.invoke(app, ["list", "--format", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        ids = [item.get("id", "") for item in data]
        assert "mock" not in ids
