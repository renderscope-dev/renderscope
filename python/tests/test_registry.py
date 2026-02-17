"""Tests for the AdapterRegistry in core/registry.py."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

from renderscope.adapters.base import RendererAdapter
from renderscope.core.registry import AdapterRegistry

if TYPE_CHECKING:
    from pathlib import Path

    from renderscope.models.benchmark import RenderResult
    from renderscope.models.settings import RenderSettings


# ---------------------------------------------------------------------------
# Concrete test adapter
# ---------------------------------------------------------------------------


class _MockAdapter(RendererAdapter):
    """A minimal adapter for testing the registry."""

    @property
    def name(self) -> str:
        return "mock-renderer"

    @property
    def display_name(self) -> str:
        return "Mock Renderer"

    def detect(self) -> str | None:
        return "1.0.0"

    def supported_formats(self) -> list[str]:
        return ["mock"]

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        raise NotImplementedError


class _UninstalledAdapter(RendererAdapter):
    """A mock adapter that is never installed."""

    @property
    def name(self) -> str:
        return "uninstalled-renderer"

    @property
    def display_name(self) -> str:
        return "Uninstalled Renderer"

    def detect(self) -> str | None:
        return None

    def supported_formats(self) -> list[str]:
        return ["mock"]

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        raise NotImplementedError


class _FailingDetectAdapter(RendererAdapter):
    """A mock adapter whose detect() raises an exception."""

    @property
    def name(self) -> str:
        return "failing-detector"

    @property
    def display_name(self) -> str:
        return "Failing Detector"

    def detect(self) -> str | None:
        raise RuntimeError("Detection explosion")

    def supported_formats(self) -> list[str]:
        return []

    def render(
        self,
        scene_path: Path,
        output_path: Path,
        settings: RenderSettings,
    ) -> RenderResult:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.fixture()
def fresh_registry() -> AdapterRegistry:
    """Create a fresh registry without auto-initialization."""
    reg = AdapterRegistry()
    reg._initialized = True  # Skip auto-import of real adapters
    return reg


class TestAdapterRegistry:
    """Tests for the AdapterRegistry class."""

    def test_register_and_get(self, fresh_registry: AdapterRegistry) -> None:
        fresh_registry.register(_MockAdapter)
        adapter = fresh_registry.get("mock-renderer")
        assert adapter is not None
        assert adapter.name == "mock-renderer"
        assert adapter.display_name == "Mock Renderer"

    def test_get_unknown_returns_none(self, fresh_registry: AdapterRegistry) -> None:
        assert fresh_registry.get("nonexistent") is None

    def test_list_all(self, fresh_registry: AdapterRegistry) -> None:
        fresh_registry.register(_MockAdapter)
        fresh_registry.register(_UninstalledAdapter)
        adapters = fresh_registry.list_all()
        names = {a.name for a in adapters}
        assert "mock-renderer" in names
        assert "uninstalled-renderer" in names

    def test_get_names(self, fresh_registry: AdapterRegistry) -> None:
        fresh_registry.register(_MockAdapter)
        fresh_registry.register(_UninstalledAdapter)
        names = fresh_registry.get_names()
        assert names == ["mock-renderer", "uninstalled-renderer"]

    def test_detect_all(self, fresh_registry: AdapterRegistry) -> None:
        fresh_registry.register(_MockAdapter)
        fresh_registry.register(_UninstalledAdapter)
        detection = fresh_registry.detect_all()
        assert detection["mock-renderer"] == "1.0.0"
        assert detection["uninstalled-renderer"] is None

    def test_detect_all_caching(self, fresh_registry: AdapterRegistry) -> None:
        fresh_registry.register(_MockAdapter)
        result1 = fresh_registry.detect_all()
        result2 = fresh_registry.detect_all()
        assert result1 is result2  # Same object = cached

    def test_register_invalidates_cache(self, fresh_registry: AdapterRegistry) -> None:
        fresh_registry.register(_MockAdapter)
        result1 = fresh_registry.detect_all()
        fresh_registry.register(_UninstalledAdapter)
        result2 = fresh_registry.detect_all()
        assert result1 is not result2

    def test_clear_cache(self, fresh_registry: AdapterRegistry) -> None:
        fresh_registry.register(_MockAdapter)
        result1 = fresh_registry.detect_all()
        fresh_registry.clear_cache()
        result2 = fresh_registry.detect_all()
        assert result1 is not result2

    def test_list_installed(self, fresh_registry: AdapterRegistry) -> None:
        fresh_registry.register(_MockAdapter)
        fresh_registry.register(_UninstalledAdapter)
        installed = fresh_registry.list_installed()
        assert len(installed) == 1
        adapter, version = installed[0]
        assert adapter.name == "mock-renderer"
        assert version == "1.0.0"

    def test_failing_detection_returns_none(self, fresh_registry: AdapterRegistry) -> None:
        fresh_registry.register(_FailingDetectAdapter)
        detection = fresh_registry.detect_all()
        assert detection["failing-detector"] is None

    def test_overwrite_registration(self, fresh_registry: AdapterRegistry) -> None:
        """Re-registering the same adapter should overwrite."""
        fresh_registry.register(_MockAdapter)
        fresh_registry.register(_MockAdapter)
        assert len(fresh_registry.list_all()) == 1


class TestGlobalRegistry:
    """Tests for the module-level singleton registry."""

    def test_global_registry_exists(self) -> None:
        from renderscope.core.registry import registry

        assert isinstance(registry, AdapterRegistry)

    def test_global_registry_initializes_adapters(self) -> None:
        from renderscope.core.registry import registry

        names = registry.get_names()
        # After lazy init, our three adapters should be registered
        assert "pbrt" in names
        assert "mitsuba3" in names
        assert "blender-cycles" in names

    def test_global_registry_detect_all_returns_dict(self) -> None:
        from renderscope.core.registry import registry

        detection = registry.detect_all()
        assert isinstance(detection, dict)
        # Each known adapter should have an entry
        assert "pbrt" in detection
        assert "mitsuba3" in detection
        assert "blender-cycles" in detection
