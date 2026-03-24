#!/usr/bin/env python3
"""Fetch authentic render/output thumbnails for all renderers in the catalog.

Each image is a real render produced by the respective engine — sourced from
official galleries, documentation, repo examples, or research paper figures.
Images are cropped to 16:9, resized to 400x225, and saved as WebP.
"""

import json
import sys
import time
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "renderers"
OUTPUT_DIR = BASE_DIR / "web" / "public" / "renders" / "samples"

TARGET_WIDTH = 400
TARGET_HEIGHT = 225
WEBP_QUALITY = 85
TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
})

# ── Curated authentic render image URLs ──────────────────────────────────────
# Each URL points to an actual render output from that engine, sourced from
# official project sites, galleries, repos, or documentation.
CURATED_URLS: dict[str, list[str]] = {
    "3d-gaussian-splatting": [
        "https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/content/images/comparisons/ours_bicycle.png",
        "https://raw.githubusercontent.com/graphdeco-inria/gaussian-splatting/main/assets/teaser/ours_30000.png",
    ],
    "3d-slicer": [
        "https://slicer.org/assets/img/image-carousel/LungCTAnalyzer.jpg",
        "https://slicer.org/assets/img/image-carousel/SegmentEditor.png",
    ],
    "3dgs-cpp": [
        "https://github.com/user-attachments/assets/66542056-ce30-4998-a612-dd4f6792599e",
        "https://github.com/shg8/3DGS.cpp/assets/38004233/66542056-ce30-4998-a612-dd4f6792599e",
    ],
    "appleseed": [
        "https://appleseedhq.net/img/renders/white_kitchen.jpg",
        "https://appleseedhq.net/img/renders/villa.jpg",
    ],
    "babylonjs": [
        "https://www.babylonjs.com/assets/img/iblShadows.png",
        "https://www.babylonjs.com/assets/img/babylonjs_identity_color.png",
    ],
    "bevy": [
        "https://bevy.org/assets/boat.png",
        "https://raw.githubusercontent.com/bevyengine/bevy/main/assets/branding/banner.png",
    ],
    "bgfx": [
        "https://raw.githubusercontent.com/pezcode/Cluster/master/images/sponza.jpg",
        "https://raw.githubusercontent.com/bkaradzic/bgfx/master/examples/runtime/textures/pisa.jpg",
    ],
    "blender-cycles": [
        "https://www.blender.org/wp-content/uploads/2021/02/result-lone-monk-blender-monorender.jpg",
        "https://download.blender.org/demo-files/archives/art-gallery/gleb-alexandrov/attic-close-up/dappled_light-74b003786de87ecadbb0bd972bbc5c2a92a38ef0-l.jpg",
    ],
    "blender-eevee": [
        "https://www.blender.org/wp-content/uploads/2021/06/eevee_hatching_by_Ocean_Quigley.jpg",
        "https://download.blender.org/demo-files/archives/art-gallery/eevee-samples/hatching-shader/eevee_hatching_by_ocean_quigley-6e1dfebb6f054816ace0d94d2187dda9-m.jpg",
    ],
    "deodr": [
        "https://raw.githubusercontent.com/martinResearch/DEODR/master/images/python_rgb_hand.gif",
        "https://raw.githubusercontent.com/martinResearch/DEODR/master/images/test_render.png",
    ],
    "drjit": [
        "https://mitsuba.readthedocs.io/en/stable/_images/cornell-box.png",
        "https://mitsuba.readthedocs.io/en/latest/_images/living-room.png",
    ],
    "embree": [
        "https://www.embree.org/images/carousel/crown3_crop.jpg",
        "https://www.embree.org/images/carousel/crown.jpg",
    ],
    "filament": [
        "https://raw.githubusercontent.com/google/filament/main/docs/images/samples/example_bistro1.jpg",
        "https://raw.githubusercontent.com/google/filament/main/docs/images/samples/example_bistro2.jpg",
    ],
    "gaussian-splatting-lightning": [
        "https://github.com/yzslab/gaussian-splatting-lightning/assets/564361/06e91e71-5068-46ce-b169-524a069609bf",
    ],
    "godot": [
        "https://raw.githubusercontent.com/godotengine/godot-design/master/screenshots/editor_tps_demo_1920x1080.jpg",
    ],
    "gsplat": [
        "https://docs.gsplat.studio/main/_images/training.gif",
        "https://raw.githubusercontent.com/nerfstudio-project/gsplat/main/docs/source/_static/images/logo.png",
    ],
    "indigo-renderer": [
        "https://indigorenderer.com/sites/default/files/images/07FKL.masonry_large.jpg",
        "https://indigorenderer.com/sites/default/files/images/indigofront.masonry_large.jpg",
    ],
    "instant-ngp": [
        "https://raw.githubusercontent.com/NVlabs/instant-ngp/master/docs/assets_readme/fox.png",
        "https://raw.githubusercontent.com/NVlabs/instant-ngp/master/docs/assets_readme/testbed.png",
    ],
    "lichtfeld-studio": [
        "https://raw.githubusercontent.com/MrNeRF/LichtFeld-Studio/master/docs/viewer_demo.gif",
    ],
    "luxcorerender": [
        "https://luxcorerender.org/wp-content/uploads/2017/12/San_Pedro_01b.jpg",
        "https://luxcorerender.org/wp-content/uploads/2017/12/wallpaper_lux_05_rend1b.jpg",
    ],
    "mitsuba3": [
        "https://raw.githubusercontent.com/mitsuba-renderer/mitsuba-data/master/docs/images/banners/banner_01.jpg",
    ],
    "nerfacc": [
        "https://raw.githubusercontent.com/nerfstudio-project/nerfacc/master/docs/source/_static/images/teaser.jpg",
    ],
    "nerfstudio": [
        "https://user-images.githubusercontent.com/3310961/194017985-ade69503-9d68-46a2-b518-2db1a012f090.gif",
        "https://docs.nerf.studio/_images/viewer_demo.gif",
    ],
    "nvdiffrast": [
        "https://raw.githubusercontent.com/NVlabs/nvdiffrast/main/docs/img/teaser.png",
    ],
    "nvidia-falcor": [
        "https://raw.githubusercontent.com/NVIDIAGameWorks/Falcor/master/docs/images/teaser.png",
    ],
    "nvidia-kaolin": [
        "https://raw.githubusercontent.com/NVIDIAGameWorks/kaolin/master/assets/diffuse.png",
        "https://raw.githubusercontent.com/NVIDIAGameWorks/kaolin/master/assets/flexicubes.png",
    ],
    "ogre3d": [
        "https://raw.githubusercontent.com/OGRECave/ogre-next/master/Docs/frontpage/ForwardClustered.jpg",
    ],
    "open3d": [
        "https://raw.githubusercontent.com/isl-org/Open3D/main/docs/_static/open3d_viewer.png",
        "https://github.com/isl-org/Open3D/assets/41028320/e9b8645a-a823-4d78-8310-e85207b1e0e7",
    ],
    "ospray": [
        "https://www.ospray.org/gallery/moana1.jpg",
        "https://www.ospray.org/gallery/cosmos.jpg",
    ],
    "panda3d": [
        "https://www.panda3d.org/wp-content/uploads/2019/01/Screenshot_20190103_052439.png",
    ],
    "paraview": [
        "https://www.paraview.org/wp-content/uploads/2022/10/energy-exascale-earth-system-model-global-climate-model-data.jpg",
    ],
    "pbrt": [
        "https://pbrt.org/gallery/bathroom.jpg",
        "https://pbrt.org/gallery/caustic-glass.jpg",
    ],
    "povray": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Glasses_800_edit.png/1280px-Glasses_800_edit.png",
    ],
    "pytorch3d": [
        "https://raw.githubusercontent.com/facebookresearch/pytorch3d/main/.github/render_textured_mesh.gif",
        "https://raw.githubusercontent.com/facebookresearch/pytorch3d/main/.github/pytorch3d_teaser.gif",
    ],
    "radeon-prorender": [
        "https://raw.githubusercontent.com/GPUOpen-LibrariesAndSDKs/RadeonProRenderSDK/master/Resources/doc/doc1.png",
    ],
    "raylib": [
        "https://raw.githubusercontent.com/raysan5/raylib/master/examples/shaders/shaders_basic_lighting.png",
    ],
    "raytracing-in-one-weekend": [
        "https://raw.githubusercontent.com/RayTracing/raytracing.github.io/release/images/img-1.23-book1-final.jpg",
    ],
    "redner": [
        "https://people.csail.mit.edu/tzumao/diffrt/teaser.jpg",
    ],
    "smallpt": [
        "https://www.kevinbeason.com/smallpt/result_25k.png",
    ],
    "softrasterizer": [
        "https://raw.githubusercontent.com/ShichenLiu/SoftRas/master/data/media/demo/render/forward.gif",
    ],
    "sokol": [
        "https://floooh.github.io/sokol-html5/shadows.webp",
        "https://floooh.github.io/sokol-html5/sgl-context.webp",
    ],
    "sort": [
        "http://sort-renderer.com/assets/gallery/san_miguel_0.png",
        "http://sort-renderer.com/assets/gallery/blender_281_splash.png",
    ],
    "taichi": [
        "https://raw.githubusercontent.com/taichi-dev/public_files/master/taichi/sdf_renderer.jpg",
    ],
    "tensorflow-graphics": [
        "https://raw.githubusercontent.com/tensorflow/graphics/master/tensorflow_graphics/rendering/tests/test_data/Simple_Triangle.png",
    ],
    "the-forge": [
        "https://github.com/ConfettiFX/The-Forge-Media/raw/master/Screenshots/RTX-RTGI/PS5-4K.png",
        "https://raw.githubusercontent.com/ConfettiFX/The-Forge-Media/master/Screenshots/RTX-RTGI/PS5-4K.png",
    ],
    "threejs": [
        "https://threejs.org/files/projects/webgi-jewelry.png",
    ],
    "tinyraytracer": [
        "https://raw.githubusercontent.com/ssloy/tinyraytracer/master/out.jpg",
    ],
    "tungsten": [
        "https://raw.githubusercontent.com/tunabrain/tungsten/master/Header.jpg",
    ],
    "viskores": [
        "https://m.vtk.org/img/fluids_blend.png",
    ],
    "voreen": [
        "https://www.uni-muenster.de/imperia/md/images/voreen/start_image/voreenve-2.6-startseite.png",
    ],
    "vtk": [
        "https://vtk.org/wp-content/uploads/2015/02/full_supernova.png",
        "https://vtk.org/wp-content/uploads/2022/03/vessel-high-res-02.png",
    ],
    "wicked-engine": [
        "https://raw.githubusercontent.com/turanszkij/wickedengine-gifs/main/girl_pose.png",
    ],
    "yafray": [
        "https://upload.wikimedia.org/wikipedia/commons/9/9e/Yafaray0.1.1.jpg",
    ],
}


def download_image(url: str) -> Image.Image | None:
    """Download an image and return as PIL Image."""
    try:
        resp = SESSION.get(url, timeout=30)
        if resp.status_code != 200:
            return None
        content_type = resp.headers.get("content-type", "")
        if "text" in content_type and "image" not in content_type:
            return None
        data = resp.content
        if len(data) < 500:
            return None
        img = Image.open(BytesIO(data))
        # For animated GIFs, seek to the first frame
        if hasattr(img, "n_frames") and img.n_frames > 1:
            img.seek(0)
        img.load()
        return img
    except Exception as e:
        print(f"    Failed to download: {e}")
        return None


def crop_and_resize(img: Image.Image) -> Image.Image:
    """Crop to 16:9 center and resize to 400x225."""
    if img.mode in ("RGBA", "P", "LA"):
        background = Image.new("RGB", img.size, (0, 0, 0))
        if img.mode == "P":
            img = img.convert("RGBA")
        if img.mode in ("RGBA", "LA"):
            background.paste(img, mask=img.split()[-1])
        else:
            background.paste(img)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    current_ratio = w / h

    if current_ratio > TARGET_RATIO:
        new_w = int(h * TARGET_RATIO)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    elif current_ratio < TARGET_RATIO:
        new_h = int(w / TARGET_RATIO)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))

    img = img.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.LANCZOS)
    return img


def process_renderer(renderer_id: str, urls: list[str]) -> bool:
    """Try each URL for a renderer until one works."""
    output_path = OUTPUT_DIR / f"{renderer_id}.webp"
    json_path = DATA_DIR / f"{renderer_id}.json"

    if not json_path.exists():
        print(f"  [{renderer_id}] JSON not found, skipping")
        return False

    for url in urls:
        print(f"  [{renderer_id}] Trying: {url[:90]}...")
        img = download_image(url)
        if img is None:
            print(f"    Failed, trying next...")
            continue

        # Check minimum quality — reject tiny images
        w, h = img.size
        if w < 100 or h < 60:
            print(f"    Too small ({w}x{h}), trying next...")
            continue

        img = crop_and_resize(img)
        img.save(output_path, "WEBP", quality=WEBP_QUALITY)

        # Verify saved file is reasonable size
        file_size = output_path.stat().st_size
        if file_size < 500:
            print(f"    Output too small ({file_size} bytes), trying next...")
            output_path.unlink()
            continue

        # Update JSON
        data = json.load(open(json_path))
        data["thumbnail"] = f"/renders/samples/{renderer_id}.webp"
        with open(json_path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")

        print(f"    OK: {w}x{h} -> 400x225, {file_size:,} bytes")
        return True

    print(f"  [{renderer_id}] All URLs failed!")
    return False


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Processing {len(CURATED_URLS)} renderers with curated URLs")
    print(f"Output: {OUTPUT_DIR}")
    print()

    success = 0
    failed = 0

    for renderer_id, urls in sorted(CURATED_URLS.items()):
        try:
            if process_renderer(renderer_id, urls):
                success += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  [{renderer_id}] ERROR: {e}")
            failed += 1
        time.sleep(0.3)

    print()
    print(f"Done! Success: {success}, Failed: {failed}")
    print(f"Total images: {len(list(OUTPUT_DIR.glob('*.webp')))}")


if __name__ == "__main__":
    main()
