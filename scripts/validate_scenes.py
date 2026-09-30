#!/usr/bin/env python3
"""
RenderScope Scene Metadata Validator

Validates scene metadata JSON files in /data/scenes/ against the scene schema,
checks that every format the catalog advertises can actually be obtained, and
confirms the Python package's generated manifest.json still matches the catalog.

The manifest check used to compare only the *set of scene ids*, so it printed
"in sync" while the two files disagreed about formats, complexity vocabulary and
camera field names. It now regenerates the manifest and compares it byte for
byte, which is the only comparison that cannot quietly pass.

Usage:
    python scripts/validate_scenes.py                  # Validate all scenes
    python scripts/validate_scenes.py --check-files    # Also verify files on disk
    python scripts/validate_scenes.py --verbose        # Detailed output

Exit codes:
    0 = All validations passed
    1 = One or more validations failed
"""

from __future__ import annotations

import argparse
import difflib
import io
import json
import math
import sys
from pathlib import Path
from typing import Any

# Ensure stdout can handle unicode on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("ERROR: 'jsonschema' package is required. Install with: pip install jsonschema")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCHEMAS_DIR = PROJECT_ROOT / "schemas"
SCENES_DATA_DIR = PROJECT_ROOT / "data" / "scenes"
SCENES_ASSETS_DIR = PROJECT_ROOT / "assets" / "scenes"
MANIFEST_PATH = PROJECT_ROOT / "python" / "src" / "renderscope" / "data" / "scenes" / "manifest.json"

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


PASS = _green("[PASS]")
FAIL = _red("[FAIL]")
WARN = _yellow("[WARN]")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_json(path: Path) -> Any:
    """Load and parse a JSON file."""
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Validation checks
# ---------------------------------------------------------------------------


def validate_schema(scene_path: Path, schema: dict[str, Any], verbose: bool) -> list[str]:
    """Validate a scene JSON file against the scene schema.

    Returns a list of error messages.
    """
    errors: list[str] = []

    try:
        data = load_json(scene_path)
    except json.JSONDecodeError as exc:
        return [f"Invalid JSON: {exc}"]

    validator = Draft202012Validator(schema)
    for error in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        json_path = ".".join(str(p) for p in error.absolute_path) or "(root)"
        msg = error.message
        if not verbose and len(msg) > 120:
            msg = msg[:117] + "..."
        errors.append(f"  [{json_path}] {msg}")

    return errors


def validate_id_consistency(scene_path: Path, data: dict[str, Any]) -> list[str]:
    """Check that the 'id' field matches the filename."""
    errors: list[str] = []
    expected_id = scene_path.stem
    actual_id = data.get("id", "")

    if actual_id != expected_id:
        errors.append(
            f"  ID mismatch: 'id' field is '{actual_id}' "
            f"but filename is '{expected_id}.json'"
        )

    return errors


def validate_camera_sanity(data: dict[str, Any]) -> list[str]:
    """Check that the camera configuration is sane."""
    errors: list[str] = []
    camera = data.get("camera")

    if not camera:
        return errors

    position = camera.get("position")
    look_at = camera.get("look_at")

    if position and look_at:
        # Check that position and look_at are not identical
        if position == look_at:
            errors.append(
                "  Camera 'position' and 'look_at' are identical "
                "(view direction is undefined)"
            )

        # Check for NaN or Infinity values
        for field_name, values in [("position", position), ("look_at", look_at)]:
            for i, v in enumerate(values):
                if math.isnan(v) or math.isinf(v):
                    errors.append(
                        f"  Camera {field_name}[{i}] has invalid value: {v}"
                    )

    up = camera.get("up")
    if up:
        # Check up vector is not zero
        magnitude = math.sqrt(sum(v * v for v in up))
        if magnitude < 1e-10:
            errors.append("  Camera 'up' vector has zero magnitude")

    fov = camera.get("fov")
    if fov is not None:
        if fov <= 0 or fov >= 180:
            errors.append(f"  Camera 'fov' value {fov} is out of valid range (0, 180)")

    return errors


def validate_format_consistency(
    data: dict[str, Any],
    scene_dir: Path,
    check_files: bool,
) -> tuple[list[str], list[str]]:
    """Check that every advertised format is real and obtainable.

    The website renders ``available_formats`` under a heading that reads
    "Available Formats". Every entry there is a promise, so each one must name a
    source, and each source must carry enough detail to fetch and verify.

    Returns (errors, warnings).
    """
    errors: list[str] = []
    warnings: list[str] = []

    available_formats = data.get("available_formats", [])
    sources: dict[str, Any] = data.get("sources", {}) or {}

    # `available_formats` is the public list and `sources` is the operative one;
    # they describe the same fact, so a mismatch is always a bug.
    if sorted(available_formats) != sorted(sources):
        errors.append(
            f"  'available_formats' {sorted(available_formats)} does not match "
            f"'sources' keys {sorted(sources)}"
        )

    if len(available_formats) != len(set(available_formats)):
        errors.append("  'available_formats' contains duplicates")

    for fmt in sorted(sources):
        source = sources[fmt]
        path = source.get("path", "")
        if not path:
            errors.append(f"  source '{fmt}' has no 'path'")
        elif path.startswith("/") or ".." in Path(path).parts:
            errors.append(f"  source '{fmt}' path '{path}' escapes the scene directory")

        url = source.get("url")
        if not url:
            # Nothing to fetch from is allowed, but then the scene's own
            # source_url has to tell a contributor where to look.
            if not str(data.get("source_url", "")).startswith("http"):
                errors.append(
                    f"  source '{fmt}' has no 'url' and the scene has no "
                    f"'source_url' to fall back on"
                )
            continue

        sha = source.get("sha256", "")
        if not sha:
            errors.append(f"  source '{fmt}' declares a url but no 'sha256'")
        elif len(sha) != 64 or any(c not in "0123456789abcdef" for c in sha):
            errors.append(f"  source '{fmt}' sha256 is not a lowercase hex digest")

        if float(source.get("size_mb", 0) or 0) <= 0:
            errors.append(
                f"  source '{fmt}' declares a url but no 'size_mb'; the CLI "
                f"prints a download plan before spending anyone's bandwidth"
            )

        # A loose file has no internal structure to infer a name from, so the
        # catalog has to say what to save it as — and that has to be where
        # 'path' points, or the download lands somewhere nothing reads.
        if not _is_archive_url(url):
            filename = source.get("filename")
            if not filename:
                errors.append(
                    f"  source '{fmt}' points at a non-archive ({url}); it needs "
                    f"'filename' so the download lands where 'path' expects"
                )
            elif filename != path:
                errors.append(
                    f"  source '{fmt}' saves as '{filename}' but 'path' points "
                    f"at '{path}'"
                )

    # Optionally check files on disk
    if check_files and scene_dir.exists():
        for fmt in sorted(sources):
            expected = Path(sources[fmt].get("path", "")).name
            if not expected:
                continue
            format_dir = scene_dir / fmt
            found = (format_dir / sources[fmt]["path"]).exists() or bool(
                list(scene_dir.rglob(expected))
            )
            if not found:
                warnings.append(
                    f"  Format '{fmt}' is declared but '{expected}' was not "
                    f"found under {scene_dir}"
                )

    return errors, warnings


_ARCHIVE_SUFFIXES = (".zip", ".tar.gz", ".tgz", ".tar", ".tar.bz2", ".tar.xz")


def _is_archive_url(url: str) -> bool:
    """Whether a URL points at an archive rather than a single loose file."""
    name = url.split("?", 1)[0].rsplit("/", 1)[-1].lower()
    return name.endswith(_ARCHIVE_SUFFIXES)


def _format_to_extensions(fmt: str) -> list[str]:
    """Map format identifiers to file extensions."""
    mapping: dict[str, list[str]] = {
        "obj": ["obj"],
        "gltf": ["gltf", "glb"],
        "glb": ["glb"],
        "pbrt": ["pbrt"],
        "mitsuba_xml": ["xml"],
        "ply": ["ply"],
        "blend": ["blend"],
        "fbx": ["fbx"],
        "usd": ["usd", "usda", "usdc", "usdz"],
    }
    return mapping.get(fmt, [fmt])


def validate_manifest_sync(
    scene_ids: set[str],
    verbose: bool,
) -> tuple[list[str], list[str]]:
    """Check the generated CLI manifest still matches the scene catalog.

    ``manifest.json`` is derived from ``data/scenes/*.json``, so the honest test
    is to regenerate it and compare the result with what is committed. Comparing
    scene ids — which is all this used to do — passes even when the two files
    disagree about every other field, and it did.

    Returns (errors, warnings).
    """
    errors: list[str] = []
    warnings: list[str] = []

    if not MANIFEST_PATH.exists():
        errors.append(
            f"  Manifest not found: {MANIFEST_PATH.relative_to(PROJECT_ROOT)}. "
            f"Run: python scripts/generate_scene_manifest.py"
        )
        return errors, warnings

    sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
    try:
        from generate_scene_manifest import (  # noqa: PLC0415
            CatalogError,
            build_manifest,
            load_catalog,
            render_manifest,
        )
    except ImportError as exc:  # pragma: no cover - a missing sibling script
        errors.append(f"  Could not import the manifest generator: {exc}")
        return errors, warnings

    try:
        expected = render_manifest(build_manifest(load_catalog()))
    except (CatalogError, KeyError) as exc:
        errors.append(f"  The catalog cannot be turned into a manifest: {exc}")
        return errors, warnings

    actual = MANIFEST_PATH.read_text(encoding="utf-8")
    if actual == expected:
        if verbose:
            warnings.append(
                f"  {MANIFEST_PATH.relative_to(PROJECT_ROOT)} matches the catalog "
                f"exactly ({len(scene_ids)} scenes)"
            )
        return errors, warnings

    diff = list(
        difflib.unified_diff(
            actual.splitlines(),
            expected.splitlines(),
            fromfile=str(MANIFEST_PATH.relative_to(PROJECT_ROOT)),
            tofile="generated from data/scenes/",
            lineterm="",
            n=1,
        )
    )
    errors.append(
        f"  {MANIFEST_PATH.relative_to(PROJECT_ROOT)} does not match "
        f"data/scenes/. Run: python scripts/generate_scene_manifest.py"
    )
    # Enough of the diff to see what drifted, without burying the summary.
    for line in diff[:40]:
        errors.append(f"    {line}")
    if len(diff) > 40:
        errors.append(f"    ... {len(diff) - 40} more diff lines")
    return errors, warnings


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate RenderScope scene metadata files.",
    )
    parser.add_argument(
        "--check-files",
        action="store_true",
        help="Also verify that scene files exist on disk for listed formats.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed output.",
    )

    args = parser.parse_args()

    print(_bold("\nRenderScope Scene Validator"))
    print(_dim("=" * 50))

    # Load schema
    schema_path = SCHEMAS_DIR / "scene.schema.json"
    if not schema_path.exists():
        print(f"\n{FAIL} Scene schema not found: {schema_path}")
        return 1

    schema = load_json(schema_path)

    # Find scene JSON files
    if not SCENES_DATA_DIR.exists():
        print(f"\n{FAIL} Scenes directory not found: {SCENES_DATA_DIR}")
        return 1

    scene_files = sorted(
        p for p in SCENES_DATA_DIR.glob("*.json")
        if not p.name.startswith("_") and p.name != ".gitkeep"
    )

    if not scene_files:
        print(f"\n{WARN} No scene JSON files found in {SCENES_DATA_DIR}")
        return 0

    total = 0
    passed = 0
    failed = 0
    all_warnings: list[str] = []
    scene_ids: set[str] = set()

    print(f"\n{_bold('Scene Metadata Files')}")

    for scene_path in scene_files:
        total += 1
        rel = scene_path.relative_to(PROJECT_ROOT)
        errors: list[str] = []
        warnings: list[str] = []

        # 1. Schema validation
        schema_errors = validate_schema(scene_path, schema, args.verbose)
        errors.extend(schema_errors)

        # Load data for further checks
        try:
            data = load_json(scene_path)
        except (json.JSONDecodeError, OSError):
            data = {}

        if data:
            scene_ids.add(data.get("id", scene_path.stem))

            # 2. ID consistency
            errors.extend(validate_id_consistency(scene_path, data))

            # 3. Camera sanity
            errors.extend(validate_camera_sanity(data))

            # 4. Format consistency
            scene_dir = SCENES_ASSETS_DIR / data.get("id", scene_path.stem)
            fmt_errors, fmt_warnings = validate_format_consistency(
                data, scene_dir, args.check_files,
            )
            errors.extend(fmt_errors)
            warnings.extend(fmt_warnings)

        if errors:
            failed += 1
            print(f"  {FAIL} {rel}")
            for err in errors:
                print(f"    {_red(err)}")
        else:
            passed += 1
            print(f"  {PASS} {rel}")

        if warnings:
            for w in warnings:
                print(f"    {WARN} {w}")
            all_warnings.extend(warnings)

    # 5. Manifest sync check
    print(f"\n{_bold('Manifest Sync')}")
    manifest_errors, manifest_warnings = validate_manifest_sync(
        scene_ids, args.verbose,
    )

    if manifest_errors:
        for err in manifest_errors:
            print(f"  {FAIL} {err}")
        # One drift, not one per diff line.
        failed += 1
    elif manifest_warnings:
        for w in manifest_warnings:
            print(f"  {WARN} {w}")
        all_warnings.extend(manifest_warnings)
    else:
        print(f"  {PASS} Manifest is in sync with scene data")

    # Summary
    print(_dim("\n" + "=" * 50))
    summary_parts = [
        f"{total} file{'s' if total != 1 else ''}",
        _green(f"{passed} passed"),
    ]
    if failed:
        summary_parts.append(_red(f"{failed} failed"))
    if all_warnings:
        summary_parts.append(_yellow(f"{len(all_warnings)} warning{'s' if len(all_warnings) != 1 else ''}"))

    print(f"\nValidated {', '.join(summary_parts)}")

    if failed > 0:
        print(_red("\nValidation FAILED"))
        return 1

    print(_green("\nAll validations passed"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
