#!/bin/bash
# =============================================================================
# RenderScope — Master Render Script
# =============================================================================
# Renders all possible renderer × scene combinations and deploys images to the
# website. Run from the renderscope/ directory with the venv active:
#
#   source .venv/bin/activate
#   bash scripts/render_all.sh
#
# Estimated total time: ~60-90 minutes on Apple M5 Max
# =============================================================================

set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

echo "=============================================="
echo "  RenderScope — Master Render Pipeline"
echo "=============================================="
echo "  Repository: $REPO"
echo "  Time:       $(date)"
echo ""

# ------------------------------------------------------------------
# Step 1: Convert scenes to glTF (for Filament + OSPRay)
# ------------------------------------------------------------------
echo "=== STEP 1: Converting scenes to glTF ==="
python scripts/convert_to_gltf.py --skip-existing
echo ""

# ------------------------------------------------------------------
# Step 2: Render with PBRT (scenes that have .pbrt files)
# ------------------------------------------------------------------
echo "=== STEP 2: PBRT renders ==="
PBRT=".venv/bin/pbrt"

if [ -x "$PBRT" ]; then
    # Cornell Box — 1024 SPP (~3 min)
    SCENE="assets/scenes/cornell-box/pbrt/cornell-box/scene-v4.pbrt"
    OUT="assets/renders/cornell-box/pbrt_1024spp.exr"
    if [ -f "$SCENE" ] && [ ! -f "$OUT" ]; then
        echo "  Rendering cornell-box with PBRT (1024 SPP)..."
        mkdir -p "$(dirname "$OUT")"
        "$PBRT" --spp 1024 --outfile "$OUT" "$SCENE" 2>&1 | tail -1
    else
        echo "  Skipping cornell-box/pbrt (already exists or no scene file)"
    fi

    # Veach MIS — 1024 SPP (~2 min)
    SCENE="assets/scenes/veach-mis/pbrt/veach-mis/scene-v4.pbrt"
    OUT="assets/renders/veach-mis/pbrt_1024spp.exr"
    if [ -f "$SCENE" ] && [ ! -f "$OUT" ]; then
        echo "  Rendering veach-mis with PBRT (1024 SPP)..."
        mkdir -p "$(dirname "$OUT")"
        "$PBRT" --spp 1024 --outfile "$OUT" "$SCENE" 2>&1 | tail -1
    else
        echo "  Skipping veach-mis/pbrt (already exists or no scene file)"
    fi
else
    echo "  PBRT not found at $PBRT — skipping"
fi
echo ""

# ------------------------------------------------------------------
# Step 3: Render with Blender Cycles (all scenes with .blend or .obj)
# ------------------------------------------------------------------
echo "=== STEP 3: Blender Cycles renders ==="

for SCENE_ID in cornell-box sponza stanford-bunny classroom bmw; do
    OUT="assets/renders/$SCENE_ID/blender-cycles_1024spp.exr"
    if [ -f "$OUT" ]; then
        echo "  Skipping $SCENE_ID/blender-cycles (already exists)"
        continue
    fi

    echo "  Rendering $SCENE_ID with Blender Cycles (256 SPP, GPU)..."
    renderscope benchmark \
        --renderer blender-cycles \
        --scene "$SCENE_ID" \
        --samples 256 \
        --gpu \
        --output "/tmp/rs-${SCENE_ID}-cycles.json" 2>&1 | tail -3

    # Copy the output to assets/renders/
    SRC="renderscope-results/$SCENE_ID/blender-cycles_256spp.exr"
    if [ -f "$SRC" ]; then
        mkdir -p "$(dirname "$OUT")"
        cp "$SRC" "$OUT"
        echo "  OK: $SCENE_ID/blender-cycles"
    else
        echo "  FAILED: Output not found at $SRC"
    fi
done
echo ""

# ------------------------------------------------------------------
# Step 4: Render with Mitsuba 3 (scenes with .obj files)
# ------------------------------------------------------------------
echo "=== STEP 4: Mitsuba 3 renders ==="

for SCENE_ID in cornell-box sponza stanford-bunny; do
    OUT="assets/renders/$SCENE_ID/mitsuba3_1024spp.exr"
    if [ -f "$OUT" ]; then
        echo "  Skipping $SCENE_ID/mitsuba3 (already exists)"
        continue
    fi

    echo "  Rendering $SCENE_ID with Mitsuba 3 (256 SPP)..."
    renderscope benchmark \
        --renderer mitsuba3 \
        --scene "$SCENE_ID" \
        --samples 256 \
        --output "/tmp/rs-${SCENE_ID}-mitsuba3.json" 2>&1 | tail -3

    SRC="renderscope-results/$SCENE_ID/mitsuba3_256spp.exr"
    if [ -f "$SRC" ]; then
        mkdir -p "$(dirname "$OUT")"
        cp "$SRC" "$OUT"
        echo "  OK: $SCENE_ID/mitsuba3"
    else
        # Check for other mitsuba output names
        SRC2=$(find renderscope-results/$SCENE_ID -name "mitsuba3*" -newer /tmp/rs-${SCENE_ID}-mitsuba3.json 2>/dev/null | tail -1)
        if [ -n "$SRC2" ]; then
            mkdir -p "$(dirname "$OUT")"
            cp "$SRC2" "$OUT"
            echo "  OK: $SCENE_ID/mitsuba3 (from $SRC2)"
        else
            echo "  FAILED: $SCENE_ID/mitsuba3"
        fi
    fi
done
echo ""

# ------------------------------------------------------------------
# Step 5: Render with appleseed (scenes with .obj files)
# ------------------------------------------------------------------
echo "=== STEP 5: appleseed renders ==="

for SCENE_ID in cornell-box sponza stanford-bunny; do
    OUT="assets/renders/$SCENE_ID/appleseed_1024spp.exr"
    if [ -f "$OUT" ]; then
        echo "  Skipping $SCENE_ID/appleseed (already exists)"
        continue
    fi

    echo "  Rendering $SCENE_ID with appleseed (256 SPP)..."
    renderscope benchmark \
        --renderer appleseed \
        --scene "$SCENE_ID" \
        --samples 256 \
        --output "/tmp/rs-${SCENE_ID}-appleseed.json" 2>&1 | tail -3

    SRC=$(find renderscope-results/$SCENE_ID -name "appleseed*" -newer /tmp/rs-${SCENE_ID}-appleseed.json 2>/dev/null | tail -1)
    if [ -n "$SRC" ]; then
        mkdir -p "$(dirname "$OUT")"
        cp "$SRC" "$OUT"
        echo "  OK: $SCENE_ID/appleseed"
    else
        echo "  FAILED: $SCENE_ID/appleseed"
    fi
done
echo ""

# ------------------------------------------------------------------
# Step 5b: Filament and OSPRay (skipped — require GPU display on macOS)
# ------------------------------------------------------------------
echo "=== STEP 5b: Filament & OSPRay ==="
echo "  Skipped: Filament requires EGL (no headless on macOS)"
echo "  Skipped: OSPRay Studio opens GUI (no true batch mode)"
echo "  These renderers need a display context. To render manually:"
echo "    Filament: gltf_viewer --headless --screenshot out.png scene.glb"
echo "    OSPRay:   ospStudio --saveImageOnExit --image out.png scene.obj"
echo "             (then close the window to trigger save)"
echo ""

# ------------------------------------------------------------------
# Step 6: Generate WebP images for the website
# ------------------------------------------------------------------
echo "=== STEP 6: Generating WebP images ==="
python scripts/generate_web_images.py
echo ""

# ------------------------------------------------------------------
# Step 7: Deploy to web/public/renders/
# ------------------------------------------------------------------
echo "=== STEP 7: Deploying to web/public/renders/ ==="
for SCENE_DIR in assets/renders/*/; do
    SCENE_ID=$(basename "$SCENE_DIR")
    mkdir -p "web/public/renders/$SCENE_ID"
    for WEBP in "$SCENE_DIR"*_1920x1080.webp "$SCENE_DIR"*_400x225.webp; do
        if [ -f "$WEBP" ]; then
            cp "$WEBP" "web/public/renders/$SCENE_ID/"
        fi
    done
    echo "  Deployed $SCENE_ID"
done
echo ""

# ------------------------------------------------------------------
# Step 8: Update scene metadata
# ------------------------------------------------------------------
echo "=== STEP 8: Updating scene metadata ==="
python scripts/populate_scene_renders.py 2>&1 | tail -5
echo ""

echo "=============================================="
echo "  DONE — $(date)"
echo "=============================================="
echo ""
echo "  Start the website:  cd web && npm run dev"
echo "  Compare renders:    /compare?r=pbrt,blender-cycles&tab=images"
echo "  Gallery:            /gallery/cornell-box"
echo ""
