"""One-time script to generate deterministic test images for the test suite.

Run once to create the test_images/ directory with pre-built PNG files:

    python tests/generate_test_images.py

These images are committed to version control so that tests are reproducible
without needing to regenerate them.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

OUTPUT_DIR = Path(__file__).parent / "test_images"


def _save(arr: np.ndarray, name: str) -> None:
    """Save a float32 [0,1] or uint8 array as PNG."""
    if arr.dtype == np.float32:
        arr = (np.clip(arr, 0.0, 1.0) * 255).astype(np.uint8)
    path = OUTPUT_DIR / name
    if arr.ndim == 2:
        Image.fromarray(arr, mode="L").save(str(path))
    elif arr.shape[2] == 3:
        Image.fromarray(arr, mode="RGB").save(str(path))
    elif arr.shape[2] == 4:
        Image.fromarray(arr, mode="RGBA").save(str(path))
    else:
        msg = f"Unexpected channel count: {arr.shape}"
        raise ValueError(msg)
    print(f"  Created {path}")


def generate() -> None:
    """Generate all test images."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Solid red 8x8
    red = np.zeros((8, 8, 3), dtype=np.uint8)
    red[:, :, 0] = 255
    _save(red, "solid_red_8x8.png")

    # 2. Solid blue 8x8
    blue = np.zeros((8, 8, 3), dtype=np.uint8)
    blue[:, :, 2] = 255
    _save(blue, "solid_blue_8x8.png")

    # 3. Smooth gradient 64x64 (R channel left-to-right, G channel top-to-bottom)
    rng = np.random.default_rng(42)
    gradient = np.zeros((64, 64, 3), dtype=np.float32)
    gradient[:, :, 0] = np.linspace(0.0, 1.0, 64, dtype=np.float32).reshape(1, 64)
    gradient[:, :, 1] = np.linspace(0.0, 1.0, 64, dtype=np.float32).reshape(64, 1)
    gradient[:, :, 2] = 0.5
    _save(gradient, "gradient_64x64.png")

    # 4. Noisy version of the gradient (for PSNR/SSIM tests)
    noise = rng.normal(0.0, 0.02, size=gradient.shape).astype(np.float32)
    noisy = np.clip(gradient + noise, 0.0, 1.0).astype(np.float32)
    _save(noisy, "gradient_noisy_64x64.png")

    # 5. Black 16x16
    black = np.zeros((16, 16, 3), dtype=np.uint8)
    _save(black, "black_16x16.png")

    # 6. White 16x16
    white = np.full((16, 16, 3), 255, dtype=np.uint8)
    _save(white, "white_16x16.png")

    print(f"\nGenerated {len(list(OUTPUT_DIR.glob('*.png')))} test images in {OUTPUT_DIR}")


if __name__ == "__main__":
    generate()
