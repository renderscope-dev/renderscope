"""Adapter registry for discovering and managing renderer adapters.

The registry is the central lookup for all renderer adapters.  It supports
eager registration (adapters register at import time) and lazy detection
(``detect()`` is only called when status is queried).  Detection results
are cached for the lifetime of the process.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from renderscope.adapters.base import RendererAdapter

logger = logging.getLogger(__name__)


class AdapterRegistry:
    """Registry of renderer adapters.

    Manages adapter classes and their detection state.  The typical usage
    pattern is:

    1. Adapter modules self-register via ``registry.register(MyAdapter)``
       at import time (triggered by ``_register_all()`` in the adapters
       package).
    2. CLI commands call ``registry.detect_all()`` to probe for installed
       renderers — results are cached.
    3. Individual lookups via ``registry.get(name)`` return adapter
       instances on demand.
    """

    def __init__(self) -> None:
        self._adapters: dict[str, type[RendererAdapter]] = {}
        self._detection_cache: dict[str, str | None] | None = None
        self._initialized = False

    def _ensure_initialized(self) -> None:
        """Lazy-import all adapter modules on first access."""
        if self._initialized:
            return
        self._initialized = True
        # Import adapter modules so they self-register
        from renderscope.adapters import _register_all

        _register_all()

    def register(self, adapter_cls: type[RendererAdapter]) -> None:
        """Register a renderer adapter class.

        Args:
            adapter_cls: A concrete subclass of ``RendererAdapter``.
        """
        instance = adapter_cls()
        name = instance.name
        if name in self._adapters:
            logger.debug("Adapter '%s' already registered; overwriting.", name)
        self._adapters[name] = adapter_cls
        # Invalidate detection cache when a new adapter is registered
        self._detection_cache = None

    def get(self, name: str) -> RendererAdapter | None:
        """Get an adapter instance by canonical renderer name.

        Args:
            name: The renderer identifier (e.g., ``'pbrt'``).

        Returns:
            An adapter instance, or ``None`` if not registered.
        """
        self._ensure_initialized()
        adapter_cls = self._adapters.get(name)
        if adapter_cls is None:
            return None
        return adapter_cls()

    def list_all(self) -> list[RendererAdapter]:
        """Return instances of all registered adapters."""
        self._ensure_initialized()
        return [cls() for cls in self._adapters.values()]

    def list_installed(self) -> list[tuple[RendererAdapter, str]]:
        """Return adapters for renderers detected on this system.

        Returns:
            A list of ``(adapter, version_string)`` tuples.
        """
        self._ensure_initialized()
        detection = self.detect_all()
        installed: list[tuple[RendererAdapter, str]] = []
        for name, version in detection.items():
            if version is not None:
                adapter_cls = self._adapters.get(name)
                if adapter_cls is not None:
                    installed.append((adapter_cls(), version))
        return installed

    def detect_all(self) -> dict[str, str | None]:
        """Run detection on all registered adapters and cache results.

        Returns:
            A dict mapping adapter name to version string (or ``None``
            if the renderer is not installed).
        """
        self._ensure_initialized()
        if self._detection_cache is not None:
            return self._detection_cache

        results: dict[str, str | None] = {}
        for name, adapter_cls in self._adapters.items():
            try:
                adapter = adapter_cls()
                version = adapter.detect()
                results[name] = version
                if version is not None:
                    logger.debug("Detected %s version %s", name, version)
                else:
                    logger.debug("%s not found", name)
            except Exception:
                logger.debug("Detection failed for %s", name, exc_info=True)
                results[name] = None

        self._detection_cache = results
        return results

    def get_names(self) -> list[str]:
        """Return sorted list of all registered adapter names."""
        self._ensure_initialized()
        return sorted(self._adapters.keys())

    def clear_cache(self) -> None:
        """Clear the detection cache, forcing re-detection on next query."""
        self._detection_cache = None


# Module-level singleton used throughout the application
registry = AdapterRegistry()
