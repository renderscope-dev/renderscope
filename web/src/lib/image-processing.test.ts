/**
 * Tests for image processing utilities.
 *
 * These are pure functions that operate on ImageData objects.
 * We create synthetic ImageData in tests to verify the math.
 * loadImageData is excluded as it requires a real DOM/canvas.
 */
import { describe, it, expect } from "vitest";
import {
  computeAbsoluteDiff,
  computeLuminanceDiff,
  computePSNR,
  computeSSIM,
  generateSSIMHeatmap,
} from "./image-processing";

/** Create a solid-color ImageData of the given size. */
function makeImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return new ImageData(data, width, height);
}

/** Create an ImageData with a gradient pattern. */
function makeGradientImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = Math.round((x / width) * 255);
      data[idx + 1] = Math.round((y / height) * 255);
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }
  return new ImageData(data, width, height);
}

describe("computeAbsoluteDiff", () => {
  it("returns all zeros for identical images", () => {
    const img = makeImageData(4, 4, 128, 128, 128);
    const diff = computeAbsoluteDiff(img, img, 1);

    expect(diff.width).toBe(4);
    expect(diff.height).toBe(4);

    for (let i = 0; i < diff.data.length; i += 4) {
      expect(diff.data[i]).toBe(0);
      expect(diff.data[i + 1]).toBe(0);
      expect(diff.data[i + 2]).toBe(0);
      expect(diff.data[i + 3]).toBe(255); // Alpha always 255
    }
  });

  it("computes correct absolute difference", () => {
    const ref = makeImageData(2, 2, 100, 150, 200);
    const test = makeImageData(2, 2, 110, 140, 200);
    const diff = computeAbsoluteDiff(ref, test, 1);

    // |100-110|=10, |150-140|=10, |200-200|=0
    expect(diff.data[0]).toBe(10);
    expect(diff.data[1]).toBe(10);
    expect(diff.data[2]).toBe(0);
  });

  it("applies amplification factor", () => {
    const ref = makeImageData(2, 2, 100, 150, 200);
    const test = makeImageData(2, 2, 110, 140, 200);
    const diff = computeAbsoluteDiff(ref, test, 10);

    // |100-110|*10=100, |150-140|*10=100
    expect(diff.data[0]).toBe(100);
    expect(diff.data[1]).toBe(100);
  });

  it("clamps amplified values to 255", () => {
    const ref = makeImageData(2, 2, 0, 0, 0);
    const test = makeImageData(2, 2, 200, 200, 200);
    const diff = computeAbsoluteDiff(ref, test, 5);

    // |0-200|*5 = 1000 → clamped to 255
    expect(diff.data[0]).toBe(255);
  });

  it("throws for dimension mismatch", () => {
    const a = makeImageData(4, 4, 0, 0, 0);
    const b = makeImageData(8, 8, 0, 0, 0);

    expect(() => computeAbsoluteDiff(a, b, 1)).toThrow(
      /same size/i,
    );
  });
});

describe("computeLuminanceDiff", () => {
  it("returns all zeros for identical images", () => {
    const img = makeImageData(4, 4, 128, 128, 128);
    const diff = computeLuminanceDiff(img, img, 1);

    for (let i = 0; i < diff.data.length; i += 4) {
      expect(diff.data[i]).toBe(0);
      expect(diff.data[i + 1]).toBe(0);
      expect(diff.data[i + 2]).toBe(0);
      expect(diff.data[i + 3]).toBe(255);
    }
  });

  it("produces grayscale output (R = G = B)", () => {
    const ref = makeImageData(4, 4, 200, 100, 50);
    const test = makeImageData(4, 4, 100, 200, 50);
    const diff = computeLuminanceDiff(ref, test, 1);

    for (let i = 0; i < diff.data.length; i += 4) {
      expect(diff.data[i]).toBe(diff.data[i + 1]);
      expect(diff.data[i + 1]).toBe(diff.data[i + 2]);
    }
  });

  it("throws for dimension mismatch", () => {
    const a = makeImageData(4, 4, 0, 0, 0);
    const b = makeImageData(8, 8, 0, 0, 0);
    expect(() => computeLuminanceDiff(a, b, 1)).toThrow(/same size/i);
  });
});

describe("computePSNR", () => {
  it("returns Infinity for identical images", () => {
    const img = makeImageData(4, 4, 128, 128, 128);
    expect(computePSNR(img, img)).toBe(Infinity);
  });

  it("returns a finite positive number for different images", () => {
    const ref = makeImageData(4, 4, 128, 128, 128);
    const test = makeImageData(4, 4, 130, 126, 128);
    const psnr = computePSNR(ref, test);

    expect(psnr).toBeGreaterThan(0);
    expect(psnr).not.toBe(Infinity);
  });

  it("higher PSNR for more similar images", () => {
    const ref = makeImageData(8, 8, 128, 128, 128);
    const slightlyDiff = makeImageData(8, 8, 129, 127, 128);
    const veryDiff = makeImageData(8, 8, 200, 50, 128);

    const psnrSlight = computePSNR(ref, slightlyDiff);
    const psnrVery = computePSNR(ref, veryDiff);

    expect(psnrSlight).toBeGreaterThan(psnrVery);
  });

  it("produces reasonable dB values", () => {
    const ref = makeImageData(16, 16, 128, 128, 128);
    const test = makeImageData(16, 16, 138, 118, 128);
    const psnr = computePSNR(ref, test);

    // Should be in a realistic range for moderate differences
    expect(psnr).toBeGreaterThan(20);
    expect(psnr).toBeLessThan(60);
  });

  it("throws for dimension mismatch", () => {
    const a = makeImageData(4, 4, 0, 0, 0);
    const b = makeImageData(8, 8, 0, 0, 0);
    expect(() => computePSNR(a, b)).toThrow(/same size/i);
  });
});

describe("computeSSIM", () => {
  it("returns score of 1 for identical images", () => {
    const img = makeImageData(16, 16, 128, 128, 128);
    const result = computeSSIM(img, img, 8);

    expect(result.score).toBeCloseTo(1, 4);
  });

  it("returns score < 1 for different images", () => {
    const ref = makeImageData(16, 16, 128, 128, 128);
    const test = makeImageData(16, 16, 200, 50, 128);
    const result = computeSSIM(ref, test, 8);

    expect(result.score).toBeLessThan(1);
    expect(result.score).toBeGreaterThan(0);
  });

  it("returns proper map dimensions", () => {
    const img = makeImageData(32, 24, 128, 128, 128);
    const result = computeSSIM(img, img, 8);

    expect(result.mapWidth).toBe(Math.ceil(32 / 8));
    expect(result.mapHeight).toBe(Math.ceil(24 / 8));
    expect(result.map).toHaveLength(result.mapWidth * result.mapHeight);
  });

  it("handles non-multiple-of-blocksize dimensions", () => {
    const img = makeImageData(10, 10, 128, 128, 128);
    const result = computeSSIM(img, img, 8);

    expect(result.mapWidth).toBe(2); // ceil(10/8)
    expect(result.mapHeight).toBe(2);
    expect(result.score).toBeCloseTo(1, 4);
  });

  it("higher SSIM for more similar images", () => {
    const ref = makeGradientImageData(16, 16);
    const test = makeImageData(16, 16, 0, 0, 0);

    // ref vs slightly modified ref (small perturbation)
    const refData = new Uint8ClampedArray(ref.data);
    for (let i = 0; i < refData.length; i += 4) {
      refData[i] = Math.min(255, refData[i]! + 5);
    }
    const slightlyDiff = new ImageData(refData, 16, 16);

    const ssimSlight = computeSSIM(ref, slightlyDiff, 8).score;
    const ssimVery = computeSSIM(ref, test, 8).score;

    expect(ssimSlight).toBeGreaterThan(ssimVery);
  });

  it("throws for dimension mismatch", () => {
    const a = makeImageData(16, 16, 0, 0, 0);
    const b = makeImageData(32, 32, 0, 0, 0);
    expect(() => computeSSIM(a, b)).toThrow(/same size/i);
  });
});

describe("generateSSIMHeatmap", () => {
  it("produces ImageData of correct dimensions", () => {
    const mapWidth = 4;
    const mapHeight = 3;
    const ssimMap = new Float32Array(mapWidth * mapHeight).fill(0.95);
    const blockSize = 8;
    const outputWidth = mapWidth * blockSize;
    const outputHeight = mapHeight * blockSize;

    const heatmap = generateSSIMHeatmap(
      ssimMap,
      mapWidth,
      mapHeight,
      outputWidth,
      outputHeight,
      blockSize,
      "viridis",
    );

    expect(heatmap.width).toBe(outputWidth);
    expect(heatmap.height).toBe(outputHeight);
    expect(heatmap.data.length).toBe(outputWidth * outputHeight * 4);
  });

  it("sets alpha to 255 for all pixels", () => {
    const ssimMap = new Float32Array([0.5, 0.8, 0.9, 1.0]);
    const heatmap = generateSSIMHeatmap(ssimMap, 2, 2, 16, 16, 8, "inferno");

    for (let i = 3; i < heatmap.data.length; i += 4) {
      expect(heatmap.data[i]).toBe(255);
    }
  });

  it("produces uniform color for uniform SSIM map", () => {
    const ssimMap = new Float32Array(4).fill(0.5);
    const heatmap = generateSSIMHeatmap(ssimMap, 2, 2, 16, 16, 8, "viridis");

    // All pixels in the output should have the same RGB
    const r0 = heatmap.data[0]!;
    const g0 = heatmap.data[1]!;
    const b0 = heatmap.data[2]!;

    for (let i = 0; i < heatmap.data.length; i += 4) {
      expect(heatmap.data[i]).toBe(r0);
      expect(heatmap.data[i + 1]).toBe(g0);
      expect(heatmap.data[i + 2]).toBe(b0);
    }
  });

  it("produces different colors for different SSIM values", () => {
    // One block with high SSIM, one with low SSIM
    const ssimMap = new Float32Array([1.0, 0.0]);
    const heatmap = generateSSIMHeatmap(ssimMap, 2, 1, 16, 8, 8, "viridis");

    // Sample a pixel from each block
    const leftR = heatmap.data[0]!;
    const leftG = heatmap.data[1]!;
    const rightPixel = 8 * 4; // x=8, y=0
    const rightR = heatmap.data[rightPixel]!;
    const rightG = heatmap.data[rightPixel + 1]!;

    // They should differ because SSIM values differ
    const leftSum = leftR + leftG;
    const rightSum = rightR + rightG;
    expect(leftSum).not.toBe(rightSum);
  });
});
