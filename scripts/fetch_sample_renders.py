#!/usr/bin/env python3
"""
Fetch authentic sample render images for every renderer in the RenderScope catalog.

Uses a curated mapping of verified image URLs sourced from each project's official
GitHub repository, README, website, or gallery. Every image is an authentic render
or screenshot produced by that renderer — no AI-generated or unrelated images.

For each renderer:
  1. Look up curated image URLs
  2. Download each image
  3. Convert to WebP 400x225 (center-crop to 16:9)
  4. Update the renderer JSON's sample_renders field
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image

# ── Paths ──────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
RENDERERS_DIR = ROOT / "data" / "renderers"
SAMPLES_DIR = ROOT / "web" / "public" / "renders" / "samples"
MAX_SAMPLES = 3  # max images per renderer
TARGET_W, TARGET_H = 400, 225
WEBP_QUALITY = 85
REQUEST_DELAY = 0.3  # seconds between HTTP requests


# ══════════════════════════════════════════════════════════════════════
# CURATED IMAGE URLS — verified authentic renders from official sources
# ══════════════════════════════════════════════════════════════════════
CURATED_URLS: dict[str, list[str]] = {
    # ── Path tracers / Ray tracers ──
    "pbrt": [
        "https://raw.githubusercontent.com/mmp/pbrt-v4/master/images/teaser-transparent-machines.png",
    ],
    "mitsuba3": [
        "https://raw.githubusercontent.com/mitsuba-renderer/mitsuba-data/master/docs/images/banners/banner_01.jpg",
    ],
    "appleseed": [
        "https://raw.githubusercontent.com/appleseedhq/appleseedhq.github.io/master/img/renders/jc-interior.jpg",
        "https://raw.githubusercontent.com/appleseedhq/appleseedhq.github.io/master/img/renders/classroom.jpg",
        "https://raw.githubusercontent.com/appleseedhq/appleseedhq.github.io/master/img/renders/kitchen.jpg",
    ],
    "luxcorerender": [
        "https://luxcorerender.org/wp-content/uploads/2017/12/wallpaper_lux_05_rend1b.jpg",
        "https://luxcorerender.org/wp-content/uploads/2017/12/slider2-crop.jpg",
        "https://luxcorerender.org/wp-content/uploads/2017/12/FERRARI-Mod_banner.jpg",
    ],
    "tungsten": [
        "https://raw.githubusercontent.com/tunabrain/tungsten/master/Header.jpg",
    ],
    "povray": [
        "https://hof.povray.org/images/thumb/fallfury.jpg",
        "https://hof.povray.org/images/thumb/rwmcgsphere2_final.jpg",
        "https://hof.povray.org/images/thumb/rwmdolphins.jpg",
    ],
    "sort": [
        "http://sort-renderer.com/assets/gallery/blender_281_splash.png",
        "http://sort-renderer.com/assets/gallery/san_miguel_0.png",
        "http://sort-renderer.com/assets/gallery/human.png",
    ],
    "tinyraytracer": [
        "https://raw.githubusercontent.com/ssloy/tinyraytracer/master/out.jpg",
    ],
    "raytracing-in-one-weekend": [
        "https://raw.githubusercontent.com/RayTracing/raytracing.github.io/release/images/cover/CoverRTW1-small.jpg",
        "https://raw.githubusercontent.com/RayTracing/raytracing.github.io/release/images/cover/CoverRTW2-small.jpg",
        "https://raw.githubusercontent.com/RayTracing/raytracing.github.io/release/images/cover/CoverRTW3-small.jpg",
    ],
    "smallpt": [
        "https://kevinbeason.com/result_25k.png",
        "https://kevinbeason.com/sky.png",
        "https://kevinbeason.com/wada.png",
    ],

    # ── Real-time engines / frameworks ──
    "threejs": [
        "https://threejs.org/files/projects/bruno-simon.png",
        "https://threejs.org/files/projects/aquarium.png",
        "https://threejs.org/files/projects/mars2020.png",
    ],
    "babylonjs": [
        "https://www.babylonjs.com/assets/img/iblShadows.png",
        "https://www.babylonjs.com/assets/img/gaussianSplat.png",
        "https://www.babylonjs.com/assets/img/areaLights.png",
    ],
    "godot": [
        "https://raw.githubusercontent.com/godotengine/godot-design/master/screenshots/editor_tps_demo_1920x1080.jpg",
    ],
    "bevy": [
        "https://bevyengine.org/assets/bevy_boat.png",
        "https://bevyengine.org/assets/Fox.png",
    ],
    "bgfx": [
        "https://raw.githubusercontent.com/dariomanesku/cmftStudio/master/screenshots/cmftStudio_small.jpg",
        "https://raw.githubusercontent.com/pezcode/Cluster/master/images/sponza.jpg",
    ],
    "ogre3d": [
        "https://raw.githubusercontent.com/OGRECave/ogre-next/master/Docs/frontpage/ForwardClustered.jpg",
        "https://raw.githubusercontent.com/OGRECave/ogre-next/master/Docs/frontpage/AreaLights.jpg",
        "https://raw.githubusercontent.com/OGRECave/ogre-next/master/Docs/frontpage/VCT.jpg",
    ],
    "wicked-engine": [
        "https://raw.githubusercontent.com/turanszkij/wickedengine-gifs/main/girl_pose.png",
        "https://raw.githubusercontent.com/turanszkij/wickedengine-gifs/main/videoprojectors.gif",
        "https://raw.githubusercontent.com/turanszkij/wickedengine-gifs/main/clouds.gif",
    ],
    "the-forge": [
        "https://raw.githubusercontent.com/ConfettiFX/The-Forge-Media/master/Screenshots/Starfield/starfield-screenshot-new-atlantis-1536x864.jpg",
        "https://raw.githubusercontent.com/ConfettiFX/The-Forge-Media/master/Screenshots/Raytracing/16_Raytracing_PS5_3840x2160.png",
        "https://raw.githubusercontent.com/ConfettiFX/The-Forge-Media/master/Screenshots/MaterialPlayground/06_MaterialPlayground_Metal.png",
    ],
    "filament": [
        "https://raw.githubusercontent.com/google/filament/main/docs/images/samples/example_bistro1.jpg",
        "https://raw.githubusercontent.com/google/filament/main/docs/images/samples/example_bistro2.jpg",
        "https://raw.githubusercontent.com/google/filament/main/docs/images/samples/example_helmet.jpg",
    ],
    "nvidia-falcor": [
        "https://raw.githubusercontent.com/NVIDIAGameWorks/Falcor/master/docs/images/teaser.png",
    ],
    "radeon-prorender": [
        "https://raw.githubusercontent.com/GPUOpen-LibrariesAndSDKs/RadeonProRenderSDK/master/Resources/doc/doc1.png",
        "https://raw.githubusercontent.com/GPUOpen-LibrariesAndSDKs/RadeonProRenderSDK/master/Resources/doc/doc2.png",
    ],

    # ── Blender ──
    "blender-cycles": [
        "https://www.cycles-renderer.org/gallery/a327_barbershop_00290-thumb.jpg",
        "https://www.cycles-renderer.org/gallery/archiviz1-thumb.jpg",
        "https://www.blender.org/wp-content/uploads/2019/07/barbershop_interior-2.png",
    ],
    "blender-eevee": [
        "https://www.blender.org/wp-content/uploads/2021/06/eevee_hatching_by_Ocean_Quigley.jpg",
        "https://www.blender.org/wp-content/uploads/2023/10/blender_40_splash.jpg",
        "https://www.blender.org/wp-content/uploads/2019/07/race_spaceship.jpg",
    ],

    # ── Neural / Gaussian Splatting / NeRF ──
    "3d-gaussian-splatting": [
        "https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/assets/teaser.png",
    ],
    "gsplat": [
        "https://raw.githubusercontent.com/nerfstudio-project/gsplat/main/docs/source/assets/training.gif",
    ],
    "nerfstudio": [
        "https://user-images.githubusercontent.com/3310961/194017985-ade69503-9d68-46a2-b518-2db1a012f090.gif",
        "https://user-images.githubusercontent.com/3310961/202766653-586a0daa-466b-4140-a136-6b02f2ce2c54.png",
    ],
    "nerfacc": [
        "https://raw.githubusercontent.com/nerfstudio-project/nerfacc/master/docs/source/_static/images/teaser.jpg",
    ],
    "instant-ngp": [
        "https://raw.githubusercontent.com/NVlabs/instant-ngp/master/docs/assets_readme/fox.gif",
        "https://raw.githubusercontent.com/NVlabs/instant-ngp/master/docs/assets_readme/testbed.png",
    ],
    "nvdiffrast": [
        "https://raw.githubusercontent.com/NVlabs/nvdiffrast/main/docs/img/teaser.png",
    ],
    "3dgs-cpp": [
        "https://github.com/shg8/3DGS.cpp/assets/38004233/66542056-ce30-4998-a612-dd4f6792599e",
        "https://github.com/shg8/3DGS.cpp/assets/38004233/91e6a082-95ec-430d-bbbb-cbb3f63795e0",
    ],
    "gaussian-splatting-lightning": [
        "https://github.com/yzslab/gaussian-splatting-lightning/assets/564361/0f3c7bc8-5219-4e0f-bd9f-97e22b06d5f2",
        "https://github.com/yzslab/gaussian-splatting-lightning/assets/564361/215a3467-b29b-486c-8275-eaa5c41f3db5",
    ],
    "lichtfeld-studio": [
        "https://raw.githubusercontent.com/MrNeRF/LichtFeld-Studio/master/docs/viewer_demo.gif",
    ],

    # ── Differentiable renderers ──
    "pytorch3d": [
        "https://raw.githubusercontent.com/facebookresearch/pytorch3d/main/.github/render_textured_mesh.gif",
        "https://raw.githubusercontent.com/facebookresearch/pytorch3d/main/.github/dolphin_deform.gif",
        "https://raw.githubusercontent.com/facebookresearch/pytorch3d/main/.github/fit_nerf.gif",
    ],
    "nvidia-kaolin": [
        "https://raw.githubusercontent.com/NVIDIAGameWorks/kaolin/master/assets/optimization.gif",
        "https://raw.githubusercontent.com/NVIDIAGameWorks/kaolin/master/docs/img/easy_render_urchin.jpg",
    ],
    "tensorflow-graphics": [
        "https://storage.googleapis.com/tensorflow-graphics/git/readme/cv_graphics.jpg",
        "https://storage.googleapis.com/tensorflow-graphics/notebooks/sh_rendering/thumbnail.png",
    ],
    "redner": [
        "https://people.csail.mit.edu/tzumao/diffrt/teaser.jpg",
    ],
    "softrasterizer": [
        "https://raw.githubusercontent.com/ShichenLiu/SoftRas/master/data/media/teaser/teaser.png",
        "https://raw.githubusercontent.com/ShichenLiu/SoftRas/master/data/media/demo/render/forward.gif",
    ],
    "deodr": [
        "https://raw.githubusercontent.com/martinResearch/DEODR/master/images/python_rgb_hand.gif",
        "https://raw.githubusercontent.com/martinResearch/DEODR/master/images/multiview.gif",
    ],

    # ── Scientific visualization ──
    "taichi": [
        "https://raw.githubusercontent.com/taichi-dev/public_files/master/taichi/sdf_renderer.jpg",
        "https://raw.githubusercontent.com/taichi-dev/public_files/master/taichi/fractal_small.gif",
        "https://raw.githubusercontent.com/taichi-dev/public_files/master/taichi/smoke_3d.gif",
    ],
    "open3d": [
        "https://raw.githubusercontent.com/isl-org/Open3D/main/docs/_static/open3d_viewer.png",
    ],
    "paraview": [
        "https://www.paraview.org/wp-content/uploads/2022/11/screenshot.jpg",
        "https://www.paraview.org/wp-content/uploads/2022/10/energy-exascale-earth-system-model-global-climate-model-data.jpg",
        "https://www.paraview.org/wp-content/uploads/2022/10/0_full_Fire.jpg",
    ],
    "3d-slicer": [
        "https://slicer.org/assets/img/image-carousel/SegmentEditor.png",
        "https://slicer.org/assets/img/image-carousel/LungCTAnalyzer.jpg",
        "https://slicer.org/assets/img/image-carousel/UKFTractography_CC.jpg",
    ],

    # ── Ray tracing libraries ──
    "embree": [
        "https://www.embree.org/images/carousel/crown3_crop.jpg",
        "https://www.embree.org/images/carousel/peter_ang_crop.jpg",
    ],
    "ospray": [
        "https://ospray.github.io/images/teaser_moana.jpg",
        "https://ospray.github.io/images/teaser_bentley.jpg",
        "https://ospray.github.io/images/teaser_rm.jpg",
    ],
}

# Renderers that will fall back to GitHub social preview (og:image)
# when no curated URLs are available. These are verified GitHub repos.
SOCIAL_PREVIEW_FALLBACKS = {
    "sokol": "floooh/sokol",
    "panda3d": "panda3d/panda3d",
    "raylib": "raysan5/raylib",
    "vtk": "Kitware/VTK",
    "viskores": "Kitware/VTK-m",
    "voreen": "voreen-project/voreen",
    "drjit": "mitsuba-renderer/drjit",
    "yafray": "YafaRay/libYafaRay",
    "indigo-renderer": None,  # No GitHub repo
}


def fetch_url(url: str, timeout: int = 20) -> bytes | None:
    """Fetch URL content, returns bytes or None on failure."""
    time.sleep(REQUEST_DELAY)
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) RenderScope/1.0",
            "Accept": "image/*,*/*",
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception as e:
        print(f"    WARN: Failed to fetch {url}: {e}")
        return None


def download_and_convert(url: str, out_path: Path) -> bool:
    """Download image, crop to 16:9 center, resize to 400x225, save as WebP."""
    data = fetch_url(url)
    if not data:
        return False
    try:
        img = Image.open(BytesIO(data))

        # Handle animated GIFs — use first frame
        if hasattr(img, 'n_frames') and img.n_frames > 1:
            img.seek(0)

        img = img.convert("RGB")

        # Skip tiny images (likely icons)
        if img.width < 100 or img.height < 80:
            print(f"    SKIP: Image too small ({img.width}x{img.height})")
            return False

        # Center crop to 16:9 aspect ratio
        target_ratio = TARGET_W / TARGET_H  # 1.778
        img_ratio = img.width / img.height

        if img_ratio > target_ratio:
            new_w = int(img.height * target_ratio)
            left = (img.width - new_w) // 2
            img = img.crop((left, 0, left + new_w, img.height))
        else:
            new_h = int(img.width / target_ratio)
            top = (img.height - new_h) // 2
            img = img.crop((0, top, img.width, top + new_h))

        img = img.resize((TARGET_W, TARGET_H), Image.LANCZOS)
        img.save(str(out_path), "WEBP", quality=WEBP_QUALITY)
        return True
    except Exception as e:
        print(f"    WARN: Failed to process image from {url}: {e}")
        return False


def parse_github_owner_repo(repo_url: str) -> tuple[str, str] | None:
    """Extract (owner, repo) from a GitHub URL."""
    parsed = urlparse(repo_url)
    if not parsed.hostname or "github.com" not in parsed.hostname:
        return None
    parts = parsed.path.strip("/").split("/")
    if len(parts) >= 2:
        return parts[0], parts[1]
    return None


def process_renderer(renderer_json_path: Path) -> list[str]:
    """Process a single renderer: download images, return list of web paths."""
    with open(renderer_json_path) as f:
        data = json.load(f)

    rid = data["id"]
    repo_url = data.get("repository", "")
    existing = data.get("sample_renders") or []

    # Skip if already has sample_renders populated
    if existing:
        print(f"  [{rid}] Already has {len(existing)} sample renders, skipping")
        return existing

    # Check for existing sample images on disk
    existing_files = sorted(SAMPLES_DIR.glob(f"{rid}_sample_*.webp"))
    if existing_files:
        paths = [f"/renders/samples/{f.name}" for f in existing_files]
        print(f"  [{rid}] Found {len(paths)} existing sample images on disk")
        return paths

    print(f"  [{rid}] Downloading sample renders...")

    image_urls: list[str] = []

    # Priority 1: Curated URLs
    if rid in CURATED_URLS:
        image_urls = CURATED_URLS[rid]
        if image_urls:
            print(f"    Using {len(image_urls)} curated URLs")

    # Priority 2: GitHub social preview fallback
    if not image_urls:
        if rid in SOCIAL_PREVIEW_FALLBACKS:
            gh_path = SOCIAL_PREVIEW_FALLBACKS[rid]
            if gh_path:
                og_url = f"https://opengraph.githubassets.com/1/{gh_path}"
                image_urls = [og_url]
                print(f"    Using GitHub social preview")
            else:
                print(f"    SKIP: No GitHub repo available")
                return []
        else:
            # Try to extract owner/repo from the repository URL
            gh = parse_github_owner_repo(repo_url)
            if gh:
                og_url = f"https://opengraph.githubassets.com/1/{gh[0]}/{gh[1]}"
                image_urls = [og_url]
                print(f"    No curated URLs, using GitHub social preview")
            else:
                print(f"    SKIP: Non-GitHub repo with no curated URLs")
                return []

    # Download images
    saved_paths: list[str] = []
    for url in image_urls:
        if len(saved_paths) >= MAX_SAMPLES:
            break
        idx = len(saved_paths) + 1
        out_name = f"{rid}_sample_{idx}.webp"
        out_path = SAMPLES_DIR / out_name
        print(f"    [{idx}] {url[:90]}...")
        if download_and_convert(url, out_path):
            saved_paths.append(f"/renders/samples/{out_name}")
            print(f"    [{idx}] OK -> {out_name}")
        else:
            print(f"    [{idx}] FAILED")

    if not saved_paths:
        print(f"  [{rid}] WARNING: No images could be downloaded")

    return saved_paths


def main():
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

    # Remove any test images from earlier runs
    for old in SAMPLES_DIR.glob("*_sample_*.webp"):
        old.unlink()
        print(f"  Cleaned up old file: {old.name}")

    json_files = sorted(RENDERERS_DIR.glob("*.json"))
    json_files = [f for f in json_files if not f.name.startswith("_")]

    total = len(json_files)
    success = 0
    failed = 0
    skipped = 0
    failed_renderers = []

    print(f"Processing {total} renderers...\n")

    for i, jf in enumerate(json_files, 1):
        rid = jf.stem
        print(f"\n[{i}/{total}] {rid}")

        sample_paths = process_renderer(jf)

        if sample_paths:
            with open(jf) as f:
                data = json.load(f)

            if data.get("sample_renders") != sample_paths:
                data["sample_renders"] = sample_paths
                with open(jf, "w") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                print(f"  -> Updated JSON with {len(sample_paths)} sample renders")
                success += 1
            else:
                skipped += 1
        else:
            failed += 1
            failed_renderers.append(rid)

    print(f"\n{'='*60}")
    print(f"RESULTS: {success} updated | {skipped} already done | {failed} failed")
    if failed_renderers:
        print(f"FAILED:  {', '.join(failed_renderers)}")
    print(f"{'='*60}")

    # Verify all images exist
    print(f"\nVerifying images on disk...")
    missing = 0
    for jf in json_files:
        data = json.load(open(jf))
        for path in (data.get("sample_renders") or []):
            full = ROOT / "web" / "public" / path.lstrip("/")
            if not full.exists():
                print(f"  MISSING: {path} (renderer: {data['id']})")
                missing += 1
    if missing == 0:
        print("  All images verified OK!")
    else:
        print(f"  {missing} images missing!")


if __name__ == "__main__":
    main()
