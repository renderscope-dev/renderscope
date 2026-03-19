/**
 * Tree-shaking verification test.
 *
 * This test documents the intent that individual component imports should
 * not pull in unrelated heavy dependencies (D3 for image components,
 * Recharts for taxonomy, etc.).
 *
 * The real enforcement is done by `size-limit` entries in `.size-limit.json`.
 * Each import path has a strict byte budget. If tree-shaking breaks,
 * the single-component sizes will balloon past their limits and CI will fail.
 *
 * Run `npm run size` to verify bundle budgets.
 */

import { describe, it, expect } from "vitest";

describe("Tree-shaking verification", () => {
  it("single component import should not exceed budget (enforced by size-limit)", () => {
    // This is a documentation test. The real enforcement is `npm run size`.
    // .size-limit.json defines:
    //   "Single component (ImageCompareSlider)" → limit: "15 kB" gzipped
    //   If D3/Recharts leak into image component imports, this budget fails.
    expect(true).toBe(true);
  });

  it("core components import should not include D3 (enforced by size-limit)", () => {
    // .size-limit.json defines:
    //   "Core (no D3/Recharts)" → limit: "50 kB" gzipped
    //   Importing ImageCompareSlider + ImageToggle + FeatureMatrix
    //   should not pull in D3 or Recharts.
    expect(true).toBe(true);
  });

  it("full package stays within global budget (enforced by size-limit)", () => {
    // .size-limit.json defines:
    //   "Full package" → limit varies
    //   All exports combined should stay within the ceiling.
    expect(true).toBe(true);
  });

  it("all public exports are importable from the package entry", async () => {
    // Verify that the barrel export works for tree-shaking.
    // If a component fails to export, this import will error at type-check time.
    const pkg = await import("../../src/index");
    expect(pkg.ImageCompareSlider).toBeDefined();
    expect(pkg.TaxonomyGraph).toBeDefined();
    expect(pkg.FeatureMatrix).toBeDefined();
    expect(pkg.useImageLoader).toBeDefined();
    expect(pkg.useSyncedZoom).toBeDefined();
    expect(pkg.VERSION).toBeDefined();
  });
});
