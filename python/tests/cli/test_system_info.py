"""Tests for the ``renderscope system-info`` CLI command."""

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
    return _ANSI_RE.sub("", text)


class TestSystemInfoCommand:
    """Tests for the system-info command."""

    def test_system_info_panel(self) -> None:
        result = runner.invoke(app, ["system-info"])
        assert result.exit_code == 0
        assert "CPU" in result.output
        assert "RAM" in result.output

    def test_system_info_json(self) -> None:
        result = runner.invoke(app, ["system-info", "--format", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "cpu" in data
        assert "ram_gb" in data
        assert "os" in data
        assert "python_version" in data

    def test_system_info_help(self) -> None:
        result = runner.invoke(app, ["system-info", "--help"])
        assert result.exit_code == 0
        assert "--format" in _strip_ansi(result.output)
