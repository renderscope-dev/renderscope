"""Tests that verify all registered adapters satisfy the RendererAdapter contract.

Loops over every adapter in the global registry and checks interface
compliance. This catches regressions when new adapters are added.
"""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from renderscope.adapters.base import RendererAdapter

pytestmark = pytest.mark.adapters

_SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


class TestAdapterInterface:
    """Cross-adapter interface contract tests."""

    @pytest.fixture()
    def all_adapters(self) -> list[RendererAdapter]:
        from renderscope.core.registry import registry

        return registry.list_all()

    def test_all_have_non_empty_name(self, all_adapters: list[RendererAdapter]) -> None:
        """Every adapter must have a non-empty name."""
        for adapter in all_adapters:
            assert isinstance(adapter.name, str)
            assert len(adapter.name) > 0, f"Adapter has empty name: {adapter}"

    def test_all_names_are_slugs(self, all_adapters: list[RendererAdapter]) -> None:
        """Adapter names should be lowercase slug identifiers."""
        for adapter in all_adapters:
            assert _SLUG_RE.match(adapter.name), (
                f"Adapter name '{adapter.name}' is not a valid slug"
            )

    def test_all_have_display_name(self, all_adapters: list[RendererAdapter]) -> None:
        for adapter in all_adapters:
            assert isinstance(adapter.display_name, str)
            assert len(adapter.display_name) > 0

    def test_all_have_supported_formats(self, all_adapters: list[RendererAdapter]) -> None:
        for adapter in all_adapters:
            formats = adapter.supported_formats()
            assert isinstance(formats, list)
            assert len(formats) > 0, f"{adapter.name} has no supported formats"
            for fmt in formats:
                assert isinstance(fmt, str)

    def test_detect_returns_correct_type(self, all_adapters: list[RendererAdapter]) -> None:
        """detect() must return str or None — never crashes."""
        for adapter in all_adapters:
            result = adapter.detect()
            assert result is None or isinstance(result, str), (
                f"{adapter.name}.detect() returned {type(result)}"
            )

    def test_unique_names(self, all_adapters: list[RendererAdapter]) -> None:
        names = [a.name for a in all_adapters]
        assert len(names) == len(set(names)), f"Duplicate adapter names: {names}"

    def test_is_mock_is_bool(self, all_adapters: list[RendererAdapter]) -> None:
        """is_mock property must return a bool."""
        for adapter in all_adapters:
            assert isinstance(adapter.is_mock, bool)
