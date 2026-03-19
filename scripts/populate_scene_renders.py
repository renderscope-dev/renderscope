#!/usr/bin/env python3
"""
Populate scene JSON files with render data from benchmark results.

Reads all benchmark JSON files in /data/benchmarks/, groups by scene,
and updates each scene JSON with:
  - thumbnail path (if image exists)
  - renders array (one entry per renderer that was benchmarked on this scene)

Only updates render-related fields — does not touch scene metadata
(description, vertices, camera, etc.).

Usage:
  python scripts/populate_scene_renders.py
"""

import json
import os
import glob
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARKS_DIR = ROOT / "data" / "benchmarks"
SCENES_DIR = ROOT / "data" / "scenes"
RENDERS_DIR = ROOT / "assets" / "renders"
WEB_RENDERS_DIR = ROOT / "web" / "public" / "renders"


def image_exists(relative_path: str) -> bool:
    """Check if an image file exists in either assets or web/public."""
    clean = relative_path.lstrip("/")
    return (
        (ROOT / "assets" / clean).exists()
        or (ROOT / "web" / "public" / clean).exists()
    )


def main() -> None:
    print("=" * 60)
    print("  RenderScope — Populate Scene Renders from Benchmark Data")
    print("=" * 60)

    # 1. Load all benchmark results
    benchmark_files = sorted(glob.glob(str(BENCHMARKS_DIR / "*.json")))
    benchmarks = []
    for filepath in benchmark_files:
        # Skip archive directories
        if "_mock_archive" in filepath:
            continue
        try:
            with open(filepath) as f:
                benchmarks.append(json.load(f))
        except (json.JSONDecodeError, OSError) as e:
            print(f"  WARNING: Failed to parse {filepath}: {e}")

    if not benchmarks:
        print("ERROR: No benchmark files found. Nothing to populate.")
        raise SystemExit(1)

    print(f"  Loaded {len(benchmarks)} benchmark entries")

    # 2. Group benchmarks by scene
    scene_benchmarks: dict[str, list[dict]] = {}
    for b in benchmarks:
        scene_id = b["scene"]
        if scene_id not in scene_benchmarks:
            scene_benchmarks[scene_id] = []
        scene_benchmarks[scene_id].append(b)

    # 3. Update each scene JSON
    updated_count = 0
    for scene_id, scene_results in sorted(scene_benchmarks.items()):
        # Try both hyphenated and original ID for the scene file
        scene_file = SCENES_DIR / f"{scene_id}.json"
        if not scene_file.exists():
            # Try converting underscores to hyphens
            alt_id = scene_id.replace("_", "-")
            scene_file = SCENES_DIR / f"{alt_id}.json"
            if not scene_file.exists():
                print(f"  WARNING: No scene file for '{scene_id}', skipping")
                continue

        with open(scene_file) as f:
            scene_data = json.load(f)

        scene_slug = scene_data["id"]

        # Set thumbnail
        thumb_web_path = f"/renders/{scene_slug}/thumbnail.webp"
        if image_exists(thumb_web_path):
            scene_data["thumbnail"] = thumb_web_path
        else:
            scene_data["thumbnail"] = None

        # Set resolution (standard benchmark resolution)
        if "resolution" not in scene_data:
            scene_data["resolution"] = [1920, 1080]

        # Build renders array
        renders = []
        seen_renderers = set()
        for result in scene_results:
            renderer_id = result["renderer"]
            # Deduplicate: take the first (most recent by file sort) entry per renderer
            if renderer_id in seen_renderers:
                continue
            seen_renderers.add(renderer_id)

            thumb_path = f"/renders/{scene_slug}/{renderer_id}_400x225.webp"
            web_path = f"/renders/{scene_slug}/{renderer_id}_1920x1080.webp"

            # Only include if at least one image exists
            thumb_ok = image_exists(thumb_path)
            web_ok = image_exists(web_path)

            render_entry: dict = {
                "renderer_id": renderer_id,
                "image_web": web_path if web_ok else None,
                "image_thumb": thumb_path if thumb_ok else None,
                "render_time_seconds": result["results"]["render_time_seconds"],
                "samples_per_pixel": result["settings"].get("samples_per_pixel"),
                "integrator": result["settings"].get("integrator"),
            }
            renders.append(render_entry)

        # Sort renders by renderer name for consistent ordering
        renders.sort(key=lambda r: r["renderer_id"])
        scene_data["renders"] = renders

        # Write back
        with open(scene_file, "w", encoding="utf-8") as f:
            json.dump(scene_data, f, indent=2, ensure_ascii=False)
            f.write("\n")

        updated_count += 1
        thumb_status = "Y" if scene_data.get("thumbnail") else "N"
        print(f"  [{thumb_status}] {scene_file.name}: {len(renders)} renders")

    # Summary
    print(f"\nDone. Updated {updated_count} scene files.")
    scenes_without = len(scene_benchmarks) - updated_count
    if scenes_without > 0:
        print(f"  ({scenes_without} scenes had no matching JSON file)")


if __name__ == "__main__":
    main()
