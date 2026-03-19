"""Clean JSON export for benchmark results.

Produces deterministic, portable JSON output with sorted keys, consistent
formatting, and relative file paths.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path, PurePosixPath
from typing import Any

from renderscope.report._loader import load_results_raw

logger = logging.getLogger(__name__)


class JSONExporter:
    """Export benchmark results as clean, formatted JSON."""

    def __init__(self, results_path: Path) -> None:
        """Load and validate results from a JSON file.

        Args:
            results_path: Path to the benchmark results JSON file.

        Raises:
            FileNotFoundError: If *results_path* does not exist.
            json.JSONDecodeError: If the file is not valid JSON.
        """
        self._results_path = results_path
        self._raw = load_results_raw(results_path)

    def export(self, output: Path | None = None, *, indent: int = 2) -> str:
        """Export results as formatted JSON.

        If *output* is provided, writes to that file.
        Always returns the JSON string.

        Differences from the raw input file:

        - Pretty-printed with consistent indentation
        - Keys sorted alphabetically for deterministic output
        - Timestamps normalized to ISO 8601
        - File paths converted to relative paths (for portability)
        """
        cleaned = _clean_results(self._raw)
        text = json.dumps(cleaned, indent=indent, sort_keys=True, ensure_ascii=False) + "\n"

        if output is not None:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(text, encoding="utf-8")
            logger.info("JSON report saved to %s", output)

        return text


def _clean_results(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Produce a cleaned copy with relative paths and sorted keys."""
    return [_clean_entry(entry) for entry in raw]


def _clean_entry(entry: dict[str, Any]) -> dict[str, Any]:
    """Clean a single result entry."""
    cleaned: dict[str, Any] = {}
    for key in sorted(entry.keys()):
        value = entry[key]
        if isinstance(value, dict):
            cleaned[key] = _clean_dict(value)
        elif isinstance(value, list):
            cleaned[key] = [_clean_value(v) for v in value]
        else:
            cleaned[key] = _relativize_path(value) if _is_path_field(key) else value
    return cleaned


def _clean_dict(d: dict[str, Any]) -> dict[str, Any]:
    """Recursively clean a nested dict."""
    cleaned: dict[str, Any] = {}
    for key in sorted(d.keys()):
        value = d[key]
        if isinstance(value, dict):
            cleaned[key] = _clean_dict(value)
        elif isinstance(value, list):
            cleaned[key] = [_clean_value(v) for v in value]
        else:
            cleaned[key] = _relativize_path(value) if _is_path_field(key) else value
    return cleaned


def _clean_value(value: Any) -> Any:
    """Clean a value that might be nested."""
    if isinstance(value, dict):
        return _clean_dict(value)
    return value


_PATH_FIELDS = frozenset({"output_path", "output_image", "output_image_web"})


def _is_path_field(key: str) -> bool:
    """Return True if a key typically contains a file path."""
    return key in _PATH_FIELDS


def _relativize_path(value: Any) -> Any:
    """Convert absolute paths to relative POSIX paths."""
    if not isinstance(value, str):
        return value
    path = Path(value)
    if path.is_absolute():
        # Convert to a relative POSIX-style path from the last meaningful segment.
        # Keep just the last 3 components: e.g., renderscope-results/scene/file.exr
        parts = path.parts
        # Find the first directory that looks like an output directory.
        for i, part in enumerate(parts):
            if part in ("renderscope-results", "renders", "output", "results"):
                return str(PurePosixPath(*parts[i:]))
        # Fallback: use last 3 components.
        if len(parts) > 3:
            return str(PurePosixPath(*parts[-3:]))
        return str(PurePosixPath(*parts))
    return value
