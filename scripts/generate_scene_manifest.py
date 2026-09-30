#!/usr/bin/env python3
"""Generate the Python package's scene manifest from the scene catalog.

RenderScope described its benchmark scenes twice: ``data/scenes/*.json`` fed the
website while ``python/src/renderscope/data/scenes/manifest.json`` fed the CLI.
Nothing compared them, and they drifted — different complexity vocabularies,
different camera field names, and format lists that disagreed with each other
and with what a download actually produced.

``data/scenes/*.json`` is now the single authored source. This script derives
the manifest from it so the CLI and the website cannot describe a scene
differently. The manifest is committed because the wheel ships it and a build
must not depend on the monorepo being present; CI runs ``--check`` so an edit to
one without the other fails rather than silently diverging.

Usage:
    python scripts/generate_scene_manifest.py            # Write the manifest
    python scripts/generate_scene_manifest.py --check    # Fail if it is stale

Exit codes:
    0 = Manifest written, or already up to date under --check
    1 = Manifest is stale (--check), or the catalog is inconsistent
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCENES_DATA_DIR = PROJECT_ROOT / "data" / "scenes"
MANIFEST_PATH = (
    PROJECT_ROOT / "python" / "src" / "renderscope" / "data" / "scenes" / "manifest.json"
)

MANIFEST_VERSION = "1.0.0"
MANIFEST_DESCRIPTION = (
    "RenderScope standard benchmark scene manifest. Generated from data/scenes/*.json "
    "by scripts/generate_scene_manifest.py — edit the catalog, not this file."
)

# Scenes are listed cheapest-first so `renderscope download-scenes --list` reads
# as an order someone might actually work through.
_COMPLEXITY_RANK = {"trivial": 0, "low": 1, "medium": 2, "high": 3, "extreme": 4}

# Order of keys within a generated source entry, so regeneration is stable.
_SOURCE_KEYS = ("url", "archive", "sha256", "size_mb", "filename", "path", "note")


class CatalogError(Exception):
    """Raised when the scene catalog cannot be turned into a manifest."""


def load_catalog() -> list[dict[str, Any]]:
    """Read every scene file in ``data/scenes/``, sorted by filename."""
    scenes: list[dict[str, Any]] = []
    for path in sorted(SCENES_DATA_DIR.glob("*.json")):
        try:
            scenes.append(json.loads(path.read_text(encoding="utf-8")))
        except json.JSONDecodeError as exc:
            raise CatalogError(f"{path.name}: invalid JSON — {exc}") from exc
    if not scenes:
        raise CatalogError(f"No scene files found in {SCENES_DATA_DIR}")
    return scenes


def _scene_entry(scene: dict[str, Any]) -> dict[str, Any]:
    """Convert one catalog scene into its manifest entry."""
    scene_id = scene.get("id")
    if not scene_id:
        raise CatalogError("A scene file has no 'id'.")

    sources = scene.get("sources")
    if not isinstance(sources, dict) or not sources:
        raise CatalogError(f"{scene_id}: 'sources' is missing or empty.")

    declared = scene.get("available_formats")
    if sorted(declared or []) != sorted(sources):
        raise CatalogError(
            f"{scene_id}: 'available_formats' {sorted(declared or [])} does not match "
            f"'sources' keys {sorted(sources)}."
        )

    camera = scene.get("camera") or {}
    if not camera:
        raise CatalogError(f"{scene_id}: no camera — benchmarks need a fixed viewpoint.")
    for field in ("position", "look_at", "fov"):
        if field not in camera:
            raise CatalogError(f"{scene_id}: camera is missing '{field}'.")

    formats: dict[str, Any] = {}
    for fmt in sorted(sources):
        source = sources[fmt]
        if "path" not in source:
            raise CatalogError(f"{scene_id}/{fmt}: source has no 'path'.")
        formats[fmt] = {key: source[key] for key in _SOURCE_KEYS if key in source}

    entry: dict[str, Any] = {
        "id": scene_id,
        "name": scene["name"],
        "description": scene["description"],
        "source": scene["source"],
        "source_url": scene.get("source_url", ""),
        # The catalog counts vertices and faces separately; the CLI only ever
        # reports the triangle count, which is what 'faces' holds.
        "polygon_count": int(scene.get("faces", 0)),
        "tests": list(scene.get("tests", [])),
        "complexity": scene["complexity"],
        "formats": formats,
    }

    reference = scene.get("reference")
    if reference:
        # Catalog paths are scene-relative; the manifest's are relative to the
        # scenes directory, which is what SceneManager resolves against.
        ref = {
            "renderer": reference["renderer"],
            "samples": int(reference["samples"]),
            "image": f"{scene_id}/{reference['image']}",
        }
        for optional in ("url", "sha256"):
            if reference.get(optional):
                ref[optional] = reference[optional]
        entry["reference"] = ref

    entry["camera"] = {
        "position": list(camera["position"]),
        # The catalog says 'look_at'; the renderer adapters say 'target'. Same
        # point, and this is the one place the two names have to meet.
        "target": list(camera["look_at"]),
        "up": list(camera.get("up", [0, 1, 0])),
        "fov": camera["fov"],
    }
    entry["download_size_mb"] = round(
        sum(float(src.get("size_mb", 0.0)) for src in sources.values()), 2
    )
    return entry


def build_manifest(scenes: list[dict[str, Any]]) -> dict[str, Any]:
    """Build the full manifest document from catalog scenes."""
    entries = [_scene_entry(scene) for scene in scenes]
    entries.sort(key=lambda e: (_COMPLEXITY_RANK.get(e["complexity"], 99), e["id"]))
    return {
        "version": MANIFEST_VERSION,
        "description": MANIFEST_DESCRIPTION,
        "scenes": entries,
    }


def render_manifest(manifest: dict[str, Any]) -> str:
    """Serialize the manifest exactly as it is written to disk."""
    return json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate the CLI scene manifest from data/scenes/*.json.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if the committed manifest differs from the catalog.",
    )
    args = parser.parse_args()

    try:
        manifest = build_manifest(load_catalog())
    except (CatalogError, KeyError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    generated = render_manifest(manifest)
    relative = MANIFEST_PATH.relative_to(PROJECT_ROOT)

    if args.check:
        current = MANIFEST_PATH.read_text(encoding="utf-8") if MANIFEST_PATH.is_file() else ""
        if current == generated:
            print(f"{relative} is up to date ({len(manifest['scenes'])} scenes).")
            return 0
        print(
            f"ERROR: {relative} does not match data/scenes/.\n"
            "       Run: python scripts/generate_scene_manifest.py",
            file=sys.stderr,
        )
        return 1

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(generated, encoding="utf-8")
    print(f"Wrote {relative} ({len(manifest['scenes'])} scenes).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
