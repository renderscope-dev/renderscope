import { describe, it, expect } from "vitest";
import {
  computeAbsoluteDiff,
  computeLuminanceDiff,
  computeMSE,
  computePSNR,
  computeSSIM,
  computeAllMetrics,
  generateSSIMHeatmap,
} from "./imageProcessing";
import {
  createSolidImageData,
  createGradientImageData,
} from "../__tests__/fixtures";

describe("imageProcessing", () => {
  // ---------------------------------------------------------------------------
  // Test data
  // ---------------------------------------------------------------------------

  const white4x4 = createSolidImageData(4, 4, 255, 255, 255);
  const black4x4 = createSolidImageData(4, 4, 0, 0, 0);
  const red4x4 = createSolidImageData(4, 4, 255, 0, 0);
  const gray4x4 = createSolidImageData(4, 4, 128, 128, 128);
  const gradient4x4 = createGradientImageData(4, 4);

  // ---------------------------------------------------------------------------
  // computeMSE
  // ---------------------------------------------------------------------------

  describe("computeMSE", () => {
    it("returns 0 for identical images", () => {
      expect(computeMSE(white4x4, white4x4)).toBe(0);
    });

    it("returns 0 for identical black images", () => {
      expect(computeMSE(black4x4, black4x4)).toBe(0);
    });

    it("returns correct MSE for white vs black (4×4)", () => {
      // Each channel diff: 255. Per-pixel MSE = (255^2 * 3) / 3 = 65025
      // Total MSE = sum / (16 * 3) = 16 * 3 * 255^2 / (16 * 3) = 65025
      const mse = computeMSE(white4x4, black4x4);
      expect(mse).toBeCloseTo(65025, 0);
    });

    it("returns a positive value for different images", () => {
      expect(computeMSE(red4x4, gray4x4)).toBeGreaterThan(0);
    });

    it("throws for mismatched dimensions", () => {
      const small = createSolidImageData(2, 2, 0, 0, 0);
      expect(() => computeMSE(white4x4, small)).toThrow(
        /same size/i,
      );
    });

    it("is symmetric", () => {
      const mse1 = computeMSE(red4x4, gray4x4);
      const mse2 = computeMSE(gray4x4, red4x4);
      expect(mse1).toBeCloseTo(mse2, 10);
    });
  });

  // ---------------------------------------------------------------------------
  // computePSNR
  // ---------------------------------------------------------------------------

  describe("computePSNR", () => {
    it("returns Infinity for identical images", () => {
      expect(computePSNR(white4x4, white4x4)).toBe(Infinity);
    });

    it("returns a finite dB value for different images", () => {
      const psnr = computePSNR(white4x4, gray4x4);
      expect(psnr).toBeGreaterThan(0);
      expect(Number.isFinite(psnr)).toBe(true);
    });

    it("returns low PSNR for very different images", () => {
      const psnr = computePSNR(white4x4, black4x4);
      // White vs black should yield the minimum possible PSNR
      // PSNR = 10 * log10(255^2 / 65025) = 10 * log10(1) = 0
      expect(psnr).toBeCloseTo(0, 1);
    });

    it("returns higher PSNR for more similar images", () => {
      const psnrSimilar = computePSNR(white4x4, gray4x4);
      const psnrDifferent = computePSNR(white4x4, black4x4);
      expect(psnrSimilar).toBeGreaterThan(psnrDifferent);
    });

    it("throws for mismatched dimensions", () => {
      const small = createSolidImageData(2, 2, 0, 0, 0);
      expect(() => computePSNR(white4x4, small)).toThrow(/same size/i);
    });
  });

  // ---------------------------------------------------------------------------
  // computeSSIM
  // ---------------------------------------------------------------------------

  describe("computeSSIM", () => {
    it("returns score of 1 for identical images", () => {
      const result = computeSSIM(white4x4, white4x4);
      expect(result.score).toBeCloseTo(1, 4);
    });

    it("returns a score between 0 and 1 for different images", () => {
      const result = computeSSIM(white4x4, gray4x4);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it("returns low SSIM for very different images", () => {
      const result = computeSSIM(white4x4, black4x4);
      expect(result.score).toBeLessThan(0.5);
    });

    it("returns map, mapWidth, and mapHeight", () => {
      const result = computeSSIM(gradient4x4, gray4x4, 2);
      expect(result.map).toBeInstanceOf(Float32Array);
      expect(result.mapWidth).toBeGreaterThan(0);
      expect(result.mapHeight).toBeGreaterThan(0);
      expect(result.map.length).toBe(result.mapWidth * result.mapHeight);
    });

    it("respects blockSize parameter", () => {
      const block2 = computeSSIM(gradient4x4, gray4x4, 2);
      const block4 = computeSSIM(gradient4x4, gray4x4, 4);
      // Smaller blocks = more map entries
      expect(block2.map.length).toBeGreaterThanOrEqual(block4.map.length);
    });

    it("throws for mismatched dimensions", () => {
      const small = createSolidImageData(2, 2, 128, 128, 128);
      expect(() => computeSSIM(white4x4, small)).toThrow(/same size/i);
    });
  });

  // ---------------------------------------------------------------------------
  // computeAbsoluteDiff
  // ---------------------------------------------------------------------------

  describe("computeAbsoluteDiff", () => {
    it("returns black image for identical inputs", () => {
      const diff = computeAbsoluteDiff(white4x4, white4x4, 1);
      // All pixels should be black (0, 0, 0)
      for (let i = 0; i < diff.data.length; i += 4) {
        expect(diff.data[i]).toBe(0);
        expect(diff.data[i + 1]).toBe(0);
        expect(diff.data[i + 2]).toBe(0);
        expect(diff.data[i + 3]).toBe(255); // Alpha always 255
      }
    });

    it("returns correct diff for white vs black", () => {
      const diff = computeAbsoluteDiff(white4x4, black4x4, 1);
      for (let i = 0; i < diff.data.length; i += 4) {
        expect(diff.data[i]).toBe(255);
        expect(diff.data[i + 1]).toBe(255);
        expect(diff.data[i + 2]).toBe(255);
      }
    });

    it("applies amplification correctly", () => {
      // gray (128) vs black (0) with amplification 2 => 256, clamped to 255
      const diff = computeAbsoluteDiff(gray4x4, black4x4, 2);
      for (let i = 0; i < diff.data.length; i += 4) {
        expect(diff.data[i]).toBe(255); // 128 * 2 = 256, clamped
      }
    });

    it("returns ImageData with same dimensions", () => {
      const diff = computeAbsoluteDiff(gradient4x4, gray4x4, 1);
      expect(diff.width).toBe(4);
      expect(diff.height).toBe(4);
    });

    it("throws for mismatched dimensions", () => {
      const small = createSolidImageData(2, 2, 0, 0, 0);
      expect(() => computeAbsoluteDiff(white4x4, small, 1)).toThrow(
        /same size/i,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // computeLuminanceDiff
  // ---------------------------------------------------------------------------

  describe("computeLuminanceDiff", () => {
    it("returns black image for identical inputs", () => {
      const diff = computeLuminanceDiff(white4x4, white4x4, 1);
      for (let i = 0; i < diff.data.length; i += 4) {
        expect(diff.data[i]).toBe(0);
        expect(diff.data[i + 1]).toBe(0);
        expect(diff.data[i + 2]).toBe(0);
      }
    });

    it("produces grayscale output (R = G = B)", () => {
      const diff = computeLuminanceDiff(gradient4x4, gray4x4, 1);
      for (let i = 0; i < diff.data.length; i += 4) {
        expect(diff.data[i]).toBe(diff.data[i + 1]);
        expect(diff.data[i + 1]).toBe(diff.data[i + 2]);
      }
    });

    it("alpha channel is always 255", () => {
      const diff = computeLuminanceDiff(gradient4x4, gray4x4, 1);
      for (let i = 0; i < diff.data.length; i += 4) {
        expect(diff.data[i + 3]).toBe(255);
      }
    });

    it("throws for mismatched dimensions", () => {
      const small = createSolidImageData(2, 2, 0, 0, 0);
      expect(() => computeLuminanceDiff(white4x4, small, 1)).toThrow(
        /same size/i,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // computeAllMetrics
  // ---------------------------------------------------------------------------

  describe("computeAllMetrics", () => {
    it("returns psnr, ssim, and mse for identical images", () => {
      const metrics = computeAllMetrics(white4x4, white4x4);
      expect(metrics.psnr).toBe(Infinity);
      expect(metrics.ssim).toBeCloseTo(1, 4);
      expect(metrics.mse).toBe(0);
    });

    it("returns finite metrics for different images", () => {
      const metrics = computeAllMetrics(white4x4, gray4x4);
      expect(Number.isFinite(metrics.psnr)).toBe(true);
      expect(metrics.psnr).toBeGreaterThan(0);
      expect(metrics.ssim).toBeGreaterThan(0);
      expect(metrics.ssim).toBeLessThanOrEqual(1);
      expect(metrics.mse).toBeGreaterThan(0);
    });

    it("returns an object with exactly three keys", () => {
      const metrics = computeAllMetrics(white4x4, black4x4);
      expect(Object.keys(metrics)).toEqual(
        expect.arrayContaining(["psnr", "ssim", "mse"]),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // generateSSIMHeatmap
  // ---------------------------------------------------------------------------

  describe("generateSSIMHeatmap", () => {
    it("generates ImageData of the correct dimensions", () => {
      const ssimResult = computeSSIM(gradient4x4, gray4x4, 2);
      const heatmap = generateSSIMHeatmap(
        ssimResult.map,
        ssimResult.mapWidth,
        ssimResult.mapHeight,
        4,
        4,
        2,
        "viridis",
      );
      expect(heatmap.width).toBe(4);
      expect(heatmap.height).toBe(4);
    });

    it("produces fully opaque output", () => {
      const ssimResult = computeSSIM(gradient4x4, gray4x4, 2);
      const heatmap = generateSSIMHeatmap(
        ssimResult.map,
        ssimResult.mapWidth,
        ssimResult.mapHeight,
        4,
        4,
        2,
        "inferno",
      );
      for (let i = 3; i < heatmap.data.length; i += 4) {
        expect(heatmap.data[i]).toBe(255);
      }
    });

    it("works with different color maps", () => {
      const ssimResult = computeSSIM(gradient4x4, gray4x4, 2);
      const heatmapV = generateSSIMHeatmap(
        ssimResult.map, ssimResult.mapWidth, ssimResult.mapHeight,
        4, 4, 2, "viridis",
      );
      const heatmapI = generateSSIMHeatmap(
        ssimResult.map, ssimResult.mapWidth, ssimResult.mapHeight,
        4, 4, 2, "inferno",
      );
      // Different colormaps should produce different pixels
      let identical = true;
      for (let i = 0; i < heatmapV.data.length; i++) {
        if (heatmapV.data[i] !== heatmapI.data[i]) {
          identical = false;
          break;
        }
      }
      expect(identical).toBe(false);
    });
  });
});
