"""Load bundled renderer JSON data for the RenderScope CLI and library.

In development (editable install), data is read from the monorepo's
``/data/renderers/`` directory.  In production (installed from a wheel),
data is bundled inside the package via ``importlib.resources``.
"""

from __future__ import annotations

import importlib.resources
import json
import logging
from pathlib import Path

from renderscope.models.renderer import RendererMetadata

logger = logging.getLogger(__name__)

# Module-level cache: populated on first access
_renderer_cache: list[RendererMetadata] | None = None


def _find_data_dir() -> Path | None:
    """Locate the renderer data directory.

    Resolution order:
    1. Monorepo layout: ``<project_root>/data/renderers/``
    2. Bundled package data: ``renderscope/data/renderers/`` inside the
       installed package.

    Returns ``None`` only if neither location contains JSON files.
    """
    # 1. Development mode — monorepo layout
    # From python/src/renderscope/core/data_loader.py → ../../../../data/renderers
    source_file = Path(__file__).resolve()
    project_candidates = [
        source_file.parent.parent.parent.parent.parent / "data" / "renderers",  # src layout
        source_file.parent.parent.parent.parent / "data" / "renderers",  # flat layout fallback
    ]
    for candidate in project_candidates:
        if candidate.is_dir() and any(candidate.glob("*.json")):
            return candidate

    # 2. Installed mode — use importlib.resources
    try:
        resources = importlib.resources.files("renderscope.data.renderers")
        # importlib.resources may return a Traversable; try to resolve to a Path
        resource_path = Path(str(resources))
        if resource_path.is_dir() and any(resource_path.glob("*.json")):
            return resource_path
    except (ModuleNotFoundError, TypeError, AttributeError):
        pass

    return None


def get_data_dir() -> Path:
    """Return the path to the renderer data directory.

    Raises:
        FileNotFoundError: If no renderer data directory can be found.
    """
    data_dir = _find_data_dir()
    if data_dir is None:
        msg = (
            "Cannot locate renderer data directory. "
            "Ensure you are running from the monorepo or that the package "
            "was built with data files included."
        )
        raise FileNotFoundError(msg)
    return data_dir


def load_all_renderers() -> list[RendererMetadata]:
    """Load all renderer JSON files and return validated models.

    Results are cached for the duration of the process.  Malformed files
    are logged as warnings and skipped — the CLI should not crash because
    of a single broken data file.
    """
    global _renderer_cache
    if _renderer_cache is not None:
        return _renderer_cache

    data_dir = get_data_dir()
    renderers: list[RendererMetadata] = []

    for json_file in sorted(data_dir.glob("*.json")):
        if json_file.name.startswith("_"):
            continue  # Skip template files like _template.json

        try:
            raw = json.loads(json_file.read_text(encoding="utf-8"))
            renderer = RendererMetadata.model_validate(raw)
            renderers.append(renderer)
        except json.JSONDecodeError as exc:
            logger.warning("Skipping %s: invalid JSON — %s", json_file.name, exc)
        except Exception as exc:
            logger.warning("Skipping %s: validation error — %s", json_file.name, exc)

    renderers.sort(key=lambda r: r.name.lower())
    _renderer_cache = renderers
    return renderers


def load_renderer(renderer_id: str) -> RendererMetadata | None:
    """Load a single renderer by its ID (filename without ``.json``).

    Returns ``None`` if the renderer is not found.
    """
    for renderer in load_all_renderers():
        if renderer.id == renderer_id:
            return renderer
    return None


def get_renderer_ids() -> list[str]:
    """Return a sorted list of all available renderer IDs."""
    return sorted(r.id for r in load_all_renderers())


def clear_cache() -> None:
    """Clear the in-memory renderer cache.

    Useful in tests to ensure data is reloaded from disk.
    """
    global _renderer_cache
    _renderer_cache = None
