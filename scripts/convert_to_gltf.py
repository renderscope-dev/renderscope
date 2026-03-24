#!/usr/bin/env python3
"""Convert scene files to glTF using Blender's headless mode.

Converts OBJ and Blend scenes to glTF 2.0 (.glb) so that Filament and OSPRay
can render them. Blender is invoked as a subprocess in headless mode.

Usage:
    source .venv/bin/activate
    python scripts/convert_to_gltf.py
    python scripts/convert_to_gltf.py --scene cornell-box sponza
    python scripts/convert_to_gltf.py --skip-existing
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent
_SCENES_DIR = _REPO_ROOT / "assets" / "scenes"

# Scene ID -> source file (relative to _SCENES_DIR)
SCENE_SOURCES: dict[str, str] = {
    "cornell-box": "cornell-box/CornellBox-Original.obj",
    "sponza": "sponza/sponza.obj",
    "stanford-bunny": "stanford-bunny/stanford-bunny.obj",
    "classroom": "classroom/classroom/classroom.blend",
    "bmw": "bmw/BMW27.blend",
    "san-miguel": "san-miguel/san-miguel-low-poly.obj",  # Use low-poly for glTF
}


def find_blender() -> str | None:
    """Find the Blender binary."""
    path = shutil.which("blender")
    if path:
        return path
    # macOS app bundle
    mac_path = "/Applications/Blender.app/Contents/MacOS/Blender"
    if Path(mac_path).is_file():
        return mac_path
    return None


def convert_scene(blender: str, scene_id: str, source: Path, output: Path) -> bool:
    """Convert a single scene to glTF using Blender."""
    ext = source.suffix.lower()
    is_blend = ext == ".blend"

    # Build inline Python script for Blender
    script = textwrap.dedent(f"""\
        import bpy
        import sys
        import os

        SCENE_PATH = {str(source)!r}
        OUTPUT_PATH = {str(output)!r}
        IS_BLEND = {is_blend!r}

        if IS_BLEND:
            bpy.ops.wm.open_mainfile(filepath=SCENE_PATH)
        else:
            bpy.ops.wm.read_homefile(use_empty=True)
            ext = os.path.splitext(SCENE_PATH)[1].lower()
            if ext == '.obj':
                bpy.ops.wm.obj_import(filepath=SCENE_PATH)
            elif ext == '.ply':
                bpy.ops.wm.ply_import(filepath=SCENE_PATH)
            else:
                print(f"Unsupported: {{ext}}", file=sys.stderr)
                sys.exit(1)

        # Export as GLB (binary glTF)
        bpy.ops.export_scene.gltf(
            filepath=OUTPUT_PATH,
            export_format='GLB',
            export_apply=True,
            export_texcoords=True,
            export_normals=True,
            export_materials='EXPORT',
            export_cameras=True,
            export_lights=True,
        )
        print(f"Exported: {{OUTPUT_PATH}}")
    """)

    print(f"  Converting {scene_id} ({source.name} -> {output.name})...")

    result = subprocess.run(
        [blender, "--background", "--python-expr", script],
        capture_output=True,
        text=True,
        timeout=600,
    )

    if result.returncode != 0:
        print(f"  FAILED: {result.stderr[-500:]}")
        return False

    if output.is_file():
        size_mb = output.stat().st_size / (1024 * 1024)
        print(f"  OK: {output.name} ({size_mb:.1f} MB)")
        return True
    else:
        print(f"  FAILED: Output file not created")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert scenes to glTF using Blender")
    parser.add_argument("--scene", nargs="*", help="Only convert these scenes")
    parser.add_argument("--skip-existing", action="store_true", help="Skip if .glb already exists")
    args = parser.parse_args()

    blender = find_blender()
    if not blender:
        print("ERROR: Blender not found. Install from https://www.blender.org/download/")
        sys.exit(1)
    print(f"Using Blender: {blender}")

    scenes = args.scene or list(SCENE_SOURCES.keys())
    succeeded = 0
    failed = 0

    for scene_id in scenes:
        if scene_id not in SCENE_SOURCES:
            print(f"  Skipping {scene_id}: no source file configured")
            continue

        source = _SCENES_DIR / SCENE_SOURCES[scene_id]
        if not source.is_file():
            print(f"  Skipping {scene_id}: source not found ({source})")
            continue

        output = _SCENES_DIR / scene_id / f"{scene_id}.glb"

        if args.skip_existing and output.is_file():
            print(f"  Skipping {scene_id}: {output.name} already exists")
            continue

        ok = convert_scene(blender, scene_id, source, output)
        if ok:
            succeeded += 1
        else:
            failed += 1

    print(f"\nDone: {succeeded} converted, {failed} failed")


if __name__ == "__main__":
    main()
