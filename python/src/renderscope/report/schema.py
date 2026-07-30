"""Access to the published benchmark JSON Schema.

``schemas/benchmark.schema.json`` is the contract between everything that
*writes* catalog data (this package, ``scripts/compute_benchmarks_from_renders.py``)
and everything that *reads* it (the web dashboard, ``scripts/validate_data.py``).
The wheel bundles a copy so an installed ``renderscope`` can check its own output
before a contributor opens a pull request.

:func:`validate_benchmark_document` is a defence-in-depth check on top of the
``Canonical*`` models in :mod:`renderscope.report.benchmark_export`, which
already enforce the schema structurally.  It requires ``jsonschema``, which is a
development dependency rather than a runtime one — when it is not installed the
check reports as unavailable instead of failing, so publishing never depends on
an optional package.
"""

from __future__ import annotations

import importlib.resources
import json
import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Sequence

logger = logging.getLogger(__name__)

__all__ = [
    "BENCHMARK_SCHEMA_FILENAME",
    "SchemaNotAvailableError",
    "jsonschema_available",
    "load_benchmark_schema",
    "validate_benchmark_document",
]

BENCHMARK_SCHEMA_FILENAME = "benchmark.schema.json"

_PACKAGE = "renderscope.data.schemas"


class SchemaNotAvailableError(RuntimeError):
    """Raised when the bundled schema cannot be located or parsed."""


def _monorepo_schema_path(filename: str) -> Path:
    """Path to the canonical schema in a monorepo checkout.

    ``src/renderscope/report/schema.py`` sits four directories below the repo
    root, where ``schemas/`` lives alongside ``python/``.
    """
    return Path(__file__).resolve().parents[4] / "schemas" / filename


def _load_schema_file(filename: str) -> dict[str, Any]:
    """Load a bundled schema, falling back to the monorepo checkout.

    An installed wheel carries the schema as package data.  An editable install
    or a source checkout does not, so the repo-root copy is used instead — which
    also guarantees development always validates against the single source of
    truth rather than a stale duplicate.
    """
    try:
        resource = importlib.resources.files(_PACKAGE).joinpath(filename)
        if resource.is_file():
            return _parse(resource.read_text(encoding="utf-8"), str(resource))
    except (ModuleNotFoundError, FileNotFoundError, TypeError, OSError) as exc:
        logger.debug("Bundled schema %s unavailable: %s", filename, exc)

    fallback = _monorepo_schema_path(filename)
    if fallback.is_file():
        return _parse(fallback.read_text(encoding="utf-8"), str(fallback))

    msg = (
        f"Could not locate '{filename}'. It is expected as package data in "
        f"'{_PACKAGE}' or at '{fallback}' in a monorepo checkout."
    )
    raise SchemaNotAvailableError(msg)


def _parse(raw: str, source: str) -> dict[str, Any]:
    """Parse a schema document, requiring a JSON object at the top level."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        msg = f"Schema at '{source}' is not valid JSON: {exc}"
        raise SchemaNotAvailableError(msg) from exc

    if not isinstance(data, dict):
        msg = f"Schema at '{source}' must be a JSON object, got {type(data).__name__}."
        raise SchemaNotAvailableError(msg)
    return data


def load_benchmark_schema() -> dict[str, Any]:
    """Return the published benchmark JSON Schema as a dict.

    Raises:
        SchemaNotAvailableError: If the schema cannot be located or parsed.
    """
    return _load_schema_file(BENCHMARK_SCHEMA_FILENAME)


def jsonschema_available() -> bool:
    """Return True if the optional ``jsonschema`` package can be imported."""
    try:
        import jsonschema  # noqa: F401
    except ImportError:
        return False
    return True


def validate_benchmark_document(document: dict[str, Any]) -> list[str]:
    """Validate one published benchmark record against the schema.

    Returns:
        Human-readable error messages, most structural first.  An empty list
        means the document is valid — or that ``jsonschema`` is not installed,
        in which case the check is skipped and logged.  Callers that must know
        the difference should consult :func:`jsonschema_available` first.
    """
    try:
        from jsonschema import Draft202012Validator
    except ImportError:
        logger.debug("jsonschema is not installed; skipping schema validation.")
        return []

    validator = Draft202012Validator(load_benchmark_schema())
    errors: list[str] = []
    for error in sorted(validator.iter_errors(document), key=lambda e: list(e.path)):
        location = ".".join(str(part) for part in error.absolute_path) or "(root)"
        errors.append(f"{location}: {error.message}")
    return errors


def describe_validation_failures(paths_and_errors: Sequence[tuple[str, list[str]]]) -> str:
    """Format per-file validation errors into a single readable block."""
    lines: list[str] = []
    for path, errors in paths_and_errors:
        lines.append(f"{path}:")
        lines.extend(f"  - {error}" for error in errors)
    return "\n".join(lines)
