"""Tests for the ``renderscope info`` CLI command."""

from __future__ import annotations

import pytest
from typer.testing import CliRunner

from renderscope.cli.main import app

pytestmark = pytest.mark.cli

runner = CliRunner()


class TestInfoCommand:
    """Tests for the fully-implemented info command."""

    def test_info_valid_renderer(self) -> None:
        result = runner.invoke(app, ["info", "pbrt"])
        assert result.exit_code == 0
        assert "PBRT" in result.output

    def test_info_unknown_renderer(self) -> None:
        result = runner.invoke(app, ["info", "nonexistent-renderer-xyz"])
        assert result.exit_code == 1
        assert "not found" in result.output.lower()

    def test_info_by_display_name(self) -> None:
        result = runner.invoke(app, ["info", "Mitsuba 3"])
        assert result.exit_code == 0
        assert "Mitsuba" in result.output

    def test_info_fuzzy_suggestions(self) -> None:
        result = runner.invoke(app, ["info", "pbr"])
        assert result.exit_code in (0, 1)

    def test_info_help(self) -> None:
        result = runner.invoke(app, ["info", "--help"])
        assert result.exit_code == 0
        assert "RENDERER" in result.output or "renderer" in result.output.lower()
