#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Copy rendered images from assets/renders/ to web/public/renders/
# Run this before `npm run build` to include images in the static site.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_DIR="$ROOT_DIR/assets/renders"
DEST_DIR="$ROOT_DIR/web/public/renders"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory $SOURCE_DIR does not exist."
  echo "Run Phase 27 benchmarks first, or generate representative images with:"
  echo "  python scripts/generate_representative_renders.py"
  exit 1
fi

echo "Copying rendered images to web public directory..."
echo "  Source: $SOURCE_DIR"
echo "  Dest:   $DEST_DIR"

mkdir -p "$DEST_DIR"

# Use cp -r instead of rsync for cross-platform compatibility (Windows/Git Bash)
# Remove existing files first for a clean copy
if [ -d "$DEST_DIR" ]; then
  rm -rf "$DEST_DIR"/*
fi

cp -r "$SOURCE_DIR"/* "$DEST_DIR/"

# Count files
TOTAL=$(find "$DEST_DIR" -name "*.webp" | wc -l)
echo ""
echo "Done. Copied $TOTAL WebP images to $DEST_DIR"
