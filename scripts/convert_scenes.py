#!/usr/bin/env python3
"""
RenderScope Scene Format Converter

Converts downloaded benchmark scenes into the formats required by different
renderers. Not all conversions are fully automated — the script reports which
conversions succeeded, which were skipped, and which need manual work.

Usage:
    python scripts/convert_scenes.py                           # Convert all
    python scripts/convert_scenes.py --scene cornell-box       # Convert one
    python scripts/convert_scenes.py --format gltf             # Only to glTF
    python scripts/convert_scenes.py --dry-run                 # Preview plan
    python scripts/convert_scenes.py --blender-path /usr/bin/blender

Exit codes:
    0 = All automated conversions succeeded (manual items are reported, not errors)
    1 = One or more automated conversions failed
"""

from __future__ import annotations

import argparse
import io
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

# Ensure stdout can handle unicode on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )

try:
    from rich.console import Console
    from rich.table import Table

    HAS_RICH = True
except ImportError:
    HAS_RICH = False


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SCENES_DIR = PROJECT_ROOT / "assets" / "scenes"
BLENDER_EXPORT_SCRIPT = PROJECT_ROOT / "scripts" / "blender_export.py"

console = Console() if HAS_RICH else None


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


class ConversionStatus(Enum):
    AVAILABLE = "available"      # File already exists
    CONVERTED = "converted"      # Successfully converted in this run
    MANUAL = "manual"            # Requires manual conversion
    SKIPPED = "skipped"          # Skipped (already exists or not applicable)
    FAILED = "failed"            # Automated conversion failed
    NO_SOURCE = "no_source"      # Source file not available for conversion


@dataclass
class ConversionResult:
    """Result of a single format conversion."""

    scene_id: str
    target_format: str
    status: ConversionStatus
    message: str = ""


@dataclass
class SceneConversionSpec:
    """Specification for how to convert a scene between formats."""

    id: str
    name: str
    native_format: str
    conversions: dict[str, ConversionMethod] = field(default_factory=dict)


@dataclass
class ConversionMethod:
    """How to perform a specific format conversion."""

    method: str       # "blender", "trimesh", "download", "manual"
    source_format: str
    automated: bool = True
    notes: str = ""


# ---------------------------------------------------------------------------
# Conversion specifications per scene
# ---------------------------------------------------------------------------

SCENE_CONVERSION_SPECS: list[SceneConversionSpec] = [
    SceneConversionSpec(
        id="cornell-box",
        name="Cornell Box",
        native_format="obj",
        conversions={
            "gltf": ConversionMethod(
                method="blender",
                source_format="obj",
                automated=True,
                notes="Convert OBJ to glTF via Blender.",
            ),
            "pbrt": ConversionMethod(
                method="download",
                source_format="pbrt",
                automated=False,
                notes="PBRT version available from benedikt-bitterli.me/resources/.",
            ),
            "mitsuba_xml": ConversionMethod(
                method="download",
                source_format="mitsuba_xml",
                automated=False,
                notes="Mitsuba XML version available from benedikt-bitterli.me/resources/.",
            ),
        },
    ),
    SceneConversionSpec(
        id="sponza",
        name="Sponza Atrium",
        native_format="obj",
        conversions={
            "gltf": ConversionMethod(
                method="blender",
                source_format="obj",
                automated=True,
                notes="Convert OBJ to glTF via Blender.",
            ),
            "pbrt": ConversionMethod(
                method="download",
                source_format="pbrt",
                automated=False,
                notes="PBRT version available from pbrt-v4-scenes repository.",
            ),
            "mitsuba_xml": ConversionMethod(
                method="manual",
                source_format="obj",
                automated=False,
                notes="Convert OBJ to Mitsuba XML. Community versions may be available.",
            ),
        },
    ),
    SceneConversionSpec(
        id="stanford-bunny",
        name="Stanford Bunny",
        native_format="obj",
        conversions={
            "gltf": ConversionMethod(
                method="blender",
                source_format="obj",
                automated=True,
                notes="Convert OBJ to glTF via Blender. Add ground plane and light.",
            ),
            "pbrt": ConversionMethod(
                method="download",
                source_format="pbrt",
                automated=False,
                notes="PBRT version available from pbrt-v4-scenes repository.",
            ),
            "ply": ConversionMethod(
                method="trimesh",
                source_format="obj",
                automated=True,
                notes="Convert OBJ to PLY via trimesh.",
            ),
        },
    ),
    SceneConversionSpec(
        id="classroom",
        name="Classroom",
        native_format="blend",
        conversions={
            "gltf": ConversionMethod(
                method="blender",
                source_format="blend",
                automated=True,
                notes="Export from Blender to glTF.",
            ),
            "obj": ConversionMethod(
                method="blender",
                source_format="blend",
                automated=True,
                notes="Export from Blender to OBJ.",
            ),
            "pbrt": ConversionMethod(
                method="manual",
                source_format="blend",
                automated=False,
                notes="Requires manual material translation from Blender shader nodes.",
            ),
            "mitsuba_xml": ConversionMethod(
                method="manual",
                source_format="blend",
                automated=False,
                notes="Requires manual material translation from Blender shader nodes.",
            ),
        },
    ),
    SceneConversionSpec(
        id="bmw",
        name="BMW M6",
        native_format="blend",
        conversions={
            "gltf": ConversionMethod(
                method="blender",
                source_format="blend",
                automated=True,
                notes="Export from Blender to glTF.",
            ),
            "obj": ConversionMethod(
                method="blender",
                source_format="blend",
                automated=True,
                notes="Export from Blender to OBJ.",
            ),
            "pbrt": ConversionMethod(
                method="manual",
                source_format="blend",
                automated=False,
                notes="Requires manual material translation from Blender shader nodes.",
            ),
            "mitsuba_xml": ConversionMethod(
                method="manual",
                source_format="blend",
                automated=False,
                notes="Requires manual material translation from Blender shader nodes.",
            ),
        },
    ),
    SceneConversionSpec(
        id="san-miguel",
        name="San Miguel",
        native_format="obj",
        conversions={
            "pbrt": ConversionMethod(
                method="download",
                source_format="pbrt",
                automated=False,
                notes="PBRT version available from mmp/pbrt-v4-scenes repository.",
            ),
            "gltf": ConversionMethod(
                method="manual",
                source_format="obj",
                automated=False,
                notes="Extremely large scene (~10M polygons). Conversion is difficult due to scale.",
            ),
            "mitsuba_xml": ConversionMethod(
                method="manual",
                source_format="obj",
                automated=False,
                notes="Requires manual translation. Non-trivial due to scene complexity.",
            ),
        },
    ),
    SceneConversionSpec(
        id="veach-mis",
        name="Veach MIS",
        native_format="pbrt",
        conversions={
            "mitsuba_xml": ConversionMethod(
                method="manual",
                source_format="pbrt",
                automated=False,
                notes="Manual translation required. Scene is PBRT-specific.",
            ),
        },
    ),
]

SPEC_MAP: dict[str, SceneConversionSpec] = {s.id: s for s in SCENE_CONVERSION_SPECS}

# All supported target formats
ALL_FORMATS = {"obj", "gltf", "pbrt", "mitsuba_xml", "ply", "blend"}


# ---------------------------------------------------------------------------
# Conversion functions
# ---------------------------------------------------------------------------


def find_blender(blender_path: Optional[str] = None) -> Optional[Path]:
    """Locate the Blender executable."""
    if blender_path:
        p = Path(blender_path)
        if p.exists():
            return p
        return None

    # Try common locations
    blender = shutil.which("blender")
    if blender:
        return Path(blender)

    # Platform-specific default locations
    if sys.platform == "win32":
        for version in ["4.2", "4.1", "4.0", "3.6"]:
            candidate = Path(f"C:/Program Files/Blender Foundation/Blender {version}/blender.exe")
            if candidate.exists():
                return candidate
    elif sys.platform == "darwin":
        candidate = Path("/Applications/Blender.app/Contents/MacOS/Blender")
        if candidate.exists():
            return candidate

    return None


def convert_with_blender(
    blender_exe: Path,
    input_file: Path,
    output_format: str,
    output_dir: Path,
    scene_id: str,
) -> ConversionResult:
    """Convert a scene file using Blender's export capabilities."""
    output_file = output_dir / f"{scene_id}.{output_format}"

    if output_file.exists():
        return ConversionResult(
            scene_id=scene_id,
            target_format=output_format,
            status=ConversionStatus.AVAILABLE,
            message=f"Already exists: {output_file.name}",
        )

    if not BLENDER_EXPORT_SCRIPT.exists():
        return ConversionResult(
            scene_id=scene_id,
            target_format=output_format,
            status=ConversionStatus.FAILED,
            message="Blender export script not found: scripts/blender_export.py",
        )

    cmd = [
        str(blender_exe),
        "--background",
        "--python", str(BLENDER_EXPORT_SCRIPT),
        "--",
        "--input", str(input_file),
        "--format", output_format,
        "--output", str(output_file),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5-minute timeout for large scenes
        )
        if result.returncode == 0 and output_file.exists():
            return ConversionResult(
                scene_id=scene_id,
                target_format=output_format,
                status=ConversionStatus.CONVERTED,
                message=f"Converted to {output_file.name}",
            )
        else:
            stderr = result.stderr[-500:] if result.stderr else "No error output"
            return ConversionResult(
                scene_id=scene_id,
                target_format=output_format,
                status=ConversionStatus.FAILED,
                message=f"Blender export failed: {stderr}",
            )
    except subprocess.TimeoutExpired:
        return ConversionResult(
            scene_id=scene_id,
            target_format=output_format,
            status=ConversionStatus.FAILED,
            message="Blender export timed out (>300s)",
        )
    except FileNotFoundError:
        return ConversionResult(
            scene_id=scene_id,
            target_format=output_format,
            status=ConversionStatus.FAILED,
            message=f"Blender executable not found: {blender_exe}",
        )


def convert_with_trimesh(
    input_file: Path,
    output_format: str,
    output_dir: Path,
    scene_id: str,
) -> ConversionResult:
    """Convert a mesh file using the trimesh library."""
    output_file = output_dir / f"{scene_id}.{output_format}"

    if output_file.exists():
        return ConversionResult(
            scene_id=scene_id,
            target_format=output_format,
            status=ConversionStatus.AVAILABLE,
            message=f"Already exists: {output_file.name}",
        )

    try:
        import trimesh
    except ImportError:
        return ConversionResult(
            scene_id=scene_id,
            target_format=output_format,
            status=ConversionStatus.FAILED,
            message="trimesh not installed. Install with: pip install trimesh",
        )

    try:
        mesh = trimesh.load(str(input_file))
        mesh.export(str(output_file))
        return ConversionResult(
            scene_id=scene_id,
            target_format=output_format,
            status=ConversionStatus.CONVERTED,
            message=f"Converted to {output_file.name}",
        )
    except Exception as exc:
        return ConversionResult(
            scene_id=scene_id,
            target_format=output_format,
            status=ConversionStatus.FAILED,
            message=f"trimesh conversion failed: {exc}",
        )


def find_source_file(scene_dir: Path, source_format: str, scene_id: str) -> Optional[Path]:
    """Find a source file for conversion in the scene directory."""
    # Try exact filename first
    candidates = [
        scene_dir / f"{scene_id}.{source_format}",
    ]
    # Also search recursively
    for candidate in candidates:
        if candidate.exists():
            return candidate

    # Glob for any file with the right extension
    matches = list(scene_dir.rglob(f"*.{source_format}"))
    if matches:
        return matches[0]

    return None


# ---------------------------------------------------------------------------
# Main conversion logic
# ---------------------------------------------------------------------------


def convert_scene(
    spec: SceneConversionSpec,
    scenes_dir: Path,
    target_formats: Optional[set[str]],
    blender_exe: Optional[Path],
    dry_run: bool,
    verbose: bool,
) -> list[ConversionResult]:
    """Convert a single scene to all requested formats."""
    scene_dir = scenes_dir / spec.id
    results: list[ConversionResult] = []

    if not scene_dir.exists():
        if verbose:
            print(f"  Scene directory not found: {scene_dir}. Run acquire_scenes.py first.")
        return [
            ConversionResult(
                scene_id=spec.id,
                target_format="*",
                status=ConversionStatus.NO_SOURCE,
                message="Scene not downloaded. Run acquire_scenes.py first.",
            )
        ]

    for target_fmt, method in spec.conversions.items():
        # Skip if not in requested formats
        if target_formats and target_fmt not in target_formats:
            continue

        # Check if output already exists
        output_file = scene_dir / f"{spec.id}.{target_fmt}"
        if output_file.exists():
            results.append(ConversionResult(
                scene_id=spec.id,
                target_format=target_fmt,
                status=ConversionStatus.AVAILABLE,
                message=f"Already exists: {output_file.name}",
            ))
            continue

        # Skip manual conversions
        if not method.automated:
            results.append(ConversionResult(
                scene_id=spec.id,
                target_format=target_fmt,
                status=ConversionStatus.MANUAL,
                message=method.notes,
            ))
            continue

        if dry_run:
            results.append(ConversionResult(
                scene_id=spec.id,
                target_format=target_fmt,
                status=ConversionStatus.SKIPPED,
                message=f"Would convert {method.source_format} -> {target_fmt} via {method.method}",
            ))
            continue

        # Find source file
        source_file = find_source_file(scene_dir, method.source_format, spec.id)
        if not source_file:
            results.append(ConversionResult(
                scene_id=spec.id,
                target_format=target_fmt,
                status=ConversionStatus.NO_SOURCE,
                message=(
                    f"Source file ({method.source_format}) not found in {scene_dir}. "
                    f"Download the scene first."
                ),
            ))
            continue

        # Perform conversion
        if method.method == "blender":
            if not blender_exe:
                results.append(ConversionResult(
                    scene_id=spec.id,
                    target_format=target_fmt,
                    status=ConversionStatus.FAILED,
                    message="Blender not found. Install Blender or use --blender-path.",
                ))
                continue
            result = convert_with_blender(
                blender_exe, source_file, target_fmt, scene_dir, spec.id,
            )
            results.append(result)

        elif method.method == "trimesh":
            result = convert_with_trimesh(
                source_file, target_fmt, scene_dir, spec.id,
            )
            results.append(result)

        else:
            results.append(ConversionResult(
                scene_id=spec.id,
                target_format=target_fmt,
                status=ConversionStatus.FAILED,
                message=f"Unknown conversion method: {method.method}",
            ))

    return results


# ---------------------------------------------------------------------------
# Status report
# ---------------------------------------------------------------------------


def print_status_report(all_results: dict[str, list[ConversionResult]]) -> None:
    """Print a formatted conversion status matrix."""
    formats = ["obj", "pbrt", "mitsuba_xml", "gltf"]

    if HAS_RICH:
        table = Table(title="Scene Format Conversion Status")
        table.add_column("Scene", style="bold")
        for fmt in formats:
            table.add_column(fmt.upper(), justify="center")

        for spec in SCENE_CONVERSION_SPECS:
            results = all_results.get(spec.id, [])
            result_map = {r.target_format: r for r in results}

            row: list[str] = [spec.name]
            for fmt in formats:
                if fmt == spec.native_format:
                    row.append("[green]native[/green]")
                elif fmt in result_map:
                    r = result_map[fmt]
                    if r.status == ConversionStatus.AVAILABLE:
                        row.append("[green]yes[/green]")
                    elif r.status == ConversionStatus.CONVERTED:
                        row.append("[green]converted[/green]")
                    elif r.status == ConversionStatus.MANUAL:
                        row.append("[yellow]manual[/yellow]")
                    elif r.status == ConversionStatus.FAILED:
                        row.append("[red]failed[/red]")
                    elif r.status == ConversionStatus.NO_SOURCE:
                        row.append("[red]no source[/red]")
                    elif r.status == ConversionStatus.SKIPPED:
                        row.append("[dim]skipped[/dim]")
                    else:
                        row.append("[dim]-[/dim]")
                else:
                    # Check if the native format matches or file exists
                    scene_dir = DEFAULT_SCENES_DIR / spec.id
                    candidate = scene_dir / f"{spec.id}.{fmt}"
                    if candidate.exists():
                        row.append("[green]yes[/green]")
                    else:
                        row.append("[dim]-[/dim]")

            table.add_row(*row)

        if console:
            console.print()
            console.print(table)
            console.print(
                "\n  Legend: [green]yes/native[/green] = available  "
                "[yellow]manual[/yellow] = needs manual work  "
                "[red]failed[/red] = conversion error"
            )
    else:
        print("\nScene Format Conversion Status")
        print("=" * 70)
        header = f"  {'Scene':<20}"
        for fmt in formats:
            header += f" {fmt.upper():>10}"
        print(header)
        print(f"  {'-'*20}" + f" {'-'*10}" * len(formats))

        for spec in SCENE_CONVERSION_SPECS:
            results = all_results.get(spec.id, [])
            result_map = {r.target_format: r for r in results}
            row = f"  {spec.name:<20}"
            for fmt in formats:
                if fmt == spec.native_format:
                    row += f" {'native':>10}"
                elif fmt in result_map:
                    row += f" {result_map[fmt].status.value:>10}"
                else:
                    row += f" {'-':>10}"
            print(row)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert benchmark scenes between rendering formats.",
    )
    parser.add_argument(
        "--scene", "-s",
        action="append",
        dest="scenes",
        metavar="ID",
        help="Convert a specific scene. Can be repeated. If omitted, convert all.",
    )
    parser.add_argument(
        "--format", "-f",
        action="append",
        dest="formats",
        metavar="FMT",
        help="Target format (e.g., pbrt, mitsuba_xml, obj, gltf). Can be repeated.",
    )
    parser.add_argument(
        "--blender-path",
        type=str,
        default=None,
        help="Path to Blender executable. Default: auto-detect from PATH.",
    )
    parser.add_argument(
        "--scenes-dir",
        type=Path,
        default=DEFAULT_SCENES_DIR,
        help=f"Scene assets directory (default: {DEFAULT_SCENES_DIR.relative_to(PROJECT_ROOT)})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be converted without doing it.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose logging.",
    )

    args = parser.parse_args()

    # Find Blender
    blender_exe = find_blender(args.blender_path)
    if blender_exe:
        print(f"Blender found: {blender_exe}")
    else:
        print(
            "Blender not found. Skipping .blend conversions.\n"
            "  Install Blender: https://www.blender.org/download/\n"
            "  Or specify path: --blender-path /path/to/blender\n"
        )

    # Determine target formats
    target_formats: Optional[set[str]] = None
    if args.formats:
        target_formats = set(args.formats)
        unknown = target_formats - ALL_FORMATS
        if unknown:
            print(f"Warning: Unknown format(s): {', '.join(unknown)}")
            print(f"Known formats: {', '.join(sorted(ALL_FORMATS))}")

    # Determine which scenes to convert
    if args.scenes:
        specs_to_convert = []
        for sid in args.scenes:
            if sid not in SPEC_MAP:
                print(f"Error: Unknown scene ID: '{sid}'")
                print(f"Available: {', '.join(SPEC_MAP.keys())}")
                return 1
            specs_to_convert.append(SPEC_MAP[sid])
    else:
        specs_to_convert = list(SCENE_CONVERSION_SPECS)

    # Run conversions
    all_results: dict[str, list[ConversionResult]] = {}
    any_failed = False

    for spec in specs_to_convert:
        if args.verbose:
            print(f"\nProcessing: {spec.name}")

        results = convert_scene(
            spec=spec,
            scenes_dir=args.scenes_dir,
            target_formats=target_formats,
            blender_exe=blender_exe,
            dry_run=args.dry_run,
            verbose=args.verbose,
        )
        all_results[spec.id] = results

        for r in results:
            if r.status == ConversionStatus.FAILED:
                any_failed = True
                if args.verbose:
                    print(f"  FAILED: {r.target_format} - {r.message}")
            elif r.status == ConversionStatus.CONVERTED:
                if args.verbose:
                    print(f"  OK: {r.message}")

    # Print status report
    print_status_report(all_results)

    return 1 if any_failed else 0


if __name__ == "__main__":
    sys.exit(main())
