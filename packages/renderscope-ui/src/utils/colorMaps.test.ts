import { describe, it, expect } from "vitest";
import { getColor, getColorMap, COLOR_MAP_NAMES } from "./colorMaps";
import type { RGB } from "./colorMaps";

describe("colorMaps", () => {
  describe("COLOR_MAP_NAMES", () => {
    it("exports all three color map names", () => {
      expect(COLOR_MAP_NAMES).toEqual(["viridis", "inferno", "magma"]);
    });

    it("is a readonly array", () => {
      expect(Array.isArray(COLOR_MAP_NAMES)).toBe(true);
      expect(COLOR_MAP_NAMES.length).toBe(3);
    });
  });

  describe("getColor", () => {
    it.each(COLOR_MAP_NAMES)("returns valid RGB for %s at value 0", (name) => {
      const [r, g, b] = getColor(0, name);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    });

    it.each(COLOR_MAP_NAMES)("returns valid RGB for %s at value 1", (name) => {
      const [r, g, b] = getColor(1, name);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    });

    it.each(COLOR_MAP_NAMES)("returns valid RGB for %s at value 0.5", (name) => {
      const [r, g, b] = getColor(0.5, name);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    });

    it("clamps values below 0", () => {
      const at0 = getColor(0, "viridis");
      const below0 = getColor(-0.5, "viridis");
      expect(below0).toEqual(at0);
    });

    it("clamps values above 1", () => {
      const at1 = getColor(1, "viridis");
      const above1 = getColor(1.5, "viridis");
      expect(above1).toEqual(at1);
    });

    it("returns integer RGB values", () => {
      for (let v = 0; v <= 1; v += 0.1) {
        const [r, g, b] = getColor(v, "viridis");
        expect(Number.isInteger(r)).toBe(true);
        expect(Number.isInteger(g)).toBe(true);
        expect(Number.isInteger(b)).toBe(true);
      }
    });

    it("returns different colors at different positions for viridis", () => {
      const at0 = getColor(0, "viridis");
      const at1 = getColor(1, "viridis");
      // Viridis goes from dark purple to bright yellow — colors should differ
      expect(at0).not.toEqual(at1);
    });

    it("returns different colors for different colormaps at the same position", () => {
      const v = getColor(0.5, "viridis");
      const i = getColor(0.5, "inferno");
      const m = getColor(0.5, "magma");
      // At least some should differ
      const allSame = JSON.stringify(v) === JSON.stringify(i) && JSON.stringify(i) === JSON.stringify(m);
      expect(allSame).toBe(false);
    });

    it("returns an array of exactly 3 numbers", () => {
      const color: RGB = getColor(0.5, "viridis");
      expect(color).toHaveLength(3);
      expect(typeof color[0]).toBe("number");
      expect(typeof color[1]).toBe("number");
      expect(typeof color[2]).toBe("number");
    });
  });

  describe("getColorMap", () => {
    it.each(COLOR_MAP_NAMES)("returns a 256-entry LUT for %s", (name) => {
      const lut = getColorMap(name);
      expect(lut).toHaveLength(256);
    });

    it("all LUT entries are valid RGB tuples", () => {
      const lut = getColorMap("viridis");
      for (const entry of lut) {
        expect(entry).toHaveLength(3);
        const [r, g, b] = entry;
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(255);
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThanOrEqual(255);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(255);
      }
    });

    it("getColor(v) matches direct LUT lookup", () => {
      const lut = getColorMap("inferno");
      // getColor(0) should equal lut[0]
      expect(getColor(0, "inferno")).toEqual(lut[0]);
      // getColor(1) should equal lut[255]
      expect(getColor(1, "inferno")).toEqual(lut[255]);
    });
  });
});
