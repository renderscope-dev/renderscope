#!/usr/bin/env python3
"""
RenderScope Data Validation Script

Validates all JSON data files against their schemas and performs
cross-reference integrity checks.

Usage:
    python scripts/validate_data.py              # Validate everything
    python scripts/validate_data.py --verbose    # Show detailed output
    python scripts/validate_data.py --check-urls # Also verify URLs are reachable (slow)

Exit codes:
    0 = All validations passed
    1 = One or more validations failed
"""

from __future__ import annotations

import argparse
import io
import json
import sys
from datetime import date
from pathlib import Path
from typing import Any

# Ensure stdout can handle unicode on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )

from jsonschema import Draft202012Validator, ValidationError

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCHEMAS_DIR = PROJECT_ROOT / "schemas"
DATA_DIR = PROJECT_ROOT / "data"

# Use ASCII-safe characters for cross-platform compatibility
_CHECK = "[PASS]"
_CROSS = "[FAIL]"
_WARN = "[WARN]"

SCHEMA_MAP: dict[str, str] = {
    "renderers": "renderer.schema.json",
    "benchmarks": "benchmark.schema.json",
    "scenes": "scene.schema.json",
}

TAXONOMY_SCHEMA = "taxonomy.schema.json"
TAXONOMY_FILE = DATA_DIR / "taxonomy.json"

# ---------------------------------------------------------------------------
# Terminal colours (degrade gracefully when not a TTY)
# ---------------------------------------------------------------------------

_USE_COLOR = sys.stdout.isatty()


def _green(text: str) -> str:
    return f"\033[32m{text}\033[0m" if _USE_COLOR else text


def _red(text: str) -> str:
    return f"\033[31m{text}\033[0m" if _USE_COLOR else text


def _yellow(text: str) -> str:
    return f"\033[33m{text}\033[0m" if _USE_COLOR else text


def _bold(text: str) -> str:
    return f"\033[1m{text}\033[0m" if _USE_COLOR else text


def _dim(text: str) -> str:
    return f"\033[2m{text}\033[0m" if _USE_COLOR else text


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_json(path: Path) -> Any:
    """Load and parse a JSON file, returning the parsed object."""
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def load_schema(name: str) -> dict[str, Any]:
    """Load a JSON Schema file from the schemas directory."""
    schema_path = SCHEMAS_DIR / name
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")
    return load_json(schema_path)


def relative_path(path: Path) -> str:
    """Return a path relative to PROJECT_ROOT for display."""
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------


def validate_file(
    path: Path,
    schema: dict[str, Any],
    verbose: bool = False,
) -> list[str]:
    """Validate a single JSON file against a schema.

    Returns a list of error messages (empty if valid).
    """
    errors: list[str] = []

    try:
        data = load_json(path)
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON: {exc}")
        return errors

    validator = Draft202012Validator(schema)
    for error in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        json_path = ".".join(str(p) for p in error.absolute_path) or "(root)"
        if verbose:
            errors.append(f"  [{json_path}] {error.message}")
        else:
            # Truncate long messages
            msg = error.message
            if len(msg) > 120:
                msg = msg[:117] + "..."
            errors.append(f"  [{json_path}] {msg}")

    return errors


# ---------------------------------------------------------------------------
# Cross-reference checks
# ---------------------------------------------------------------------------


def cross_reference_checks(
    renderer_ids: set[str],
    scene_ids: set[str],
    benchmark_ids: set[str],
    renderer_data: dict[str, Any],
    taxonomy_data: dict[str, Any] | None,
) -> list[str]:
    """Perform cross-referencing integrity checks that JSON Schema cannot express.

    Returns a list of error messages.
    """
    errors: list[str] = []

    # Check renderer `related` references
    for rid, data in renderer_data.items():
        related = data.get("related", [])
        for ref in related:
            if ref not in renderer_ids:
                errors.append(
                    f"data/renderers/{rid}.json: 'related' references "
                    f"unknown renderer '{ref}'"
                )

    # Benchmark cross-references
    benchmark_dir = DATA_DIR / "benchmarks"
    if benchmark_dir.exists():
        for path in sorted(benchmark_dir.glob("*.json")):
            if path.name.startswith("_"):
                continue
            try:
                bdata = load_json(path)
            except (json.JSONDecodeError, OSError):
                continue
            renderer_ref = bdata.get("renderer", "")
            if renderer_ref and renderer_ref not in renderer_ids:
                errors.append(
                    f"data/benchmarks/{path.name}: 'renderer' references "
                    f"unknown renderer '{renderer_ref}'"
                )
            scene_ref = bdata.get("scene", "")
            if scene_ref and scene_ref not in scene_ids:
                errors.append(
                    f"data/benchmarks/{path.name}: 'scene' references "
                    f"unknown scene '{scene_ref}'"
                )

    # Taxonomy cross-references
    if taxonomy_data:
        node_ids: set[str] = set()
        for node in taxonomy_data.get("nodes", []):
            nid = node.get("id", "")
            if nid in node_ids:
                errors.append(f"data/taxonomy.json: duplicate node id '{nid}'")
            node_ids.add(nid)

            # Renderer nodes must reference existing renderer files
            if node.get("type") == "renderer":
                ref = node.get("renderer_id", "")
                if ref and ref not in renderer_ids:
                    errors.append(
                        f"data/taxonomy.json: node '{nid}' references "
                        f"unknown renderer '{ref}'"
                    )

        # Edge references
        for edge in taxonomy_data.get("edges", []):
            src = edge.get("source", "")
            tgt = edge.get("target", "")
            if src and src not in node_ids:
                errors.append(
                    f"data/taxonomy.json: edge source '{src}' is not a known node"
                )
            if tgt and tgt not in node_ids:
                errors.append(
                    f"data/taxonomy.json: edge target '{tgt}' is not a known node"
                )

    return errors


# ---------------------------------------------------------------------------
# Additional validation rules
# ---------------------------------------------------------------------------


def additional_renderer_checks(
    path: Path,
    data: dict[str, Any],
) -> tuple[list[str], list[str]]:
    """Perform additional validation on a renderer file beyond schema checks.

    Returns (errors, warnings).
    """
    errors: list[str] = []
    warnings: list[str] = []

    rid = data.get("id", "")
    expected_id = path.stem

    # Filename must match id
    if rid != expected_id:
        errors.append(
            f"  id '{rid}' does not match filename '{expected_id}.json'"
        )

    # Date sanity: first_release must be in the past
    first_release = data.get("first_release")
    if first_release:
        try:
            fr_date = date.fromisoformat(first_release)
            if fr_date > date.today():
                errors.append(
                    f"  first_release '{first_release}' is in the future"
                )
        except ValueError:
            pass  # Schema handles format validation

    # Date sanity: latest_release >= first_release
    latest_release = data.get("latest_release")
    if latest_release and first_release:
        try:
            lr_date = date.fromisoformat(latest_release)
            fr_date = date.fromisoformat(first_release)
            if lr_date < fr_date:
                errors.append(
                    f"  latest_release '{latest_release}' is before "
                    f"first_release '{first_release}'"
                )
        except ValueError:
            pass

    # Star trend length check
    trend = data.get("github_stars_trend", [])
    if trend and len(trend) != 12:
        warnings.append(
            f"  github_stars_trend has {len(trend)} items (expected 12)"
        )

    # Commit activity length check
    activity = data.get("commit_activity_52w", [])
    if activity and len(activity) != 52:
        warnings.append(
            f"  commit_activity_52w has {len(activity)} items (expected 52)"
        )

    # Feature completeness warning
    features = data.get("features", {})
    filled = sum(1 for v in features.values() if v is not None)
    if filled < 10:
        warnings.append(
            f"  only {filled} feature flags set (non-null) --"
            f"consider filling in more features"
        )

    return errors, warnings


# ---------------------------------------------------------------------------
# URL reachability check (optional)
# ---------------------------------------------------------------------------


def check_urls(data: dict[str, Any], path: Path) -> list[str]:
    """Check that URL fields return 2xx or 3xx status codes.

    Only called with --check-urls flag.
    """
    import urllib.request
    import urllib.error

    url_fields = ["repository", "homepage", "documentation", "paper"]
    errors: list[str] = []

    for field in url_fields:
        url = data.get(field)
        if not url:
            continue
        try:
            req = urllib.request.Request(url, method="HEAD")
            req.add_header("User-Agent", "RenderScope-Validator/1.0")
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status >= 400:
                    errors.append(
                        f"  {field} URL returned {resp.status}: {url}"
                    )
        except urllib.error.HTTPError as exc:
            # Some servers don't like HEAD; try GET
            try:
                req = urllib.request.Request(url, method="GET")
                req.add_header("User-Agent", "RenderScope-Validator/1.0")
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status >= 400:
                        errors.append(
                            f"  {field} URL returned {resp.status}: {url}"
                        )
            except Exception:
                errors.append(f"  {field} URL unreachable ({exc.code}): {url}")
        except Exception as exc:
            errors.append(f"  {field} URL unreachable ({exc}): {url}")

    return errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate RenderScope JSON data files against schemas."
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Show detailed output"
    )
    parser.add_argument(
        "--check-urls",
        action="store_true",
        help="Verify that URL fields are reachable (slow, requires network)",
    )
    args = parser.parse_args()

    total_files = 0
    passed = 0
    failed = 0
    all_warnings: list[str] = []
    all_errors: list[str] = []

    # Collect IDs for cross-referencing
    renderer_ids: set[str] = set()
    scene_ids: set[str] = set()
    benchmark_ids: set[str] = set()
    renderer_data_map: dict[str, Any] = {}

    print(_bold("\nRenderScope Data Validator"))
    print(_dim("=" * 50))

    # ── Validate files per directory ──────────────────────────────────────

    for subdir, schema_name in SCHEMA_MAP.items():
        data_path = DATA_DIR / subdir
        if not data_path.exists():
            if args.verbose:
                print(_dim(f"\n  {subdir}/ directory not found --skipping"))
            continue

        json_files = sorted(
            p for p in data_path.glob("*.json") if not p.name.startswith("_")
        )

        if not json_files:
            if args.verbose:
                print(_dim(f"\n  {subdir}/ --no JSON files found"))
            continue

        schema = load_schema(schema_name)
        print(f"\n{_bold(subdir + '/')}")

        for path in json_files:
            total_files += 1
            rel = relative_path(path)

            # Schema validation
            errors = validate_file(path, schema, verbose=args.verbose)

            # Additional checks for renderers
            extra_errors: list[str] = []
            warnings: list[str] = []
            try:
                data = load_json(path)
            except (json.JSONDecodeError, OSError):
                data = {}

            if subdir == "renderers" and data:
                extra_errors, warnings = additional_renderer_checks(path, data)
                renderer_ids.add(data.get("id", path.stem))
                renderer_data_map[data.get("id", path.stem)] = data

                # Optional URL checks
                if args.check_urls:
                    url_errors = check_urls(data, path)
                    extra_errors.extend(url_errors)

            elif subdir == "scenes" and data:
                scene_ids.add(data.get("id", path.stem))

            elif subdir == "benchmarks" and data:
                bid = data.get("id", path.stem)
                if bid in benchmark_ids:
                    extra_errors.append(f"  duplicate benchmark id '{bid}'")
                benchmark_ids.add(bid)

            combined_errors = errors + extra_errors

            if combined_errors:
                failed += 1
                print(f"  {_red(_CROSS)} {rel}")
                for err in combined_errors:
                    print(f"    {_red(err)}")
                all_errors.extend(
                    f"{rel}: {e.strip()}" for e in combined_errors
                )
            else:
                passed += 1
                print(f"  {_green(_CHECK)} {rel}")

            if warnings:
                for warn in warnings:
                    print(f"    {_yellow(_WARN)} {warn}")
                all_warnings.extend(
                    f"{rel}: {w.strip()}" for w in warnings
                )

    # ── Validate taxonomy.json ────────────────────────────────────────────

    taxonomy_data: dict[str, Any] | None = None
    if TAXONOMY_FILE.exists():
        print(f"\n{_bold('taxonomy')}")
        total_files += 1
        rel = relative_path(TAXONOMY_FILE)

        schema = load_schema(TAXONOMY_SCHEMA)
        errors = validate_file(TAXONOMY_FILE, schema, verbose=args.verbose)

        try:
            taxonomy_data = load_json(TAXONOMY_FILE)
        except (json.JSONDecodeError, OSError):
            taxonomy_data = None

        if errors:
            failed += 1
            print(f"  {_red(_CROSS)} {rel}")
            for err in errors:
                print(f"    {_red(err)}")
            all_errors.extend(f"{rel}: {e.strip()}" for e in errors)
        else:
            passed += 1
            print(f"  {_green(_CHECK)} {rel}")
    elif args.verbose:
        print(_dim("\n  taxonomy.json not found -- skipping"))

    # ── Cross-reference checks ────────────────────────────────────────────

    print(f"\n{_bold('cross-references')}")
    xref_errors = cross_reference_checks(
        renderer_ids=renderer_ids,
        scene_ids=scene_ids,
        benchmark_ids=benchmark_ids,
        renderer_data=renderer_data_map,
        taxonomy_data=taxonomy_data,
    )

    if xref_errors:
        for err in xref_errors:
            print(f"  {_red(_CROSS)} {err}")
            all_errors.append(err)
        failed_xref = len(xref_errors)
    else:
        print(f"  {_green(_CHECK)} All cross-references valid")
        failed_xref = 0

    # ── Duplicate ID checks ───────────────────────────────────────────────

    # (Duplicate IDs within a category are caught by collecting into sets above
    # and checking during file processing. Cross-category duplicates between
    # renderers and scenes are fine since they live in separate namespaces.)

    # ── Summary ───────────────────────────────────────────────────────────

    print(_dim("\n" + "=" * 50))

    if total_files == 0:
        print(_yellow("No data files found to validate."))
        return 0

    total_checks = total_files + (1 if xref_errors or taxonomy_data else 0)
    summary_parts: list[str] = []
    summary_parts.append(f"{total_files} file{'s' if total_files != 1 else ''}")
    summary_parts.append(_green(f"{passed} passed"))

    if failed > 0:
        summary_parts.append(_red(f"{failed} failed"))
    if failed_xref > 0:
        summary_parts.append(_red(f"{failed_xref} cross-ref error{'s' if failed_xref != 1 else ''}"))
    if all_warnings:
        summary_parts.append(_yellow(f"{len(all_warnings)} warning{'s' if len(all_warnings) != 1 else ''}"))

    print(f"\nValidated {', '.join(summary_parts)}")

    if failed > 0 or failed_xref > 0:
        print(_red("\nValidation FAILED"))
        return 1

    print(_green("\nAll validations passed"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
