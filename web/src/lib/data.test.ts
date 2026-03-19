/**
 * Tests for data loading utilities.
 *
 * These functions use Node.js `fs` for build-time data loading.
 * Since Vitest runs in Node, we can test them directly against
 * the actual data files — this validates both the loading logic
 * and the data integrity.
 */
import { describe, it, expect } from "vitest";
import {
  getAllRenderers,
  getRendererById,
  getAllRendererIds,
  getRenderersByIds,
  getRendererBySlug,
  getCatalogStats,
} from "./data";

describe("getAllRenderers", () => {
  it("returns a non-empty array", () => {
    const renderers = getAllRenderers();
    expect(renderers).toBeInstanceOf(Array);
    expect(renderers.length).toBeGreaterThan(0);
  });

  it("every renderer has required fields", () => {
    const renderers = getAllRenderers();
    for (const r of renderers) {
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("technique");
      expect(r).toHaveProperty("language");
      expect(r).toHaveProperty("license");
      expect(r).toHaveProperty("status");
      expect(r).toHaveProperty("platforms");
      expect(r).toHaveProperty("features");
      expect(typeof r.id).toBe("string");
      expect(typeof r.name).toBe("string");
      expect(r.id.length).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.technique).toBeInstanceOf(Array);
      expect(r.technique.length).toBeGreaterThan(0);
    }
  });

  it("returns renderers sorted alphabetically by name", () => {
    const renderers = getAllRenderers();
    for (let i = 1; i < renderers.length; i++) {
      const prev = renderers[i - 1]!.name.toLowerCase();
      const curr = renderers[i]!.name.toLowerCase();
      expect(prev <= curr).toBe(true);
    }
  });

  it("does not include template files", () => {
    const renderers = getAllRenderers();
    const ids = renderers.map((r) => r.id);
    expect(ids).not.toContain("_template");
  });
});

describe("getRendererById", () => {
  it("returns correct renderer for known id", () => {
    const renderer = getRendererById("pbrt");
    expect(renderer).not.toBeNull();
    expect(renderer!.id).toBe("pbrt");
    expect(renderer!.name).toContain("PBRT");
  });

  it("returns null for unknown id", () => {
    const renderer = getRendererById("nonexistent-renderer-xyz");
    expect(renderer).toBeNull();
  });

  it("getRendererBySlug is an alias for getRendererById", () => {
    const byId = getRendererById("pbrt");
    const bySlug = getRendererBySlug("pbrt");
    expect(byId).toEqual(bySlug);
  });
});

describe("getAllRendererIds", () => {
  it("returns a non-empty array of strings", () => {
    const ids = getAllRendererIds();
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it("does not include file extensions", () => {
    const ids = getAllRendererIds();
    for (const id of ids) {
      expect(id).not.toContain(".json");
    }
  });

  it("does not include template entries", () => {
    const ids = getAllRendererIds();
    expect(ids.every((id) => !id.startsWith("_"))).toBe(true);
  });
});

describe("getRenderersByIds", () => {
  it("returns renderers for valid ids", () => {
    const renderers = getRenderersByIds(["pbrt", "mitsuba3"]);
    expect(renderers).toHaveLength(2);
    const ids = renderers.map((r) => r.id);
    expect(ids).toContain("pbrt");
    expect(ids).toContain("mitsuba3");
  });

  it("skips unknown ids silently", () => {
    const renderers = getRenderersByIds(["pbrt", "nonexistent"]);
    expect(renderers).toHaveLength(1);
    expect(renderers[0]!.id).toBe("pbrt");
  });

  it("returns empty array for all-invalid ids", () => {
    const renderers = getRenderersByIds(["no1", "no2"]);
    expect(renderers).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(getRenderersByIds([])).toHaveLength(0);
  });
});

describe("getCatalogStats", () => {
  it("computes accurate statistics from real data", () => {
    const renderers = getAllRenderers();
    const stats = getCatalogStats(renderers);

    expect(stats.total).toBe(renderers.length);
    expect(stats.techniques).toBeGreaterThan(0);
    expect(stats.languages).toBeGreaterThan(0);
    expect(stats.licenses).toBeGreaterThan(0);
    expect(stats.activeCount).toBeGreaterThan(0);
    expect(stats.activeCount).toBeLessThanOrEqual(stats.total);
  });

  it("returns zeros for empty input", () => {
    const stats = getCatalogStats([]);
    expect(stats.total).toBe(0);
    expect(stats.techniques).toBe(0);
    expect(stats.languages).toBe(0);
    expect(stats.licenses).toBe(0);
    expect(stats.activeCount).toBe(0);
  });
});
