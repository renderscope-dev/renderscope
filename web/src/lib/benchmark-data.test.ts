/**
 * Tests for benchmark data loading utilities.
 *
 * These functions use Node.js `fs` for build-time data loading.
 * Since Vitest runs in Node, we can test them directly against
 * the actual data files — this validates both the loading logic
 * and the data integrity.
 */
import { describe, it, expect } from "vitest";
import type { BenchmarkEntry } from "@/types/benchmark";
import {
  getAllBenchmarks,
  getHardwareProfiles,
  getRendererNameMap,
  getSceneNameMap,
  toBenchmarkTableRows,
  getBenchmarkOverview,
} from "./benchmark-data";

describe("getAllBenchmarks", () => {
  it("returns a non-empty array", () => {
    const benchmarks = getAllBenchmarks();
    expect(benchmarks).toBeInstanceOf(Array);
    expect(benchmarks.length).toBeGreaterThan(0);
  });

  it("every benchmark has required fields", () => {
    const benchmarks = getAllBenchmarks();
    for (const b of benchmarks) {
      expect(b).toHaveProperty("id");
      expect(b).toHaveProperty("renderer");
      expect(b).toHaveProperty("scene");
      expect(b).toHaveProperty("timestamp");
      expect(b).toHaveProperty("hardware");
      expect(b).toHaveProperty("settings");
      expect(b).toHaveProperty("results");
      expect(typeof b.id).toBe("string");
      expect(typeof b.renderer).toBe("string");
      expect(typeof b.scene).toBe("string");
    }
  });

  it("returns benchmarks sorted by timestamp descending", () => {
    const benchmarks = getAllBenchmarks();
    for (let i = 1; i < benchmarks.length; i++) {
      const prev = new Date(benchmarks[i - 1]!.timestamp).getTime();
      const curr = new Date(benchmarks[i]!.timestamp).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("every benchmark has valid hardware profile", () => {
    const benchmarks = getAllBenchmarks();
    for (const b of benchmarks) {
      expect(b.hardware).toHaveProperty("id");
      expect(b.hardware).toHaveProperty("label");
      expect(b.hardware).toHaveProperty("cpu");
      expect(b.hardware).toHaveProperty("gpu");
      expect(typeof b.hardware.ram_gb).toBe("number");
    }
  });

  it("every benchmark has valid results", () => {
    const benchmarks = getAllBenchmarks();
    for (const b of benchmarks) {
      expect(b.results.render_time_seconds).toBeGreaterThan(0);
      expect(b.results.output_image).toBeTruthy();
      if (b.results.peak_memory_mb !== undefined) {
        expect(b.results.peak_memory_mb).toBeGreaterThan(0);
      }
    }
  });

  // `quality_vs_reference` is optional in benchmark.schema.json: a run with no
  // reference image to compare against has no quality block at all. Where it is
  // present, the metrics must still be in range.
  it("quality metrics, where present, are in range", () => {
    const benchmarks = getAllBenchmarks();
    for (const b of benchmarks) {
      const quality = b.quality_vs_reference;
      if (!quality) continue;

      expect(typeof quality.reference_renderer).toBe("string");
      expect(quality.reference_samples).toBeGreaterThan(0);
      if (quality.psnr !== undefined) {
        expect(quality.psnr).toBeGreaterThan(0);
      }
      if (quality.ssim !== undefined) {
        expect(quality.ssim).toBeGreaterThan(0);
        expect(quality.ssim).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("getHardwareProfiles", () => {
  it("extracts unique hardware profiles from benchmarks", () => {
    const benchmarks = getAllBenchmarks();
    const profiles = getHardwareProfiles(benchmarks);

    expect(profiles.length).toBeGreaterThan(0);

    const ids = profiles.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("returns empty array for empty input", () => {
    const profiles = getHardwareProfiles([]);
    expect(profiles).toHaveLength(0);
  });

  it("every profile has required fields", () => {
    const benchmarks = getAllBenchmarks();
    const profiles = getHardwareProfiles(benchmarks);
    for (const p of profiles) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.label).toBe("string");
      expect(typeof p.cpu).toBe("string");
      expect(typeof p.gpu).toBe("string");
      expect(typeof p.ram_gb).toBe("number");
      expect(typeof p.os).toBe("string");
    }
  });
});

describe("getRendererNameMap", () => {
  it("returns a non-empty object", () => {
    const map = getRendererNameMap();
    expect(Object.keys(map).length).toBeGreaterThan(0);
  });

  it("every entry has name and technique array", () => {
    const map = getRendererNameMap();
    for (const [key, value] of Object.entries(map)) {
      expect(typeof key).toBe("string");
      expect(typeof value.name).toBe("string");
      expect(value.technique).toBeInstanceOf(Array);
    }
  });
});

describe("getSceneNameMap", () => {
  it("returns a non-empty object", () => {
    const map = getSceneNameMap();
    expect(Object.keys(map).length).toBeGreaterThan(0);
  });

  it("every entry has a name", () => {
    const map = getSceneNameMap();
    for (const [key, value] of Object.entries(map)) {
      expect(typeof key).toBe("string");
      expect(typeof value.name).toBe("string");
    }
  });
});

describe("toBenchmarkTableRows", () => {
  /**
   * A run with no reference image has no `quality_vs_reference` block — the
   * schema makes it optional, and `renderscope publish` omits it rather than
   * writing nulls. Reading through it unconditionally used to throw a
   * TypeError during `next build`, failing the whole static export on an
   * otherwise valid contribution.
   */
  const entryWithoutQuality: BenchmarkEntry = {
    id: "cornell-box-pbrt-ryzen-7950x-2026-07-29",
    renderer: "pbrt",
    renderer_version: "4.0.0",
    scene: "cornell-box",
    timestamp: "2026-07-29T00:00:00+00:00",
    hardware: {
      id: "ryzen-7950x",
      label: "AMD Ryzen 9 7950X",
      cpu: "AMD Ryzen 9 7950X",
      ram_gb: 64,
      os: "Ubuntu 24.04",
    },
    settings: { resolution: [1920, 1080], samples_per_pixel: 1024 },
    results: {
      render_time_seconds: 47.3,
      output_image: "renderscope-results/cornell-box/pbrt_1024spp.exr",
    },
  };

  it("handles a benchmark with no quality metrics", () => {
    const rows = toBenchmarkTableRows([entryWithoutQuality], {}, {});

    expect(rows).toHaveLength(1);
    expect(rows[0]!.psnr).toBeUndefined();
    expect(rows[0]!.ssim).toBeUndefined();
    expect(rows[0]!.renderTime).toBe(47.3);
    expect(rows[0]!.resolution).toBe("1920\u00d71080");
  });

  it("handles a benchmark with no memory measurement", () => {
    const rows = toBenchmarkTableRows([entryWithoutQuality], {}, {});
    expect(rows[0]!.peakMemory).toBeUndefined();
  });

  it("transforms benchmark entries into table rows", () => {
    const benchmarks = getAllBenchmarks();
    const rendererNames = getRendererNameMap();
    const sceneNames = getSceneNameMap();

    const rows = toBenchmarkTableRows(benchmarks, rendererNames, sceneNames);
    expect(rows).toHaveLength(benchmarks.length);
  });

  it("flattens nested data correctly", () => {
    const benchmarks = getAllBenchmarks();
    const rendererNames = getRendererNameMap();
    const sceneNames = getSceneNameMap();

    const rows = toBenchmarkTableRows(benchmarks, rendererNames, sceneNames);
    for (const row of rows) {
      expect(typeof row.id).toBe("string");
      expect(typeof row.renderer).toBe("string");
      expect(typeof row.rendererName).toBe("string");
      expect(row.rendererTechnique).toBeInstanceOf(Array);
      expect(typeof row.scene).toBe("string");
      expect(typeof row.sceneName).toBe("string");
      expect(typeof row.renderTime).toBe("number");
      expect(typeof row.hardwareId).toBe("string");
      expect(typeof row.hardwareLabel).toBe("string");
      expect(row.resolution).toMatch(/^\d+×\d+$/);
      // Optional per the schema — present as a number or absent, never NaN.
      for (const value of [row.peakMemory, row.psnr, row.ssim, row.spp]) {
        expect(value === undefined || Number.isFinite(value)).toBe(true);
      }
      expect(typeof row.timestamp).toBe("string");
    }
  });

  it("enriches renderer names from the name map", () => {
    const benchmarks = getAllBenchmarks();
    const rendererNames = getRendererNameMap();
    const sceneNames = getSceneNameMap();

    const rows = toBenchmarkTableRows(benchmarks, rendererNames, sceneNames);

    for (const row of rows) {
      const lookupName = rendererNames[row.renderer]?.name;
      if (lookupName) {
        expect(row.rendererName).toBe(lookupName);
      }
    }
  });

  it("returns empty array for empty input", () => {
    const rows = toBenchmarkTableRows([], {}, {});
    expect(rows).toHaveLength(0);
  });
});

describe("getBenchmarkOverview", () => {
  it("computes accurate overview from real data", () => {
    const benchmarks = getAllBenchmarks();
    const overview = getBenchmarkOverview(benchmarks);

    expect(overview.totalBenchmarks).toBe(benchmarks.length);
    expect(overview.renderersCount).toBeGreaterThan(0);
    expect(overview.scenesCount).toBeGreaterThan(0);
    expect(overview.hardwareProfilesCount).toBeGreaterThan(0);
  });

  it("counts unique renderers correctly", () => {
    const benchmarks = getAllBenchmarks();
    const overview = getBenchmarkOverview(benchmarks);
    const uniqueRenderers = new Set(benchmarks.map((b) => b.renderer));
    expect(overview.renderersCount).toBe(uniqueRenderers.size);
  });

  it("counts unique scenes correctly", () => {
    const benchmarks = getAllBenchmarks();
    const overview = getBenchmarkOverview(benchmarks);
    const uniqueScenes = new Set(benchmarks.map((b) => b.scene));
    expect(overview.scenesCount).toBe(uniqueScenes.size);
  });

  it("returns zeros for empty input", () => {
    const overview = getBenchmarkOverview([]);
    expect(overview.totalBenchmarks).toBe(0);
    expect(overview.renderersCount).toBe(0);
    expect(overview.scenesCount).toBe(0);
    expect(overview.hardwareProfilesCount).toBe(0);
  });
});
