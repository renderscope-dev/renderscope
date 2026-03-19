/**
 * Core pixel math for image comparison.
 *
 * Pure functions that operate on Canvas 2D ImageData objects and produce either
 * new ImageData (for visualization) or numeric metrics (PSNR, SSIM). These
 * functions never touch the DOM, create canvases, or manage state.
 */

import type { ColorMapName, SSIMResult, ImageMetrics } from "../types/image-compare";
import { getColor } from "./colorMaps";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertSameDimensions(a: ImageData, b: ImageData): void {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `Images must be the same size (reference: ${a.width}\u00D7${a.height}, test: ${b.width}\u00D7${b.height})`,
    );
  }
}

function clamp255(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

/**
 * ITU-R BT.601 luminance from RGB channels.
 * All inputs expected in 0-255 range; output in 0-255 range.
 */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// ---------------------------------------------------------------------------
// Image Loading
// ---------------------------------------------------------------------------

export interface LoadedImage {
  data: ImageData;
  width: number;
  height: number;
}

/**
 * Loads an image from a URL and returns its pixel data.
 * Creates an offscreen canvas, draws the image, and extracts ImageData.
 */
export async function loadImageData(src: string): Promise<LoadedImage> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement("img");
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () =>
      reject(new Error(`Failed to load image: ${src}`));
    el.src = src;
  });

  const { naturalWidth: w, naturalHeight: h } = img;
  if (w === 0 || h === 0) {
    throw new Error(`Image has zero dimensions: ${src}`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is not supported by this browser");
  }

  ctx.drawImage(img, 0, 0);
  return { data: ctx.getImageData(0, 0, w, h), width: w, height: h };
}

// ---------------------------------------------------------------------------
// Absolute Difference
// ---------------------------------------------------------------------------

/**
 * Per-pixel absolute RGB difference with amplification.
 *
 * Each output pixel: `clamp(|ref - test| * amplification, 0, 255)`.
 */
export function computeAbsoluteDiff(
  reference: ImageData,
  test: ImageData,
  amplification: number,
): ImageData {
  assertSameDimensions(reference, test);

  const { width, height } = reference;
  const refPx = reference.data;
  const testPx = test.data;
  const out = new ImageData(width, height);
  const outPx = out.data;
  const len = refPx.length;

  for (let i = 0; i < len; i += 4) {
    outPx[i] = clamp255(
      Math.abs(refPx[i]! - testPx[i]!) * amplification,
    );
    outPx[i + 1] = clamp255(
      Math.abs(refPx[i + 1]! - testPx[i + 1]!) * amplification,
    );
    outPx[i + 2] = clamp255(
      Math.abs(refPx[i + 2]! - testPx[i + 2]!) * amplification,
    );
    outPx[i + 3] = 255;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Luminance Difference
// ---------------------------------------------------------------------------

/**
 * Grayscale luminance-only difference.
 *
 * Converts both images to BT.601 luminance, computes the absolute difference,
 * applies amplification, and outputs as grayscale (R = G = B).
 */
export function computeLuminanceDiff(
  reference: ImageData,
  test: ImageData,
  amplification: number,
): ImageData {
  assertSameDimensions(reference, test);

  const { width, height } = reference;
  const refPx = reference.data;
  const testPx = test.data;
  const out = new ImageData(width, height);
  const outPx = out.data;
  const len = refPx.length;

  for (let i = 0; i < len; i += 4) {
    const lumRef = luminance(refPx[i]!, refPx[i + 1]!, refPx[i + 2]!);
    const lumTest = luminance(
      testPx[i]!,
      testPx[i + 1]!,
      testPx[i + 2]!,
    );
    const diff = clamp255(Math.abs(lumRef - lumTest) * amplification);
    outPx[i] = diff;
    outPx[i + 1] = diff;
    outPx[i + 2] = diff;
    outPx[i + 3] = 255;
  }

  return out;
}

// ---------------------------------------------------------------------------
// MSE
// ---------------------------------------------------------------------------

/**
 * Mean Squared Error between two images, averaged across all channels.
 */
export function computeMSE(reference: ImageData, test: ImageData): number {
  assertSameDimensions(reference, test);

  const refPx = reference.data;
  const testPx = test.data;
  const pixelCount = reference.width * reference.height;

  let sumSqDiff = 0;
  const len = refPx.length;

  for (let i = 0; i < len; i += 4) {
    const dr = refPx[i]! - testPx[i]!;
    const dg = refPx[i + 1]! - testPx[i + 1]!;
    const db = refPx[i + 2]! - testPx[i + 2]!;
    sumSqDiff += dr * dr + dg * dg + db * db;
  }

  return sumSqDiff / (pixelCount * 3);
}

// ---------------------------------------------------------------------------
// PSNR
// ---------------------------------------------------------------------------

/**
 * Peak Signal-to-Noise Ratio between two images.
 *
 * PSNR = 10 * log10(MAX^2 / MSE) where MAX = 255 for 8-bit images.
 * Returns Infinity for identical images (MSE = 0).
 */
export function computePSNR(reference: ImageData, test: ImageData): number {
  const mse = computeMSE(reference, test);
  if (mse === 0) return Infinity;
  return 10 * Math.log10((255 * 255) / mse);
}

// ---------------------------------------------------------------------------
// SSIM (Block-based)
// ---------------------------------------------------------------------------

/**
 * Block-based Structural Similarity Index.
 *
 * Uses non-overlapping blocks instead of the full per-pixel sliding window
 * for performance. Converts to grayscale luminance before computing.
 *
 * SSIM(x, y) = (2*mu_x*mu_y + C1)(2*sigma_xy + C2) /
 *              ((mu_x^2 + mu_y^2 + C1)(sigma_x^2 + sigma_y^2 + C2))
 *
 * C1 = (0.01 * 255)^2 = 6.5025
 * C2 = (0.03 * 255)^2 = 58.5225
 */
export function computeSSIM(
  reference: ImageData,
  test: ImageData,
  blockSize: number = 8,
): SSIMResult {
  assertSameDimensions(reference, test);

  const { width, height } = reference;
  const refPx = reference.data;
  const testPx = test.data;

  const pixelCount = width * height;
  const refLum = new Float32Array(pixelCount);
  const testLum = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    refLum[i] = luminance(refPx[idx]!, refPx[idx + 1]!, refPx[idx + 2]!);
    testLum[i] = luminance(
      testPx[idx]!,
      testPx[idx + 1]!,
      testPx[idx + 2]!,
    );
  }

  const C1 = 6.5025;
  const C2 = 58.5225;

  const mapWidth = Math.ceil(width / blockSize);
  const mapHeight = Math.ceil(height / blockSize);
  const map = new Float32Array(mapWidth * mapHeight);

  let totalSSIM = 0;
  let blockCount = 0;

  for (let by = 0; by < mapHeight; by++) {
    for (let bx = 0; bx < mapWidth; bx++) {
      const x0 = bx * blockSize;
      const y0 = by * blockSize;
      const x1 = Math.min(x0 + blockSize, width);
      const y1 = Math.min(y0 + blockSize, height);
      const n = (x1 - x0) * (y1 - y0);

      let sumRef = 0;
      let sumTest = 0;
      for (let y = y0; y < y1; y++) {
        const rowOffset = y * width;
        for (let x = x0; x < x1; x++) {
          sumRef += refLum[rowOffset + x]!;
          sumTest += testLum[rowOffset + x]!;
        }
      }
      const muRef = sumRef / n;
      const muTest = sumTest / n;

      let varRef = 0;
      let varTest = 0;
      let covar = 0;
      for (let y = y0; y < y1; y++) {
        const rowOffset = y * width;
        for (let x = x0; x < x1; x++) {
          const dRef = refLum[rowOffset + x]! - muRef;
          const dTest = testLum[rowOffset + x]! - muTest;
          varRef += dRef * dRef;
          varTest += dTest * dTest;
          covar += dRef * dTest;
        }
      }
      varRef /= n;
      varTest /= n;
      covar /= n;

      const numerator =
        (2 * muRef * muTest + C1) * (2 * covar + C2);
      const denominator =
        (muRef * muRef + muTest * muTest + C1) *
        (varRef + varTest + C2);

      const ssim = numerator / denominator;
      map[by * mapWidth + bx] = ssim;
      totalSSIM += ssim;
      blockCount++;
    }
  }

  return {
    score: blockCount > 0 ? totalSSIM / blockCount : 1,
    map,
    mapWidth,
    mapHeight,
  };
}

// ---------------------------------------------------------------------------
// SSIM Heatmap Generation
// ---------------------------------------------------------------------------

/**
 * Converts a per-block SSIM map into a full-resolution false-color ImageData.
 *
 * Each block's SSIM score is inverted (1 - ssim) so that "more different"
 * maps to the hot end of the colormap, then looked up via getColor().
 */
export function generateSSIMHeatmap(
  ssimMap: Float32Array,
  mapWidth: number,
  mapHeight: number,
  outputWidth: number,
  outputHeight: number,
  blockSize: number,
  colorMapName: ColorMapName,
): ImageData {
  const out = new ImageData(outputWidth, outputHeight);
  const outPx = out.data;

  for (let by = 0; by < mapHeight; by++) {
    for (let bx = 0; bx < mapWidth; bx++) {
      const ssimValue = ssimMap[by * mapWidth + bx] ?? 1;
      const [r, g, b] = getColor(1 - ssimValue, colorMapName);

      const x0 = bx * blockSize;
      const y0 = by * blockSize;
      const x1 = Math.min(x0 + blockSize, outputWidth);
      const y1 = Math.min(y0 + blockSize, outputHeight);

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = (y * outputWidth + x) * 4;
          outPx[idx] = r;
          outPx[idx + 1] = g;
          outPx[idx + 2] = b;
          outPx[idx + 3] = 255;
        }
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Compute all metrics at once
// ---------------------------------------------------------------------------

/**
 * Convenience function: compute PSNR, SSIM, and MSE in one call.
 */
export function computeAllMetrics(
  reference: ImageData,
  test: ImageData,
): ImageMetrics {
  const mse = computeMSE(reference, test);
  const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
  const { score: ssim } = computeSSIM(reference, test);
  return { psnr, ssim, mse };
}
