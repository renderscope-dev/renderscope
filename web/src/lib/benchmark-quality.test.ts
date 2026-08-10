import { describe, it, expect } from "vitest";
import type { BenchmarkEntry } from "@/types/benchmark";
import {
  crossRendererPsnr,
  crossRendererSsim,
  entryIsSelfReferenced,
  isSelfReferenced,
} from "./benchmark-quality";
import { computeRankings } from "./benchmark-rankings";

function entry(
  renderer: string,
  referenceRenderer: string | undefined,
  psnr: number | undefined
): BenchmarkEntry {
  return {
    id: `cornell-box-${renderer}-hw-2026-01-01`,
    renderer,
    renderer_version: "1.0",
    scene: "cornell-box",
    timestamp: "2026-01-01T00:00:00+00:00",
    hardware: { id: "hw", label: "HW", cpu: "CPU", ram_gb: 32, os: "Linux" },
    settings: { resolution: [1920, 1080], samples_per_pixel: 1024 },
    results: { render_time_seconds: 10, output_image: "out.exr" },
    quality_vs_reference: referenceRenderer
      ? {
          reference_renderer: referenceRenderer,
          reference_samples: 65536,
          psnr,
          ssim: psnr === undefined ? undefined : 0.99,
        }
      : undefined,
  };
}

describe("isSelfReferenced", () => {
  it("is true when the reference renderer is the renderer under test", () => {
    expect(isSelfReferenced({ reference_renderer: "pbrt" }, "pbrt")).toBe(true);
  });

  it("is false for a genuine cross-renderer comparison", () => {
    expect(isSelfReferenced({ reference_renderer: "pbrt" }, "mitsuba3")).toBe(false);
  });

  it("is false when there is no quality block at all", () => {
    expect(isSelfReferenced(undefined, "pbrt")).toBe(false);
    expect(isSelfReferenced(null, "pbrt")).toBe(false);
  });

  it("is false when the reference renderer is unnamed", () => {
    expect(isSelfReferenced({ reference_renderer: "" }, "")).toBe(false);
  });
});

describe("cross-renderer metric extraction", () => {
  it("returns the value for a genuine cross-renderer comparison", () => {
    const e = entry("mitsuba3", "pbrt", 38.1);
    expect(crossRendererPsnr(e)).toBe(38.1);
    expect(crossRendererSsim(e)).toBe(0.99);
  });

  it("withholds self-referenced values", () => {
    const e = entry("blender-cycles", "blender-cycles", 67.4);
    expect(entryIsSelfReferenced(e)).toBe(true);
    expect(crossRendererPsnr(e)).toBeUndefined();
    expect(crossRendererSsim(e)).toBeUndefined();
  });

  it("returns undefined when no quality was measured", () => {
    expect(crossRendererPsnr(entry("pbrt", undefined, undefined))).toBeUndefined();
  });
});

describe("computeRankings — quality award", () => {
  const names = { pbrt: "PBRT", mitsuba3: "Mitsuba 3", "blender-cycles": "Cycles" };

  it("does not award quality when every record is self-referenced", () => {
    // Cycles' 67.4 dB against its own render dwarfs a real cross-renderer
    // score; awarding on it would rank renderers by how quietly they converge.
    const rankings = computeRankings(
      [entry("blender-cycles", "blender-cycles", 67.4), entry("pbrt", "pbrt", 61.2)],
      names
    );
    expect(rankings.find((r) => r.category === "highest-quality")).toBeUndefined();
  });

  it("still awards speed and memory when quality is not comparable", () => {
    const rankings = computeRankings(
      [entry("blender-cycles", "blender-cycles", 67.4), entry("pbrt", "pbrt", 61.2)],
      names
    );
    expect(rankings.map((r) => r.category)).toContain("fastest");
  });

  it("awards quality on genuine cross-renderer comparisons", () => {
    const rankings = computeRankings(
      [entry("mitsuba3", "pbrt", 38.1), entry("blender-cycles", "pbrt", 35.0)],
      names
    );
    const quality = rankings.find((r) => r.category === "highest-quality");
    expect(quality?.winnerId).toBe("mitsuba3");
  });

  it("ignores self-referenced records when both kinds are present", () => {
    const rankings = computeRankings(
      [
        entry("mitsuba3", "pbrt", 38.1),
        entry("blender-cycles", "pbrt", 35.0),
        // Would win outright on raw value, but is not comparable.
        entry("blender-cycles", "blender-cycles", 67.4),
      ],
      names
    );
    const quality = rankings.find((r) => r.category === "highest-quality");
    expect(quality?.winnerId).toBe("mitsuba3");
    expect(quality?.value).toBeCloseTo(38.1, 5);
  });
});
