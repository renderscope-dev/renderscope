#!/usr/bin/env bash
# Upload rendered assets to Firebase Storage.
#
# Requires:
#   - Firebase CLI: npm install -g firebase-tools
#   - Authenticated: firebase login
#   - Project configured: firebase use <project-id>
#
# Usage:
#   bash scripts/upload_assets.sh
#
# Uploads assets/renders/ to gs://<bucket>/renders/ with:
#   - Cache-Control: public, max-age=31536000, immutable (1 year)
#   - Content-Type set automatically based on file extension

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RENDERS_DIR="$ROOT/assets/renders"
CORS_FILE="$ROOT/scripts/cors.json"

if [ ! -d "$RENDERS_DIR" ]; then
    echo "ERROR: $RENDERS_DIR does not exist. Run generate_representative_renders.py first."
    exit 1
fi

IMAGE_COUNT=$(find "$RENDERS_DIR" -name "*.webp" | wc -l)
echo "============================================================"
echo "  RenderScope — Upload Assets to Firebase Storage"
echo "============================================================"
echo "  Source:    $RENDERS_DIR"
echo "  Images:    $IMAGE_COUNT WebP files"
echo ""

# Check Firebase CLI
if ! command -v firebase &>/dev/null; then
    echo "ERROR: Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

# Get the default storage bucket
BUCKET=$(firebase apps:sdkconfig web 2>/dev/null | grep -o 'storageBucket.*' | head -1 | cut -d'"' -f3 || true)
if [ -z "$BUCKET" ]; then
    echo "WARNING: Could not auto-detect storage bucket."
    echo "  Ensure you have run 'firebase use <project-id>' and have Storage enabled."
    echo "  Falling back to manual gsutil upload."
    echo ""
fi

# Apply CORS configuration
if [ -f "$CORS_FILE" ]; then
    echo "  Applying CORS configuration..."
    if [ -n "$BUCKET" ]; then
        gsutil cors set "$CORS_FILE" "gs://$BUCKET" 2>/dev/null || \
            echo "  WARNING: Could not set CORS. You may need to configure this manually."
    fi
fi

# Upload using gsutil (part of Google Cloud SDK, also available via Firebase)
echo "  Uploading renders..."
if command -v gsutil &>/dev/null && [ -n "$BUCKET" ]; then
    gsutil -m -h "Cache-Control:public, max-age=31536000, immutable" \
        cp -r "$RENDERS_DIR"/* "gs://$BUCKET/renders/"
    echo ""
    echo "  Upload complete. Files available at:"
    echo "    gs://$BUCKET/renders/"
else
    echo "  gsutil not available or bucket not detected."
    echo "  To upload manually:"
    echo "    1. Install Google Cloud SDK: https://cloud.google.com/sdk/install"
    echo "    2. Run: gsutil -m cp -r $RENDERS_DIR/* gs://YOUR_BUCKET/renders/"
    echo ""
    echo "  Alternatively, the images are already in web/public/renders/"
    echo "  and will be deployed with 'firebase deploy --only hosting'."
fi

echo ""
echo "Done."
