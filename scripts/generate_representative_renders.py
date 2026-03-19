#!/usr/bin/env python3
"""
Generate representative WebP render images for the web app.

Since Phase 27 (actual render execution) has not yet been run, this script
generates visually distinct, professional-looking placeholder WebP images
for every renderer×scene combination that has benchmark data.

Each image uses a deterministic color palette based on the scene and renderer,
with noise, gradients, and geometric elements that evoke the feel of a
real rendered scene. The images are clearly different per renderer/scene
combination, making them useful for visual comparison demonstrations.

Output structure:
  assets/renders/<scene>/thumbnail.webp          (400×225)
  assets/renders/<scene>/<renderer>_400x225.webp  (400×225)
  assets/renders/<scene>/<renderer>_1920x1080.webp (1920×1080)

Usage:
  python scripts/generate_representative_renders.py
"""

import json
import hashlib
import math
import os
import struct
import glob
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    print("ERROR: Pillow is required. Install with: pip install Pillow")
    raise SystemExit(1)

# ── Directories ──────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
BENCHMARKS_DIR = ROOT / "data" / "benchmarks"
SCENES_DIR = ROOT / "data" / "scenes"
OUTPUT_DIR = ROOT / "assets" / "renders"

# ── Scene Color Palettes ─────────────────────────────────────

SCENE_PALETTES: dict[str, dict[str, tuple[int, int, int]]] = {
    "cornell-box": {
        "bg": (180, 120, 80),
        "accent1": (200, 50, 50),
        "accent2": (50, 180, 50),
        "light": (255, 245, 220),
    },
    "sponza": {
        "bg": (140, 130, 100),
        "accent1": (200, 180, 140),
        "accent2": (80, 90, 70),
        "light": (240, 230, 200),
    },
    "stanford-bunny": {
        "bg": (60, 80, 120),
        "accent1": (180, 190, 200),
        "accent2": (100, 120, 160),
        "light": (220, 230, 245),
    },
    "classroom": {
        "bg": (100, 80, 60),
        "accent1": (180, 150, 100),
        "accent2": (60, 80, 50),
        "light": (250, 240, 210),
    },
    "bmw": {
        "bg": (40, 40, 50),
        "accent1": (160, 160, 180),
        "accent2": (80, 100, 140),
        "light": (230, 230, 240),
    },
    "san-miguel": {
        "bg": (130, 110, 70),
        "accent1": (70, 120, 50),
        "accent2": (200, 170, 120),
        "light": (250, 240, 200),
    },
    "veach-mis": {
        "bg": (50, 50, 70),
        "accent1": (200, 180, 100),
        "accent2": (100, 80, 140),
        "light": (240, 235, 220),
    },
}

DEFAULT_PALETTE = {
    "bg": (80, 80, 100),
    "accent1": (160, 140, 180),
    "accent2": (100, 120, 140),
    "light": (230, 230, 240),
}

# ── Renderer Tint Offsets ────────────────────────────────────

def renderer_hash(renderer_id: str) -> int:
    """Deterministic hash for a renderer ID."""
    h = hashlib.md5(renderer_id.encode()).digest()
    return struct.unpack("<I", h[:4])[0]


def renderer_tint(renderer_id: str) -> tuple[int, int, int]:
    """Small color tint unique per renderer (applied to all scene images)."""
    h = renderer_hash(renderer_id)
    r = ((h >> 0) & 0xFF) % 40 - 20
    g = ((h >> 8) & 0xFF) % 40 - 20
    b = ((h >> 16) & 0xFF) % 40 - 20
    return (r, g, b)


def noise_seed(renderer_id: str, scene_id: str) -> int:
    """Deterministic seed for noise generation."""
    combined = f"{scene_id}:{renderer_id}"
    h = hashlib.md5(combined.encode()).digest()
    return struct.unpack("<I", h[:4])[0]


# ── Image Generation ─────────────────────────────────────────

def clamp(v: int, lo: int = 0, hi: int = 255) -> int:
    return max(lo, min(hi, v))


def generate_render_image(
    scene_id: str,
    renderer_id: str,
    width: int,
    height: int,
    is_thumbnail: bool = False,
) -> Image.Image:
    """
    Generate a representative render image for a scene×renderer combination.
    Uses gradients, geometric shapes, and noise to create distinct images.
    """
    palette = SCENE_PALETTES.get(scene_id, DEFAULT_PALETTE)
    tint = renderer_tint(renderer_id)
    seed = noise_seed(renderer_id, scene_id)

    # Apply renderer tint to palette
    bg = tuple(clamp(palette["bg"][i] + tint[i]) for i in range(3))
    accent1 = tuple(clamp(palette["accent1"][i] + tint[i] // 2) for i in range(3))
    accent2 = tuple(clamp(palette["accent2"][i] - tint[i] // 2) for i in range(3))
    light = palette["light"]

    img = Image.new("RGB", (width, height), bg)  # type: ignore[arg-type]
    draw = ImageDraw.Draw(img)

    # ── Background gradient ──
    for y in range(height):
        t = y / height
        r = clamp(int(bg[0] * (1 - t * 0.4) + accent2[0] * t * 0.4))
        g = clamp(int(bg[1] * (1 - t * 0.3) + accent2[1] * t * 0.3))
        b = clamp(int(bg[2] * (1 - t * 0.5) + accent2[2] * t * 0.5))
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # ── Scene-specific geometric elements ──
    rng = seed

    def next_rng() -> int:
        nonlocal rng
        rng = (rng * 1103515245 + 12345) & 0x7FFFFFFF
        return rng

    # Add soft circles (simulating light sources / objects)
    num_circles = 3 + (next_rng() % 4)
    for _ in range(num_circles):
        cx = next_rng() % width
        cy = next_rng() % height
        radius = 30 + next_rng() % (min(width, height) // 4)
        opacity = 20 + next_rng() % 30

        # Create a soft circle overlay
        circle_color = accent1 if next_rng() % 2 == 0 else accent2
        for ring in range(radius, 0, -2):
            alpha = int(opacity * (ring / radius))
            r = clamp(int(circle_color[0] + (light[0] - circle_color[0]) * (1 - ring / radius) * 0.3))
            g = clamp(int(circle_color[1] + (light[1] - circle_color[1]) * (1 - ring / radius) * 0.3))
            b = clamp(int(circle_color[2] + (light[2] - circle_color[2]) * (1 - ring / radius) * 0.3))
            draw.ellipse(
                [cx - ring, cy - ring, cx + ring, cy + ring],
                fill=(r, g, b, alpha),  # type: ignore[arg-type]
                outline=None,
            )

    # Add rectangular shapes (simulating walls / objects)
    num_rects = 2 + next_rng() % 3
    for _ in range(num_rects):
        x1 = next_rng() % (width * 3 // 4)
        y1 = next_rng() % (height * 3 // 4)
        x2 = x1 + 50 + next_rng() % (width // 3)
        y2 = y1 + 50 + next_rng() % (height // 3)
        rect_color = (
            clamp(accent1[0] + next_rng() % 30 - 15),
            clamp(accent1[1] + next_rng() % 30 - 15),
            clamp(accent1[2] + next_rng() % 30 - 15),
        )
        draw.rectangle([x1, y1, x2, y2], fill=rect_color)  # type: ignore[arg-type]

    # ── Light source glow ──
    light_x = width * 3 // 8 + next_rng() % (width // 4)
    light_y = height // 8 + next_rng() % (height // 6)
    for radius in range(min(width, height) // 3, 0, -3):
        t = radius / (min(width, height) // 3)
        alpha = int(15 * t)
        r = clamp(int(light[0] * (1 - t) + bg[0] * t))
        g_val = clamp(int(light[1] * (1 - t) + bg[1] * t))
        b_val = clamp(int(light[2] * (1 - t) + bg[2] * t))
        draw.ellipse(
            [light_x - radius, light_y - radius, light_x + radius, light_y + radius],
            fill=(r, g_val, b_val),
        )

    # ── Apply Gaussian blur for smooth, render-like appearance ──
    blur_radius = 8 if width >= 1920 else 4
    img = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # ── Add subtle noise (simulates render noise) ──
    # Create noise layer
    noise_img = Image.new("RGB", (width, height))
    noise_pixels = noise_img.load()
    if noise_pixels is not None:
        noise_rng = seed ^ 0xDEADBEEF
        noise_intensity = 8 + (renderer_hash(renderer_id) % 12)  # Different noise per renderer
        for y in range(0, height, 2):
            for x in range(0, width, 2):
                noise_rng = (noise_rng * 1103515245 + 12345) & 0x7FFFFFFF
                n = (noise_rng % (noise_intensity * 2)) - noise_intensity
                noise_pixels[x, y] = (clamp(128 + n), clamp(128 + n), clamp(128 + n))
                # Fill neighboring pixels for speed
                if x + 1 < width:
                    noise_pixels[x + 1, y] = noise_pixels[x, y]
                if y + 1 < height:
                    noise_pixels[x, y + 1] = noise_pixels[x, y]
                    if x + 1 < width:
                        noise_pixels[x + 1, y + 1] = noise_pixels[x, y]

    # Blend noise with image
    from PIL import ImageChops
    noise_img = noise_img.filter(ImageFilter.GaussianBlur(radius=1))
    img = ImageChops.add(img, noise_img, scale=4, offset=-32)

    # ── Add renderer label (bottom-left) ──
    if not is_thumbnail:
        try:
            font = ImageFont.truetype("arial.ttf", max(16, width // 80))
        except (OSError, IOError):
            font = ImageFont.load_default()

        label = f"{renderer_id.upper()}  •  {scene_id}"
        # Shadow
        draw2 = ImageDraw.Draw(img)
        draw2.text((12, height - 36), label, fill=(0, 0, 0, 180), font=font)  # type: ignore[arg-type]
        draw2.text((10, height - 38), label, fill=(255, 255, 255, 200), font=font)  # type: ignore[arg-type]

    return img


def generate_scene_thumbnail(scene_id: str, width: int, height: int) -> Image.Image:
    """Generate a scene thumbnail (not renderer-specific)."""
    # Use a neutral "reference" look
    return generate_render_image(scene_id, "__reference__", width, height, is_thumbnail=True)


# ── Main ─────────────────────────────────────────────────────

def main() -> None:
    print("=" * 60)
    print("  RenderScope — Generate Representative Render Images")
    print("=" * 60)

    # 1. Discover all renderer×scene combinations from benchmark data
    benchmark_files = sorted(glob.glob(str(BENCHMARKS_DIR / "*.json")))
    if not benchmark_files:
        print(f"ERROR: No benchmark files found in {BENCHMARKS_DIR}")
        raise SystemExit(1)

    scene_renderers: dict[str, set[str]] = {}
    for filepath in benchmark_files:
        with open(filepath) as f:
            data = json.load(f)
        scene_id = data["scene"]
        renderer_id = data["renderer"]
        if scene_id not in scene_renderers:
            scene_renderers[scene_id] = set()
        scene_renderers[scene_id].add(renderer_id)

    total_images = 0
    for scene_id, renderers in sorted(scene_renderers.items()):
        scene_dir = OUTPUT_DIR / scene_id
        scene_dir.mkdir(parents=True, exist_ok=True)

        # Scene thumbnail
        thumb = generate_scene_thumbnail(scene_id, 400, 225)
        thumb_path = scene_dir / "thumbnail.webp"
        thumb.save(str(thumb_path), "WEBP", quality=85)
        total_images += 1
        print(f"  [thumb] {thumb_path.relative_to(ROOT)}")

        for renderer_id in sorted(renderers):
            # Thumbnail (400×225)
            img_thumb = generate_render_image(scene_id, renderer_id, 400, 225, is_thumbnail=True)
            thumb_name = f"{renderer_id}_400x225.webp"
            img_thumb.save(str(scene_dir / thumb_name), "WEBP", quality=85)
            total_images += 1

            # Web display (1920×1080)
            img_web = generate_render_image(scene_id, renderer_id, 1920, 1080)
            web_name = f"{renderer_id}_1920x1080.webp"
            img_web.save(str(scene_dir / web_name), "WEBP", quality=90)
            total_images += 1

            print(f"  [{renderer_id}] {scene_id}: thumb + web")

    print(f"\nDone. Generated {total_images} images across {len(scene_renderers)} scenes.")
    print(f"Output: {OUTPUT_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
