"""Renderer adapters for RenderScope.

Each supported renderer has a concrete adapter that implements the
``RendererAdapter`` abstract interface defined in ``base.py``.
Adapters self-register with the ``AdapterRegistry`` on import.
"""

from __future__ import annotations

import importlib
import logging

logger = logging.getLogger(__name__)

# All adapter modules that should be auto-registered.
# Adding a new adapter: create the file and add its module path here.
_ADAPTER_MODULES = [
    # Session 16.1 adapters
    "renderscope.adapters.pbrt",
    "renderscope.adapters.mitsuba",
    "renderscope.adapters.cycles",
    # Session 16.2 adapters
    "renderscope.adapters.luxcore",
    "renderscope.adapters.appleseed",
    "renderscope.adapters.filament",
    "renderscope.adapters.ospray",
]


def _register_all() -> None:
    """Import all adapter modules so they self-register with the registry.

    Each adapter module calls ``registry.register(MyAdapter)`` at module
    level, so importing the module is sufficient to register the adapter.
    Individual import failures are logged and skipped — one broken adapter
    should never prevent the rest from loading.
    """
    for module_name in _ADAPTER_MODULES:
        try:
            importlib.import_module(module_name)
        except Exception:
            logger.debug("Could not load adapter %s", module_name, exc_info=True)
