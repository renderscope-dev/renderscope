/**
 * Generates data URL sample images for Storybook stories.
 * Uses Canvas API to create gradient/pattern images that work without external files.
 *
 * Each generator creates a deterministic image (using seeded pseudo-random noise)
 * so that diff / SSIM stories produce consistent, non-flickering results.
 */

function createCanvas(
  width: number,
  height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Produces the same noise pattern on every call so diff images are stable.
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Add deterministic noise to image data. */
function addNoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amplitude: number,
  seed: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const rand = seededRandom(seed);

  for (let i = 0; i < data.length; i += 4) {
    const noise = (rand() - 0.5) * amplitude;
    data[i] = Math.min(255, Math.max(0, (data[i] ?? 0) + noise));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] ?? 0) + noise));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] ?? 0) + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

/** Blue-teal gradient with noise -- simulates render A */
export function generateSampleImageA(
  width = 800,
  height = 600,
): string {
  const [canvas, ctx] = createCanvas(width, height);

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#1a237e");
  grad.addColorStop(0.5, "#006064");
  grad.addColorStop(1, "#1b5e20");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // White circle
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.arc(width * 0.3, height * 0.4, 120, 0, Math.PI * 2);
  ctx.fill();

  // Warm rectangle
  ctx.fillStyle = "rgba(255, 200, 50, 0.2)";
  ctx.fillRect(width * 0.5, height * 0.2, 200, 200);

  // Small triangle for detail
  ctx.fillStyle = "rgba(100, 200, 255, 0.12)";
  ctx.beginPath();
  ctx.moveTo(width * 0.7, height * 0.65);
  ctx.lineTo(width * 0.85, height * 0.85);
  ctx.lineTo(width * 0.55, height * 0.85);
  ctx.closePath();
  ctx.fill();

  addNoise(ctx, width, height, 10, 42);

  return canvas.toDataURL("image/png");
}

/** Same composition as A but slightly different colors/positions -- simulates render B */
export function generateSampleImageB(
  width = 800,
  height = 600,
): string {
  const [canvas, ctx] = createCanvas(width, height);

  // Slightly shifted gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#1a237e");
  grad.addColorStop(0.5, "#00695c");
  grad.addColorStop(1, "#2e7d32");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Circle -- shifted 3px right, 2px down, slightly smaller
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.beginPath();
  ctx.arc(width * 0.3 + 3, height * 0.4 + 2, 118, 0, Math.PI * 2);
  ctx.fill();

  // Rectangle -- shifted, slightly different alpha
  ctx.fillStyle = "rgba(255, 210, 60, 0.22)";
  ctx.fillRect(width * 0.5 + 2, height * 0.2 + 1, 198, 198);

  // Triangle -- slightly different
  ctx.fillStyle = "rgba(110, 210, 255, 0.14)";
  ctx.beginPath();
  ctx.moveTo(width * 0.7 + 1, height * 0.65 + 1);
  ctx.lineTo(width * 0.85 + 1, height * 0.85 + 1);
  ctx.lineTo(width * 0.55 + 1, height * 0.85 + 1);
  ctx.closePath();
  ctx.fill();

  addNoise(ctx, width, height, 12, 137);

  return canvas.toDataURL("image/png");
}

/** Warm orange/red gradient -- distinct third image for multi-image components */
export function generateSampleImageC(
  width = 800,
  height = 600,
): string {
  const [canvas, ctx] = createCanvas(width, height);

  // Warm gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#bf360c");
  grad.addColorStop(0.5, "#e65100");
  grad.addColorStop(1, "#f57f17");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Circle
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath();
  ctx.arc(width * 0.3, height * 0.4, 115, 0, Math.PI * 2);
  ctx.fill();

  // Rectangle
  ctx.fillStyle = "rgba(255, 220, 70, 0.18)";
  ctx.fillRect(width * 0.5, height * 0.2, 196, 196);

  // Triangle
  ctx.fillStyle = "rgba(255, 150, 100, 0.15)";
  ctx.beginPath();
  ctx.moveTo(width * 0.7, height * 0.65);
  ctx.lineTo(width * 0.85, height * 0.85);
  ctx.lineTo(width * 0.55, height * 0.85);
  ctx.closePath();
  ctx.fill();

  addNoise(ctx, width, height, 15, 7919);

  return canvas.toDataURL("image/png");
}
