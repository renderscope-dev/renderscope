#!/usr/bin/env python3
"""RenderScope format compatibility matrix utility.

Produces a compatibility matrix showing which renderer x scene combinations
are possible with current format availability.  Reads scene metadata from
``data/scenes/<id>.json`` and uses a hardcoded renderer format support map
(mirroring the adapter ``supported_formats()`` methods).

Usage examples::

    # Print compatibility matrix to terminal
    python scripts/format_compatibility.py

    # Output as JSON
    python scripts/format_compatibility.py --json

    # Generate skip_combinations YAML snippet for benchmark config
    python scripts/format_compatibility.py --generate-skips
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent

# ---------------------------------------------------------------------------
# Third-party imports (Rich is optional for --json mode)
# ---------------------------------------------------------------------------
_HAS_RICH = False
try:
    from rich.console import Console
    from rich.table import Table

    _HAS_RICH = True
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Renderer format support map
# ---------------------------------------------------------------------------
# Hardcoded to mirror the adapter supported_formats() without importing the
# adapter registry.  Kept in sync manually with the Python adapters.
#
# Keys: renderer IDs matching data/renderers/<id>.json
# Values: set of scene format strings matching data/scenes/<id>.json available_formats
RENDERER_FORMATS: dict[str, set[str]] = {
    "pbrt": {"pbrt"},
    "mitsuba3": {"mitsuba_xml", "xml", "obj", "ply", "serialized"},
    "blender-cycles": {"blend", "obj", "fbx", "gltf", "glb"},
    "luxcore": {"obj", "ply", "blend"},
    "appleseed": {"obj", "ply"},
    "filament": {"gltf", "glb"},
    "ospray": {"obj", "gltf", "glb", "ply"},
}

# Combinations that are technically format-compatible but should still be
# skipped for other reasons (e.g. scene too large for real-time rendering).
EXTRA_SKIPS: dict[tuple[str, str], str] = {
    ("filament", "san-miguel"): "Filament cannot handle 10.5M face scenes in real-time",
}

# Ordered lists for consistent display.
RENDERER_ORDER = [
    "pbrt",
    "mitsuba3",
    "blender-cycles",
    "luxcore",
    "appleseed",
    "filament",
    "ospray",
]

SCENE_ORDER = [
    "cornell-box",
    "stanford-bunny",
    "veach-mis",
    "sponza",
    "classroom",
    "bmw",
    "san-miguel",
]


# ---------------------------------------------------------------------------
# Scene metadata loading
# ---------------------------------------------------------------------------


def load_scene_formats(scenes_dir: Path) -> dict[str, set[str]]:
    """Load available_formats from each scene's metadata JSON.

    Returns:
        Mapping of scene_id -> set of format strings.
    """
    result: dict[str, set[str]] = {}
    if not scenes_dir.is_dir():
        return result

    for scene_file in sorted(scenes_dir.glob("*.json")):
        try:
            data: dict[str, Any] = json.loads(scene_file.read_text(encoding="utf-8"))
            scene_id = data.get("id", scene_file.stem)
            formats = set(data.get("available_formats", []))
            result[scene_id] = formats
        except (json.JSONDecodeError, OSError):
            pass

    return result


# ---------------------------------------------------------------------------
# Compatibility computation
# ---------------------------------------------------------------------------

# Status values for each cell in the matrix.
COMPATIBLE = "OK"         # Renderer natively supports a scene format.
CONVERSION = "CONV"       # Requires format conversion (lossy).
INCOMPATIBLE = "--"       # No compatible format exists.
EXTRA_SKIP = "SKIP"       # Format-compatible but skipped for other reasons.


def compute_matrix(
    scene_formats: dict[str, set[str]],
) -> dict[str, dict[str, tuple[str, str]]]:
    """Compute the compatibility matrix.

    Returns:
        ``{renderer_id: {scene_id: (status, detail)}}``
    """
    matrix: dict[str, dict[str, tuple[str, str]]] = {}

    for renderer_id in RENDERER_ORDER:
        renderer_fmts = RENDERER_FORMATS.get(renderer_id, set())
        row: dict[str, tuple[str, str]] = {}

        for scene_id in SCENE_ORDER:
            scene_fmts = scene_formats.get(scene_id, set())

            # Check for extra skip first.
            extra_reason = EXTRA_SKIPS.get((renderer_id, scene_id))
            if extra_reason:
                row[scene_id] = (EXTRA_SKIP, extra_reason)
                continue

            overlap = scene_fmts & renderer_fmts
            if overlap:
                row[scene_id] = (COMPATIBLE, ", ".join(sorted(overlap)))
            else:
                # Check if a conversion path might exist (scene has obj/gltf
                # that could be converted, or mitsuba_xml from pbrt).
                conversion_targets = {"obj", "gltf", "glb", "ply", "blend"}
                if scene_fmts & conversion_targets and renderer_fmts & conversion_targets:
                    # Possible conversion path via intermediate format.
                    row[scene_id] = (CONVERSION, "Requires format conversion")
                elif "pbrt" in scene_fmts and "mitsuba_xml" in renderer_fmts:
                    # PBRT -> Mitsuba XML conversion (lossy).
                    row[scene_id] = (CONVERSION, "PBRT -> Mitsuba XML (lossy)")
                else:
                    row[scene_id] = (INCOMPATIBLE, "No compatible format")

        matrix[renderer_id] = row

    return matrix


def get_incompatible_combinations(
    matrix: dict[str, dict[str, tuple[str, str]]],
) -> list[dict[str, str]]:
    """Extract incompatible/skipped combinations from the matrix.

    Returns list of dicts with ``renderer``, ``scene``, ``reason`` keys.
    """
    incompatible: list[dict[str, str]] = []
    for renderer_id, row in matrix.items():
        for scene_id, (status, detail) in row.items():
            if status in (INCOMPATIBLE, EXTRA_SKIP):
                incompatible.append(
                    {
                        "renderer": renderer_id,
                        "scene": scene_id,
                        "reason": detail,
                    }
                )
    return incompatible


# ---------------------------------------------------------------------------
# Output formatters
# ---------------------------------------------------------------------------


def print_rich_matrix(
    matrix: dict[str, dict[str, tuple[str, str]]],
    scene_formats: dict[str, set[str]],
) -> None:
    """Print the matrix as a Rich table."""
    if not _HAS_RICH:
        print("Rich library not available. Use --json for output.", file=sys.stderr)
        sys.exit(1)

    console = Console()

    table = Table(
        title="RenderScope Format Compatibility Matrix",
        show_header=True,
        header_style="bold",
        padding=(0, 1),
    )
    table.add_column("Renderer", style="cyan", min_width=16)

    for scene_id in SCENE_ORDER:
        table.add_column(scene_id, min_width=10, justify="center")

    status_styles = {
        COMPATIBLE: "[green]OK[/green]",
        CONVERSION: "[yellow]CONV[/yellow]",
        INCOMPATIBLE: "[red]--[/red]",
        EXTRA_SKIP: "[red]SKIP[/red]",
    }

    for renderer_id in RENDERER_ORDER:
        row = matrix.get(renderer_id, {})
        cells = [renderer_id]
        for scene_id in SCENE_ORDER:
            status, detail = row.get(scene_id, (INCOMPATIBLE, "Unknown"))
            cell = status_styles.get(status, status)
            cells.append(cell)
        table.add_row(*cells)

    console.print()
    console.print(table)
    console.print()
    console.print("[green]OK[/green] = native format match    "
                  "[yellow]CONV[/yellow] = requires conversion    "
                  "[red]--[/red] = no compatible format    "
                  "[red]SKIP[/red] = skipped (other reason)")
    console.print()

    # Print incompatible details.
    incompatible = get_incompatible_combinations(matrix)
    if incompatible:
        console.print(f"[bold]Incompatible/skipped combinations ({len(incompatible)}):[/bold]")
        for item in incompatible:
            console.print(f"  {item['renderer']} x {item['scene']}: {item['reason']}")
        console.print()


def output_json(
    matrix: dict[str, dict[str, tuple[str, str]]],
    scene_formats: dict[str, set[str]],
) -> None:
    """Output the matrix as JSON."""
    data: dict[str, Any] = {
        "scenes": {sid: sorted(fmts) for sid, fmts in scene_formats.items()},
        "renderers": {rid: sorted(fmts) for rid, fmts in RENDERER_FORMATS.items()},
        "matrix": {},
        "incompatible": get_incompatible_combinations(matrix),
    }

    for renderer_id, row in matrix.items():
        data["matrix"][renderer_id] = {
            scene_id: {"status": status, "detail": detail}
            for scene_id, (status, detail) in row.items()
        }

    print(json.dumps(data, indent=2, ensure_ascii=False))


def output_generate_skips(
    matrix: dict[str, dict[str, tuple[str, str]]],
) -> None:
    """Output a YAML snippet for the skip_combinations config section."""
    incompatible = get_incompatible_combinations(matrix)

    if not incompatible:
        print("# No incompatible combinations found.")
        return

    print("# Auto-generated skip_combinations for benchmark config")
    print("# Paste this into your benchmark_config_batch2.yaml")
    print("skip_combinations:")
    for item in incompatible:
        print(f'  - renderer: {item["renderer"]}')
        print(f'    scene: {item["scene"]}')
        print(f'    reason: "{item["reason"]}"')
        print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="RenderScope format compatibility matrix utility.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python scripts/format_compatibility.py\n"
            "  python scripts/format_compatibility.py --json\n"
            "  python scripts/format_compatibility.py --generate-skips\n"
        ),
    )
    parser.add_argument(
        "--scenes-dir",
        type=Path,
        default=_REPO_ROOT / "data" / "scenes",
        help="Directory containing scene metadata JSON files.",
    )
    output_group = parser.add_mutually_exclusive_group()
    output_group.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON.",
    )
    output_group.add_argument(
        "--generate-skips",
        action="store_true",
        help="Generate skip_combinations YAML snippet for benchmark config.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    # Load scene format data.
    scene_formats = load_scene_formats(args.scenes_dir)

    if not scene_formats:
        print(f"No scene metadata found in {args.scenes_dir}", file=sys.stderr)
        print("Run from the repository root or specify --scenes-dir.", file=sys.stderr)
        sys.exit(1)

    # Compute the matrix.
    matrix = compute_matrix(scene_formats)

    # Output.
    if args.json:
        output_json(matrix, scene_formats)
    elif args.generate_skips:
        output_generate_skips(matrix)
    else:
        print_rich_matrix(matrix, scene_formats)


if __name__ == "__main__":
    main()
