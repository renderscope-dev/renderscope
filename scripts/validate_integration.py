#!/usr/bin/env python3
"""
Validate the data integration pipeline for RenderScope.

Cross-references benchmark data, scene JSON files, renderer JSON files,
and rendered images to verify consistency. Reports any mismatches, missing
files, or broken references.

Usage:
  python scripts/validate_integration.py
"""

import json
import sys
import glob
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARKS_DIR = ROOT / "data" / "benchmarks"
SCENES_DIR = ROOT / "data" / "scenes"
RENDERERS_DIR = ROOT / "data" / "renderers"
ASSETS_RENDERS = ROOT / "assets" / "renders"
WEB_RENDERS = ROOT / "web" / "public" / "renders"

PASS = "\033[92mOK\033[0m"
FAIL = "\033[91mFAIL\033[0m"
WARN = "\033[93mWARN\033[0m"


class ValidationResult:
    def __init__(self) -> None:
        self.passed: list[str] = []
        self.warnings: list[str] = []
        self.errors: list[str] = []

    def ok(self, msg: str) -> None:
        self.passed.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    @property
    def success(self) -> bool:
        return len(self.errors) == 0


def load_json_files(directory: Path) -> list[dict]:
    """Load all JSON files from a directory."""
    results = []
    for filepath in sorted(glob.glob(str(directory / "*.json"))):
        if "_mock_archive" in filepath:
            continue
        try:
            with open(filepath) as f:
                results.append(json.load(f))
        except (json.JSONDecodeError, OSError) as e:
            print(f"  {FAIL} Failed to parse {filepath}: {e}")
    return results


def check_image_exists(relative_path: str) -> bool:
    """Check if an image exists in assets or web/public."""
    clean = relative_path.lstrip("/")
    return (
        (ROOT / "assets" / clean).exists()
        or (ROOT / "web" / "public" / clean).exists()
    )


def validate_benchmarks(result: ValidationResult) -> dict[str, list[dict]]:
    """Validate benchmark JSON files and return grouped by scene."""
    print("\n--Benchmark Data --")

    benchmarks = load_json_files(BENCHMARKS_DIR)
    if not benchmarks:
        result.error("No benchmark files found")
        return {}

    result.ok(f"Found {len(benchmarks)} benchmark entries")

    scene_benchmarks: dict[str, list[dict]] = {}
    required_fields = ["id", "renderer", "scene", "hardware", "settings", "results"]

    for b in benchmarks:
        # Check required fields
        missing = [f for f in required_fields if f not in b]
        if missing:
            result.error(f"Benchmark {b.get('id', '?')} missing fields: {missing}")
            continue

        # Check results sub-fields
        results = b["results"]
        if "render_time_seconds" not in results:
            result.error(f"Benchmark {b['id']} missing results.render_time_seconds")
        if "peak_memory_mb" not in results:
            result.warn(f"Benchmark {b['id']} missing results.peak_memory_mb")

        # Check convergence data
        if "convergence" not in b or not b["convergence"]:
            result.warn(f"Benchmark {b['id']} has no convergence data")

        scene_id = b["scene"]
        if scene_id not in scene_benchmarks:
            scene_benchmarks[scene_id] = []
        scene_benchmarks[scene_id].append(b)

    scenes_with_data = len(scene_benchmarks)
    renderers_seen = {b["renderer"] for b in benchmarks}
    result.ok(f"Covers {scenes_with_data} scenes, {len(renderers_seen)} renderers")

    return scene_benchmarks


def validate_scenes(result: ValidationResult, scene_benchmarks: dict[str, list[dict]]) -> None:
    """Validate scene JSON files and cross-reference with benchmarks."""
    print("\n--Scene Data --")

    scenes = load_json_files(SCENES_DIR)
    if not scenes:
        result.error("No scene files found")
        return

    result.ok(f"Found {len(scenes)} scene files")

    for scene in scenes:
        scene_id = scene["id"]
        has_benchmarks = scene_id in scene_benchmarks

        # Check renders array
        renders = scene.get("renders", [])
        if has_benchmarks and not renders:
            result.error(f"Scene '{scene_id}' has benchmark data but empty renders array")
        elif has_benchmarks:
            expected_renderers = {b["renderer"] for b in scene_benchmarks[scene_id]}
            actual_renderers = {r["renderer_id"] for r in renders}
            missing = expected_renderers - actual_renderers
            if missing:
                result.warn(f"Scene '{scene_id}' missing renders for: {missing}")
            result.ok(f"Scene '{scene_id}': {len(renders)} renders (expected {len(expected_renderers)})")

        # Check thumbnail
        thumbnail = scene.get("thumbnail")
        if has_benchmarks and not thumbnail:
            result.warn(f"Scene '{scene_id}' has benchmark data but no thumbnail")
        elif thumbnail and not check_image_exists(thumbnail):
            result.error(f"Scene '{scene_id}' thumbnail missing: {thumbnail}")

        # Check render images
        for r in renders:
            renderer_id = r["renderer_id"]
            for field in ["image_web", "image_thumb"]:
                path = r.get(field)
                if path and not check_image_exists(path):
                    result.warn(f"Scene '{scene_id}', renderer '{renderer_id}': {field} missing at {path}")

        # Check resolution
        if has_benchmarks and "resolution" not in scene:
            result.warn(f"Scene '{scene_id}' missing resolution field")


def validate_renderers(result: ValidationResult) -> None:
    """Validate renderer JSON files."""
    print("\n--Renderer Data --")

    renderers = load_json_files(RENDERERS_DIR)
    if not renderers:
        result.error("No renderer files found")
        return

    result.ok(f"Found {len(renderers)} renderer files")

    required_fields = ["id", "name", "technique"]
    for r in renderers:
        renderer_id = r.get("id", "?")
        missing = [f for f in required_fields if f not in r]
        if missing:
            result.error(f"Renderer '{renderer_id}' missing fields: {missing}")


def validate_images(result: ValidationResult) -> None:
    """Validate rendered image files."""
    print("\n--Rendered Images --")

    # Check assets/renders
    if ASSETS_RENDERS.exists():
        asset_images = list(ASSETS_RENDERS.rglob("*.webp"))
        result.ok(f"assets/renders/: {len(asset_images)} WebP images")
    else:
        result.warn("assets/renders/ directory not found")

    # Check web/public/renders
    if WEB_RENDERS.exists():
        web_images = list(WEB_RENDERS.rglob("*.webp"))
        result.ok(f"web/public/renders/: {len(web_images)} WebP images")
    else:
        result.warn("web/public/renders/ directory not found (run copy_renders_to_web.sh)")

    # Cross-check: every file in assets should be in web/public
    if ASSETS_RENDERS.exists() and WEB_RENDERS.exists():
        for asset_img in ASSETS_RENDERS.rglob("*.webp"):
            relative = asset_img.relative_to(ASSETS_RENDERS)
            web_counterpart = WEB_RENDERS / relative
            if not web_counterpart.exists():
                result.warn(f"Image not copied to web: {relative}")


def validate_web_references(result: ValidationResult) -> None:
    """Check that web components can resolve their data sources."""
    print("\n--Web Data Availability --")

    # Check key data loading files exist
    key_files = [
        "web/src/lib/scenes.ts",
        "web/src/lib/benchmark-data.ts",
        "web/src/lib/data.ts",
        "web/src/components/renderer/benchmark-summary.tsx",
        "web/src/components/renderer/profile-layout.tsx",
        "web/src/components/landing/hero-image-grid.tsx",
        "web/src/components/landing/featured-comparison.tsx",
    ]
    for rel_path in key_files:
        full_path = ROOT / rel_path
        if full_path.exists():
            result.ok(f"Found {rel_path}")
        else:
            result.error(f"Missing {rel_path}")


def main() -> None:
    print("=" * 60)
    print("  RenderScope — Integration Validation")
    print("=" * 60)

    result = ValidationResult()

    scene_benchmarks = validate_benchmarks(result)
    validate_scenes(result, scene_benchmarks)
    validate_renderers(result)
    validate_images(result)
    validate_web_references(result)

    # Summary
    print("\n" + "=" * 60)
    print("  Summary")
    print("=" * 60)

    for msg in result.passed:
        print(f"  {PASS} {msg}")
    for msg in result.warnings:
        print(f"  {WARN} {msg}")
    for msg in result.errors:
        print(f"  {FAIL} {msg}")

    total = len(result.passed) + len(result.warnings) + len(result.errors)
    print(f"\n  {len(result.passed)}/{total} passed, {len(result.warnings)} warnings, {len(result.errors)} errors")

    if result.success:
        print("\n  Integration validation PASSED.")
    else:
        print("\n  Integration validation FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
