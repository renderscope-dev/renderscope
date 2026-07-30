"""Shared results file loading for the report module.

All exporters use this module to load and validate the benchmark results
JSON file.  The loader supports the three formats produced by RenderScope:

1. **Array format** — a JSON array of ``BenchmarkResult`` dicts
   (the direct output of ``BenchmarkRunner.save_results()``).
2. **Wrapped format** — a JSON object with ``"results"`` key containing
   the array (used in fixture files and shared reports).
3. **Single-record format** — one benchmark object on its own, which is how
   published catalog records in ``data/benchmarks/`` are stored.  Accepting it
   means any file RenderScope writes can be read back by any command.
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from pathlib import Path

logger = logging.getLogger(__name__)


def load_results_raw(results_path: Path) -> list[dict[str, Any]]:
    """Load benchmark results from a JSON file.

    Returns a list of result dicts (one per renderer x scene).

    Args:
        results_path: Path to the JSON file.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file contents are not valid benchmark results.
    """
    if not results_path.is_file():
        msg = f"Results file not found: {results_path}"
        raise FileNotFoundError(msg)

    text = results_path.read_text(encoding="utf-8")

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        msg = f"Invalid JSON in {results_path}: {exc}"
        raise ValueError(msg) from exc

    return _normalize_results(data, results_path)


def _normalize_results(data: Any, source: Path) -> list[dict[str, Any]]:
    """Accept both array and wrapped formats, returning a flat list.

    **Array format** (direct ``save_results()`` output)::

        [ { "id": "...", "renderer": "...", ... }, ... ]

    **Wrapped format** (with metadata envelope)::

        {
            "version": "1.0",
            "metadata": { ... },
            "results": [ ... ]
        }
    """
    if isinstance(data, list):
        return [_validate_entry(e, i, source) for i, e in enumerate(data)]

    if isinstance(data, dict):
        results_list = data.get("results")
        if isinstance(results_list, list):
            return [_validate_entry(e, i, source) for i, e in enumerate(results_list)]

        # **Single-record format** — one benchmark on its own. A published
        # catalog record also has a "results" key, but it holds an object
        # rather than an array, so the check above falls through to here.
        if _is_single_record(data):
            return [_validate_entry(data, 0, source)]

        msg = (
            f"Expected a JSON array, a single benchmark object, or an object with a "
            f"'results' array in {source}, got an object with keys: "
            f"{', '.join(sorted(map(str, data))) or '(none)'}."
        )
        raise ValueError(msg)

    msg = f"Expected a JSON array or object in {source}, got {type(data).__name__}"
    raise ValueError(msg)


def _is_single_record(data: dict[str, Any]) -> bool:
    """Return True if a JSON object is one benchmark rather than an envelope.

    Both run records and published catalog records identify the renderer and
    scene at the top level; an envelope does not.
    """
    return "renderer" in data and "scene" in data


def _validate_entry(entry: Any, index: int, source: Path) -> dict[str, Any]:
    """Validate that an entry is a dict with basic required fields."""
    if not isinstance(entry, dict):
        msg = f"Result entry {index} in {source} is not a dict"
        raise ValueError(msg)

    # Require at minimum renderer and scene fields.
    if "renderer" not in entry:
        logger.warning("Result entry %d in %s is missing 'renderer' field", index, source)
    if "scene" not in entry:
        logger.warning("Result entry %d in %s is missing 'scene' field", index, source)

    return entry
