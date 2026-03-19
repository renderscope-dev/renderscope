#!/usr/bin/env python3
"""RenderScope web image pipeline.

Transforms raw render output (EXR, PNG, PPM) into web-optimised WebP images
suitable for the gallery, comparison tool, and renderer profile pages.

Supports two input pipelines:
  **HDR (EXR)** -- path tracers:
    1. Load 32-bit float HDR image
    2. Optionally clamp firefly pixels
    3. Apply tone mapping (ACES Filmic, Reinhard, or Hable Filmic)
    4. Convert linear -> sRGB
    5. Quantise to 8-bit
    6. Save full-size WebP (1920 x 1080, quality 90)
    7. Resize and save thumbnail WebP (400 x 225, quality 85)

  **LDR (PNG/JPEG/PPM)** -- rasterizers (Filament) and OSPRay:
    1. Load 8-bit sRGB image (already tone-mapped)
    2. Resize to target resolution if necessary
    3. Save full-size and thumbnail WebP

Usage examples::

    # Process all render images in assets/renders/
    python scripts/generate_web_images.py

    # Process only one scene
    python scripts/generate_web_images.py --scene cornell-box

    # Process only one renderer
    python scripts/generate_web_images.py --renderer pbrt

    # Dry run -- show what would be processed
    python scripts/generate_web_images.py --dry-run

    # Override tone mapping operator (EXR only)
    python scripts/generate_web_images.py --tonemap aces
    python scripts/generate_web_images.py --tonemap reinhard
    python scripts/generate_web_images.py --tonemap filmic

    # Skip existing WebP files
    python scripts/generate_web_images.py --skip-existing

    # Also generate comparison strips (all renderers side-by-side)
    python scripts/generate_web_images.py --comparison-strips

    # Run the built-in test (synthetic gradient EXR -> WebP)
    python scripts/generate_web_images.py --test
"""

from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np
from numpy.typing import NDArray
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent

# ---------------------------------------------------------------------------
# Third-party imports
# ---------------------------------------------------------------------------
try:
    from rich.console import Console
    from rich.progress import (
        BarColumn,
        Progress,
        SpinnerColumn,
        TextColumn,
        TimeElapsedColumn,
    )
    from rich.table import Table
except ImportError:
    sys.exit("ERROR: Rich is required.  pip install rich")

console = Console()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
FULL_WIDTH = 1920
FULL_HEIGHT = 1080
THUMB_WIDTH = 400
THUMB_HEIGHT = 225
WEBP_QUALITY_FULL = 90
WEBP_QUALITY_THUMB = 85
WEBP_METHOD = 6  # Slowest/best compression


# ---------------------------------------------------------------------------
# Tone mapping operators
# ---------------------------------------------------------------------------


def aces_tonemap(colour: NDArray[np.float32]) -> NDArray[np.float32]:
    """Apply ACES Filmic tone mapping (Narkowicz approximation).

    This is the industry-standard tone curve used in film and game production.
    It provides smooth highlight rolloff and good colour preservation.

    Args:
        colour: Linear HDR float array ``(H, W, 3)``, any range.

    Returns:
        Tone-mapped float array ``(H, W, 3)`` in ``[0, 1]``.
    """
    a = 2.51
    b = 0.03
    c = 2.43
    d = 0.59
    e = 0.14
    colour = np.maximum(colour, 0.0)
    mapped = (colour * (a * colour + b)) / (colour * (c * colour + d) + e)
    return np.clip(mapped, 0.0, 1.0).astype(np.float32)


def reinhard_tonemap(colour: NDArray[np.float32]) -> NDArray[np.float32]:
    """Simple Reinhard global tone mapping.

    Args:
        colour: Linear HDR float array ``(H, W, 3)``.

    Returns:
        Tone-mapped float array ``(H, W, 3)`` in ``[0, 1]``.
    """
    colour = np.maximum(colour, 0.0)
    mapped = colour / (1.0 + colour)
    return mapped.astype(np.float32)


def filmic_tonemap(colour: NDArray[np.float32]) -> NDArray[np.float32]:
    """Hable / Uncharted 2 filmic tone mapping.

    Uses John Hable's piecewise curve from *Uncharted 2*.

    Args:
        colour: Linear HDR float array ``(H, W, 3)``.

    Returns:
        Tone-mapped float array ``(H, W, 3)`` in ``[0, 1]``.
    """

    def _uncharted2(x: NDArray[np.float32]) -> NDArray[np.float32]:
        A = 0.15
        B = 0.50
        C = 0.10
        D = 0.20
        E = 0.02
        F = 0.30
        return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F

    colour = np.maximum(colour, 0.0)
    exposure_bias = 2.0
    curr = _uncharted2(colour * exposure_bias)
    white_scale = 1.0 / _uncharted2(np.float32(11.2))
    mapped = curr * white_scale
    return np.clip(mapped, 0.0, 1.0).astype(np.float32)


_TONE_MAP_FUNCS = {
    "aces": aces_tonemap,
    "reinhard": reinhard_tonemap,
    "filmic": filmic_tonemap,
}


# ---------------------------------------------------------------------------
# Colour-space conversion
# ---------------------------------------------------------------------------


def linear_to_srgb(colour: NDArray[np.float32]) -> NDArray[np.float32]:
    """Convert linear RGB to sRGB using the official IEC 61966-2-1 transfer function.

    Args:
        colour: Linear float array in ``[0, 1]``.

    Returns:
        sRGB float array in ``[0, 1]``.
    """
    colour = np.clip(colour, 0.0, 1.0)
    low = colour * 12.92
    high = 1.055 * np.power(np.maximum(colour, 0.0031308), 1.0 / 2.4) - 0.055
    return np.where(colour <= 0.0031308, low, high).astype(np.float32)


# ---------------------------------------------------------------------------
# Firefly clamping
# ---------------------------------------------------------------------------


def clamp_fireflies(
    image: NDArray[np.float32],
    multiplier: float = 10.0,
) -> NDArray[np.float32]:
    """Clamp extremely bright firefly pixels.

    Fireflies are very bright isolated pixels caused by low-probability
    light paths.  They can blow out tone mapping.

    Args:
        image: HDR float array ``(H, W, 3)``.
        multiplier: Clamp to ``multiplier × median``.

    Returns:
        Clamped image.
    """
    luminance = 0.2126 * image[:, :, 0] + 0.7152 * image[:, :, 1] + 0.0722 * image[:, :, 2]
    median_val = float(np.median(luminance[luminance > 0])) if np.any(luminance > 0) else 1.0
    threshold = max(median_val * multiplier, 1.0)
    scale = np.where(luminance > threshold, threshold / np.maximum(luminance, 1e-10), 1.0)
    return (image * scale[:, :, np.newaxis]).astype(np.float32)


# ---------------------------------------------------------------------------
# Image I/O
# ---------------------------------------------------------------------------


def load_exr(path: Path) -> NDArray[np.float32]:
    """Load an EXR file as a float32 ``(H, W, 3)`` array.

    Falls through multiple backends: ``OpenEXR`` → ``imageio`` → ``OpenCV``.
    """
    try:
        # Reuse the project's robust loader.
        sys.path.insert(0, str(_REPO_ROOT / "python" / "src"))
        from renderscope.utils.image_io import load_image

        return load_image(path)
    except ImportError:
        pass

    # Inline fallback using OpenEXR directly.
    try:
        import Imath
        import OpenEXR

        exr = OpenEXR.InputFile(str(path))
        header = exr.header()
        dw = header["dataWindow"]
        w = dw.max.x - dw.min.x + 1
        h = dw.max.y - dw.min.y + 1
        float_type = Imath.PixelType(Imath.PixelType.FLOAT)
        channels = []
        for ch in ("R", "G", "B"):
            raw = exr.channel(ch, float_type)
            channels.append(np.frombuffer(raw, dtype=np.float32).reshape(h, w))
        return np.stack(channels, axis=-1)
    except ImportError:
        pass

    # imageio fallback.
    try:
        import imageio.v3 as iio

        img = iio.imread(str(path))
        arr = np.asarray(img, dtype=np.float32)
        if arr.ndim == 2:
            arr = np.stack([arr, arr, arr], axis=-1)
        elif arr.shape[2] == 4:
            arr = arr[:, :, :3]
        return arr
    except ImportError:
        pass

    sys.exit(
        f"ERROR: Cannot load EXR '{path}'.\n"
        "Install one of: pip install OpenEXR Imath  |  pip install imageio"
    )


def load_ldr_image(path: Path) -> NDArray[np.uint8]:
    """Load an LDR image (PNG, JPEG, PPM) as a uint8 ``(H, W, 3)`` array.

    These images are already tone-mapped and in sRGB colour space.
    No further tone mapping should be applied.
    """
    img = Image.open(str(path)).convert("RGB")
    return np.asarray(img, dtype=np.uint8)


def load_render_image(path: Path) -> tuple[NDArray[np.floating[Any]] | NDArray[np.uint8], bool]:
    """Load a render output image, handling both HDR (EXR) and LDR formats.

    Returns:
        ``(array, needs_tonemap)`` — EXR returns ``(float32, True)``;
        PNG/JPEG/PPM returns ``(uint8, False)``.
    """
    suffix = path.suffix.lower()

    if suffix == ".exr":
        return load_exr(path), True
    elif suffix in (".png", ".jpg", ".jpeg", ".ppm"):
        return load_ldr_image(path), False
    else:
        raise ValueError(f"Unsupported image format: {suffix}")


def save_webp(
    array: NDArray[np.uint8],
    path: Path,
    quality: int = WEBP_QUALITY_FULL,
) -> None:
    """Save a uint8 ``(H, W, 3)`` array as WebP (atomic write)."""
    img = Image.fromarray(array, mode="RGB")
    tmp_path = path.with_suffix(".webp.tmp")
    img.save(str(tmp_path), "WEBP", quality=quality, method=WEBP_METHOD)
    shutil.move(str(tmp_path), str(path))


def resize_image(
    array: NDArray[np.uint8],
    width: int,
    height: int,
) -> NDArray[np.uint8]:
    """Resize using Pillow's LANCZOS resampling (high-quality bicubic)."""
    img = Image.fromarray(array, mode="RGB")
    resized = img.resize((width, height), Image.Resampling.LANCZOS)
    return np.asarray(resized, dtype=np.uint8)


# ---------------------------------------------------------------------------
# Full processing pipeline
# ---------------------------------------------------------------------------


def process_image(
    image_path: Path,
    output_dir: Path,
    renderer_id: str,
    tonemap_name: str = "aces",
    firefly_clamp: bool = False,
) -> tuple[Path, Path]:
    """Process a single render image through the web image pipeline.

    Handles both HDR (EXR) and LDR (PNG/JPEG/PPM) input:
    - **EXR**: firefly clamp -> tone map -> linear-to-sRGB -> quantise -> WebP
    - **PNG/JPEG/PPM**: already sRGB 8-bit -> resize if needed -> WebP

    Returns:
        ``(full_size_path, thumbnail_path)``
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load — detect format and branch.
    image_data, needs_tonemap = load_render_image(image_path)

    if needs_tonemap:
        # HDR pipeline (EXR input).
        hdr = image_data.astype(np.float32)

        # 2. Optional firefly clamp.
        if firefly_clamp:
            hdr = clamp_fireflies(hdr)

        # 3. Tone map.
        tone_func = _TONE_MAP_FUNCS.get(tonemap_name)
        if tone_func is None:
            console.print(f"[red]Unknown tone map: '{tonemap_name}'[/red]")
            sys.exit(1)
        ldr = tone_func(hdr)

        # 4. Linear -> sRGB.
        srgb = linear_to_srgb(ldr)

        # 5. Quantise to 8-bit.
        uint8 = np.clip(srgb * 255.0 + 0.5, 0, 255).astype(np.uint8)
    else:
        # LDR pipeline (PNG/JPEG/PPM input).
        # Image is already tone-mapped and in sRGB.  Do NOT re-tonemap.
        uint8 = image_data.astype(np.uint8)

    # 6. Save full-size.
    full_name = f"{renderer_id}_{FULL_WIDTH}x{FULL_HEIGHT}.webp"
    full_path = output_dir / full_name
    # Ensure dimensions match (some renders might differ slightly).
    h, w = uint8.shape[:2]
    if w != FULL_WIDTH or h != FULL_HEIGHT:
        console.print(
            f"  [dim]Resolution {w}x{h} differs from target {FULL_WIDTH}x{FULL_HEIGHT} -- resizing[/dim]"
        )
        uint8_full = resize_image(uint8, FULL_WIDTH, FULL_HEIGHT)
    else:
        uint8_full = uint8
    save_webp(uint8_full, full_path, quality=WEBP_QUALITY_FULL)

    # 7. Save thumbnail.
    thumb_name = f"{renderer_id}_{THUMB_WIDTH}x{THUMB_HEIGHT}.webp"
    thumb_path = output_dir / thumb_name
    uint8_thumb = resize_image(uint8_full, THUMB_WIDTH, THUMB_HEIGHT)
    save_webp(uint8_thumb, thumb_path, quality=WEBP_QUALITY_THUMB)

    return full_path, thumb_path


def process_exr(
    exr_path: Path,
    output_dir: Path,
    renderer_id: str,
    tonemap_name: str = "aces",
    firefly_clamp: bool = False,
) -> tuple[Path, Path]:
    """Backwards-compatible alias for :func:`process_image`."""
    return process_image(exr_path, output_dir, renderer_id, tonemap_name, firefly_clamp)


# ---------------------------------------------------------------------------
# Comparison strip generation
# ---------------------------------------------------------------------------


def generate_comparison_strip(
    scene_dir: Path,
    renderers: list[str],
    output_path: Path,
) -> None:
    """Generate a single wide image with all renderer outputs side by side.

    Each panel is 384 × 216 pixels.  Panels are separated by 2-pixel white
    dividers and labelled with the renderer name.
    """
    panel_w = 384
    panel_h = 216
    divider = 2
    n = len(renderers)
    if n == 0:
        return

    total_w = n * panel_w + (n - 1) * divider
    strip = Image.new("RGB", (total_w, panel_h), (255, 255, 255))
    draw = ImageDraw.Draw(strip)

    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except (OSError, IOError):
        font = ImageFont.load_default()

    x_offset = 0
    for renderer_id in renderers:
        webp_path = scene_dir / f"{renderer_id}_{FULL_WIDTH}x{FULL_HEIGHT}.webp"
        if webp_path.is_file():
            img = Image.open(str(webp_path))
            # Centre crop to 16:9 region.
            iw, ih = img.size
            crop_w = min(iw, int(ih * panel_w / panel_h))
            crop_h = min(ih, int(iw * panel_h / panel_w))
            left = (iw - crop_w) // 2
            top = (ih - crop_h) // 2
            cropped = img.crop((left, top, left + crop_w, top + crop_h))
            panel = cropped.resize((panel_w, panel_h), Image.Resampling.LANCZOS)
        else:
            # Placeholder.
            panel = Image.new("RGB", (panel_w, panel_h), (30, 30, 40))

        strip.paste(panel, (x_offset, 0))

        # Label.
        label = renderer_id.replace("-", " ").title()
        draw.text(
            (x_offset + 8, panel_h - 24),
            label,
            fill=(255, 255, 255),
            font=font,
        )
        x_offset += panel_w + divider

    output_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = output_path.with_suffix(".webp.tmp")
    strip.save(str(tmp), "WEBP", quality=WEBP_QUALITY_FULL, method=WEBP_METHOD)
    shutil.move(str(tmp), str(output_path))


# ---------------------------------------------------------------------------
# Synthetic test
# ---------------------------------------------------------------------------


def run_test() -> None:
    """Generate a synthetic HDR gradient, process it, and display the result."""
    console.print("[bold]Running synthetic image pipeline test...[/bold]")

    # Create a synthetic HDR gradient (values 0 → 10).
    h, w = 270, 480
    gradient = np.linspace(0, 10, w, dtype=np.float32)
    image = np.stack([gradient] * h, axis=0)
    hdr = np.stack([image, image * 0.8, image * 0.6], axis=-1)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)

        # Save as a raw float file (we'll load it back for the pipeline).
        exr_path = tmp / "test_gradient.exr"
        try:
            sys.path.insert(0, str(_REPO_ROOT / "python" / "src"))
            from renderscope.utils.image_io import save_image

            save_image(hdr, exr_path)
        except ImportError:
            # Fallback: save as .npy and adapt.
            npy_path = tmp / "test_gradient.npy"
            np.save(str(npy_path), hdr)
            console.print(
                "[yellow]EXR save not available — testing tone mapping only.[/yellow]"
            )
            # Test tone mapping directly.
            for name, func in _TONE_MAP_FUNCS.items():
                mapped = func(hdr)
                srgb = linear_to_srgb(mapped)
                uint8 = np.clip(srgb * 255.0 + 0.5, 0, 255).astype(np.uint8)
                out_path = tmp / f"test_{name}.webp"
                save_webp(uint8, out_path)
                console.print(f"  {name}: {out_path.name} ({out_path.stat().st_size} bytes)")
            console.print("[green]Tone mapping test passed.[/green]")
            return

        # Run the full pipeline for each tone mapper.
        for name in _TONE_MAP_FUNCS:
            full, thumb = process_exr(
                exr_path, tmp, f"test_{name}", tonemap_name=name
            )
            console.print(
                f"  {name:>10}: full={full.stat().st_size:>6} bytes, "
                f"thumb={thumb.stat().st_size:>6} bytes"
            )
            # Verify dimensions.
            with Image.open(str(full)) as img:
                assert img.size == (FULL_WIDTH, FULL_HEIGHT), f"Full size mismatch: {img.size}"
            with Image.open(str(thumb)) as img:
                assert img.size == (THUMB_WIDTH, THUMB_HEIGHT), f"Thumb size mismatch: {img.size}"

    console.print("[green]All pipeline tests passed.[/green]")


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------


def discover_render_images(
    renders_dir: Path,
    scene_filter: str | None = None,
    renderer_filter: str | None = None,
) -> list[tuple[Path, str, str]]:
    """Find render output images in the renders directory.

    Supports EXR (path tracers), PNG (rasterizers, OSPRay), and PPM.

    Returns:
        List of ``(image_path, scene_id, renderer_id)`` tuples.
    """
    results: list[tuple[Path, str, str]] = []
    if not renders_dir.is_dir():
        return results

    # Track renderer IDs already discovered per scene to avoid duplicates
    # (e.g. if both EXR and PNG exist for the same renderer, prefer EXR).
    seen: set[tuple[str, str]] = set()

    for scene_dir in sorted(renders_dir.iterdir()):
        if not scene_dir.is_dir():
            continue
        scene_id = scene_dir.name
        if scene_filter and scene_id != scene_filter:
            continue

        # Discover EXR files first (preferred for path tracers).
        for image_file in sorted(scene_dir.glob("*.exr")):
            renderer_id = _parse_renderer_id(image_file)
            if renderer_filter and renderer_id != renderer_filter:
                continue
            key = (scene_id, renderer_id)
            if key not in seen:
                seen.add(key)
                results.append((image_file, scene_id, renderer_id))

        # Discover PNG files (rasterizers like Filament, or OSPRay scivis).
        for image_file in sorted(scene_dir.glob("*.png")):
            renderer_id = _parse_renderer_id(image_file)
            if renderer_filter and renderer_id != renderer_filter:
                continue
            key = (scene_id, renderer_id)
            if key not in seen:
                seen.add(key)
                results.append((image_file, scene_id, renderer_id))

        # Discover PPM files (OSPRay fallback output).
        for image_file in sorted(scene_dir.glob("*.ppm")):
            renderer_id = _parse_renderer_id(image_file)
            if renderer_filter and renderer_id != renderer_filter:
                continue
            key = (scene_id, renderer_id)
            if key not in seen:
                seen.add(key)
                results.append((image_file, scene_id, renderer_id))

    return results


def _parse_renderer_id(image_file: Path) -> str:
    """Extract the renderer ID from a render output filename.

    Supported patterns:
    - ``<renderer>_<spp>spp.exr``     (path tracers)
    - ``<renderer>_reference.exr``    (reference renders)
    - ``<renderer>_frame.png``        (rasterizers)
    - ``<renderer>_scivis_frame.png`` (OSPRay scivis mode)
    - ``<renderer>.<ext>``            (fallback)
    """
    stem = image_file.stem

    # Remove known suffixes to extract renderer ID.
    if stem.endswith("_frame"):
        # e.g. "filament_frame" -> "filament", "ospray_scivis_frame" -> "ospray_scivis"
        return stem.rsplit("_frame", 1)[0]

    if stem.endswith("spp"):
        # e.g. "pbrt_1024spp" -> "pbrt"
        parts = stem.rsplit("_", 1)
        return parts[0] if len(parts) == 2 else stem

    if stem.endswith("reference"):
        # e.g. "pbrt_reference" -> "pbrt"
        parts = stem.rsplit("_", 1)
        return parts[0] if len(parts) == 2 else stem

    return stem


def discover_exr_files(
    renders_dir: Path,
    scene_filter: str | None = None,
    renderer_filter: str | None = None,
) -> list[tuple[Path, str, str]]:
    """Backwards-compatible alias for :func:`discover_render_images`."""
    return discover_render_images(renders_dir, scene_filter, renderer_filter)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="RenderScope web image pipeline -- render images (EXR/PNG/PPM) to WebP.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python scripts/generate_web_images.py\n"
            "  python scripts/generate_web_images.py --scene cornell-box\n"
            "  python scripts/generate_web_images.py --tonemap aces --quality 95\n"
            "  python scripts/generate_web_images.py --test\n"
        ),
    )
    parser.add_argument(
        "--renders-dir",
        type=Path,
        default=_REPO_ROOT / "assets" / "renders",
        help="Directory containing rendered images (default: assets/renders/).",
    )
    parser.add_argument(
        "--scene",
        type=str,
        default=None,
        help="Process only this scene.",
    )
    parser.add_argument(
        "--renderer",
        type=str,
        default=None,
        help="Process only this renderer.",
    )
    parser.add_argument(
        "--tonemap",
        type=str,
        default="aces",
        choices=list(_TONE_MAP_FUNCS.keys()),
        help="Tone mapping operator for HDR/EXR input (default: aces). LDR images bypass tone mapping.",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=WEBP_QUALITY_FULL,
        help=f"WebP quality for full-size images (default: {WEBP_QUALITY_FULL}).",
    )
    parser.add_argument(
        "--firefly-clamp",
        action="store_true",
        help="Clamp firefly pixels before tone mapping.",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip images that already have WebP output.",
    )
    parser.add_argument(
        "--comparison-strips",
        action="store_true",
        help="Generate comparison strip images (all renderers per scene).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be processed without doing anything.",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run the built-in synthetic image test.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    # ── Test mode ────────────────────────────────────────────────────────
    if args.test:
        run_test()
        return

    # ── Discover render images ──────────────────────────────────────────
    renders_dir: Path = args.renders_dir
    image_files = discover_render_images(renders_dir, args.scene, args.renderer)

    if not image_files:
        console.print("[yellow]No render images found in[/yellow]", str(renders_dir))
        console.print(
            "  Run benchmarks first:  python scripts/run_benchmarks.py\n"
            "  Or check --renders-dir and --scene/--renderer filters."
        )
        return

    # ── Filter existing ──────────────────────────────────────────────────
    if args.skip_existing:
        filtered: list[tuple[Path, str, str]] = []
        for img_path, scene_id, renderer_id in image_files:
            webp_name = f"{renderer_id}_{FULL_WIDTH}x{FULL_HEIGHT}.webp"
            webp_path = img_path.parent / webp_name
            if webp_path.is_file():
                console.print(f"  [dim]Skipping {scene_id}/{renderer_id} -- WebP exists[/dim]")
                continue
            filtered.append((img_path, scene_id, renderer_id))
        image_files = filtered
        if not image_files:
            console.print("[green]All render images already have WebP output.[/green]")
            return

    # ── Dry run ──────────────────────────────────────────────────────────
    if args.dry_run:
        table = Table(title="Web Image Pipeline (Dry Run)", show_header=True, header_style="bold")
        table.add_column("#", justify="right", style="dim")
        table.add_column("Scene")
        table.add_column("Renderer", style="cyan")
        table.add_column("Source File")
        table.add_column("Full-size Output")
        table.add_column("Thumbnail Output")

        for idx, (img_path, scene_id, renderer_id) in enumerate(image_files, 1):
            table.add_row(
                str(idx),
                scene_id,
                renderer_id,
                img_path.name,
                f"{renderer_id}_{FULL_WIDTH}x{FULL_HEIGHT}.webp",
                f"{renderer_id}_{THUMB_WIDTH}x{THUMB_HEIGHT}.webp",
            )

        console.print()
        console.print(table)
        console.print(f"\n  Total files: {len(image_files)}")
        console.print(f"  Tone mapping: {args.tonemap} (EXR only; LDR images bypass tone mapping)")
        console.print()
        return

    # ── Process files ────────────────────────────────────────────────────
    console.print()
    console.print("[bold bright_blue]RenderScope Web Image Pipeline[/bold bright_blue]")
    console.print(f"  Tone mapping: {args.tonemap} (HDR/EXR only)")
    console.print(f"  WebP quality: {args.quality}")
    console.print(f"  Files to process: {len(image_files)}")
    console.print()

    # Override global quality if specified.
    global WEBP_QUALITY_FULL  # noqa: PLW0603
    if args.quality != WEBP_QUALITY_FULL:
        WEBP_QUALITY_FULL = args.quality

    processed_scenes: dict[str, list[str]] = {}  # scene_id -> [renderer_ids]

    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}[/bold blue]"),
        BarColumn(bar_width=30),
        TextColumn("{task.completed}/{task.total}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Processing...", total=len(image_files))

        for img_path, scene_id, renderer_id in image_files:
            progress.update(task, description=f"{scene_id}/{renderer_id}")

            try:
                full, thumb = process_image(
                    img_path,
                    img_path.parent,
                    renderer_id,
                    tonemap_name=args.tonemap,
                    firefly_clamp=args.firefly_clamp,
                )
                fmt_tag = "HDR" if img_path.suffix.lower() == ".exr" else "LDR"
                console.print(
                    f"  [green]\u2713[/green] {scene_id}/{renderer_id} ({fmt_tag}): "
                    f"{full.name} ({full.stat().st_size // 1024} KB), "
                    f"{thumb.name} ({thumb.stat().st_size // 1024} KB)"
                )
                processed_scenes.setdefault(scene_id, []).append(renderer_id)
            except Exception as exc:
                console.print(f"  [red]\u2717 {scene_id}/{renderer_id}: {exc}[/red]")

            progress.advance(task)

    # ── Comparison strips ────────────────────────────────────────────────
    if args.comparison_strips and processed_scenes:
        console.print()
        console.print("[bold]Generating comparison strips...[/bold]")
        for scene_id, renderer_ids in sorted(processed_scenes.items()):
            scene_dir = renders_dir / scene_id
            strip_path = scene_dir / "comparison_strip.webp"
            generate_comparison_strip(scene_dir, sorted(renderer_ids), strip_path)
            console.print(
                f"  [green]\u2713[/green] {scene_id}: {len(renderer_ids)} renderers → {strip_path.name}"
            )

    console.print()
    total = sum(len(v) for v in processed_scenes.values())
    console.print(f"[green]Done.[/green] Processed {total} images across {len(processed_scenes)} scenes.")


if __name__ == "__main__":
    main()
