#!/usr/bin/env python3
"""
RenderScope Blender Export Script

This script is designed to run INSIDE Blender's Python environment, invoked via:
    blender --background --python scripts/blender_export.py -- <args>

It opens a .blend or .obj file and exports to the requested format (glTF, OBJ)
with sensible defaults for benchmark scene preparation.

Usage (via Blender):
    blender --background --python scripts/blender_export.py -- \\
        --input scene.blend --format gltf --output scene.gltf

    blender --background --python scripts/blender_export.py -- \\
        --input scene.obj --format gltf --output scene.gltf

Supported export formats:
    gltf  - glTF 2.0 (.gltf with separate .bin and textures)
    glb   - glTF 2.0 binary (.glb, single file)
    obj   - Wavefront OBJ (.obj + .mtl)

Notes:
    - This script must be run with Blender's Python, not system Python.
    - Blender 3.6+ is required for the current export API.
    - The script cleans up the scene before export (applies modifiers, etc.)
"""

from __future__ import annotations

import sys
from pathlib import Path


def parse_args() -> dict[str, str]:
    """Parse command-line arguments passed after '--' in the Blender invocation."""
    argv = sys.argv
    # Everything after '--' is our arguments
    if "--" not in argv:
        print("ERROR: No arguments provided after '--'.")
        print("Usage: blender --background --python blender_export.py -- --input FILE --format FMT --output FILE")
        sys.exit(1)

    our_args = argv[argv.index("--") + 1:]
    args: dict[str, str] = {}
    i = 0
    while i < len(our_args):
        if our_args[i] == "--input" and i + 1 < len(our_args):
            args["input"] = our_args[i + 1]
            i += 2
        elif our_args[i] == "--format" and i + 1 < len(our_args):
            args["format"] = our_args[i + 1]
            i += 2
        elif our_args[i] == "--output" and i + 1 < len(our_args):
            args["output"] = our_args[i + 1]
            i += 2
        else:
            print(f"WARNING: Unknown argument: {our_args[i]}")
            i += 1

    required = {"input", "format", "output"}
    missing = required - set(args.keys())
    if missing:
        print(f"ERROR: Missing required arguments: {', '.join(missing)}")
        sys.exit(1)

    return args


def main() -> None:
    """Main export function — runs inside Blender's Python environment."""
    # bpy is only available inside Blender
    try:
        import bpy  # type: ignore[import-not-found]
    except ImportError:
        print("ERROR: This script must be run inside Blender.")
        print("Usage: blender --background --python blender_export.py -- --input FILE --format FMT --output FILE")
        sys.exit(1)

    args = parse_args()
    input_path = Path(args["input"]).resolve()
    output_path = Path(args["output"]).resolve()
    export_format = args["format"].lower()

    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)

    # Create output directory if needed
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Open the input file
    suffix = input_path.suffix.lower()
    if suffix == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(input_path))
    elif suffix == ".obj":
        # Clear default scene objects
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete()
        # Import OBJ
        bpy.ops.wm.obj_import(filepath=str(input_path))
    elif suffix == ".ply":
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete()
        bpy.ops.wm.ply_import(filepath=str(input_path))
    elif suffix in (".gltf", ".glb"):
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete()
        bpy.ops.import_scene.gltf(filepath=str(input_path))
    else:
        print(f"ERROR: Unsupported input format: {suffix}")
        sys.exit(1)

    print(f"Loaded: {input_path}")
    print(f"Objects in scene: {len(bpy.data.objects)}")

    # Select all mesh objects for export
    bpy.ops.object.select_all(action="SELECT")

    # Export based on requested format
    if export_format in ("gltf", "glb"):
        export_fmt = "GLB" if export_format == "glb" else "GLTF_SEPARATE"
        bpy.ops.export_scene.gltf(
            filepath=str(output_path),
            export_format=export_fmt,
            export_texcoords=True,
            export_normals=True,
            export_materials="EXPORT",
            export_colors=True,
            use_visible=False,  # Export all objects, not just visible
            use_selection=False,  # Export everything
            export_apply=True,  # Apply modifiers
        )
        print(f"Exported glTF: {output_path}")

    elif export_format == "obj":
        bpy.ops.wm.obj_export(
            filepath=str(output_path),
            export_normals=True,
            export_uv=True,
            export_materials=True,
            export_triangulated_mesh=True,
            apply_modifiers=True,
        )
        print(f"Exported OBJ: {output_path}")

    else:
        print(f"ERROR: Unsupported export format: {export_format}")
        print("Supported formats: gltf, glb, obj")
        sys.exit(1)

    # Verify output exists
    if output_path.exists():
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"SUCCESS: {output_path} ({size_mb:.1f} MB)")
    else:
        print(f"ERROR: Export appeared to succeed but output file not found: {output_path}")
        sys.exit(1)


if __name__ == "__main__":
    main()
