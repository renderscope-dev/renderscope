"""Tests for CLI --help and --version flags."""

from __future__ import annotations

import pytest
from typer.testing import CliRunner

from renderscope.cli.main import app

pytestmark = pytest.mark.cli

runner = CliRunner()


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
        assert result.exit_code in (0, 2)
        assert "Usage" in result.output or "renderscope" in result.output.lower()
