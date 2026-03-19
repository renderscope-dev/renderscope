import { describe, it, expect } from "vitest";
import { getColor, getColorMap, COLOR_MAP_NAMES } from "./color-maps";

describe("getColor", () => {
  it("returns RGB tuple for value 0 (start of colormap)", () => {
    const color = getColor(0, "viridis");
    expect(color).toHaveLength(3);
    // Viridis starts dark purple-ish
    expect(color[0]).toBeGreaterThanOrEqual(0);
    expect(color[0]).toBeLessThanOrEqual(255);
    expect(color[1]).toBeGreaterThanOrEqual(0);
    expect(color[2]).toBeGreaterThanOrEqual(0);
  });

  it("returns RGB tuple for value 1 (end of colormap)", () => {
    const color = getColor(1, "viridis");
    expect(color).toHaveLength(3);
    // Viridis ends bright yellow
    expect(color[0]).toBeGreaterThan(200); // R should be high
    expect(color[1]).toBeGreaterThan(200); // G should be high
  });

  it("clamps out-of-range values", () => {
    const below = getColor(-0.5, "viridis");
    const atZero = getColor(0, "viridis");
    expect(below).toEqual(atZero);

    const above = getColor(1.5, "viridis");
    const atOne = getColor(1, "viridis");
    expect(above).toEqual(atOne);
  });

  it("works for all colormaps at midpoint", () => {
    for (const name of COLOR_MAP_NAMES) {
      const color = getColor(0.5, name);
      expect(color).toHaveLength(3);
      for (const channel of color) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it("produces different colors for viridis vs inferno", () => {
    const viridis = getColor(0.5, "viridis");
    const inferno = getColor(0.5, "inferno");
    // They should produce different colors at the midpoint
    expect(viridis).not.toEqual(inferno);
  });
});

describe("getColorMap", () => {
  it("returns a 256-entry LUT", () => {
    const lut = getColorMap("viridis");
    expect(lut).toHaveLength(256);
  });

  it("every entry is an RGB triple", () => {
    const lut = getColorMap("inferno");
    for (const entry of lut) {
      expect(entry).toHaveLength(3);
      for (const channel of entry) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
        expect(Number.isInteger(channel)).toBe(true);
      }
    }
  });

  it("works for all colormap names", () => {
    for (const name of COLOR_MAP_NAMES) {
      const lut = getColorMap(name);
      expect(lut).toHaveLength(256);
    }
  });
});

describe("COLOR_MAP_NAMES", () => {
  it("contains viridis, inferno, magma", () => {
    expect(COLOR_MAP_NAMES).toContain("viridis");
    expect(COLOR_MAP_NAMES).toContain("inferno");
    expect(COLOR_MAP_NAMES).toContain("magma");
  });
});
