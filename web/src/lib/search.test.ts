import { describe, it, expect } from "vitest";
import { createSearchIndex, searchRenderers } from "./search";
import { mockRenderers } from "@/__tests__/mocks/renderers";

describe("createSearchIndex", () => {
  it("creates a Fuse index from renderers", () => {
    const index = createSearchIndex(mockRenderers);
    expect(index).toBeDefined();
    expect(index.search).toBeDefined();
  });
});

describe("searchRenderers", () => {
  const index = createSearchIndex(mockRenderers);

  it("returns all renderers for empty query", () => {
    const results = searchRenderers(index, "", mockRenderers);
    expect(results).toHaveLength(mockRenderers.length);
  });

  it("returns all renderers for whitespace-only query", () => {
    const results = searchRenderers(index, "   ", mockRenderers);
    expect(results).toHaveLength(mockRenderers.length);
  });

  it("finds exact name match", () => {
    const results = searchRenderers(index, "PBRT", mockRenderers);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.id).toBe("pbrt");
  });

  it("finds partial name match", () => {
    const results = searchRenderers(index, "Mits", mockRenderers);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === "mitsuba3")).toBe(true);
  });

  it("is case-insensitive", () => {
    const lower = searchRenderers(index, "pbrt", mockRenderers);
    const upper = searchRenderers(index, "PBRT", mockRenderers);
    expect(lower.length).toBeGreaterThan(0);
    expect(lower[0]!.id).toBe(upper[0]!.id);
  });

  it("searches by tags", () => {
    const results = searchRenderers(index, "educational", mockRenderers);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.id).toBe("pbrt");
  });

  it("searches by description", () => {
    const results = searchRenderers(index, "differentiable", mockRenderers);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === "mitsuba3")).toBe(true);
  });

  it("returns empty for nonsense query", () => {
    const results = searchRenderers(index, "xyznonexistent123", mockRenderers);
    expect(results).toHaveLength(0);
  });

  it("searches by technique", () => {
    const results = searchRenderers(index, "rasterization", mockRenderers);
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("three-js");
  });

  it("searches by language", () => {
    const results = searchRenderers(index, "Python", mockRenderers);
    expect(results.length).toBeGreaterThan(0);
  });
});
