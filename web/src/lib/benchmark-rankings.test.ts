import { describe, it, expect } from "vitest";
import { computeRankings, type RankingResult } from "./benchmark-rankings";
import type { BenchmarkEntry } from "@/types/benchmark";

/** Helper to create a minimal BenchmarkEntry for ranking tests. */
function makeBenchmark(
  renderer: string,
  scene: string,
  renderTime: number,
  peakMemory: number,
  psnr: number,
  ssim: number,
): BenchmarkEntry {
  return {
    id: `${renderer}-${scene}`,
    renderer,
    renderer_version: "1.0",
    scene,
    timestamp: "2025-01-01T00:00:00Z",
    hardware: {
      id: "hw1",
      label: "Test HW",
      cpu: "Test CPU",
      gpu: "Test GPU",
      ram_gb: 32,
      os: "Linux",
    },
    settings: {
      resolution: [1920, 1080],
      samples_per_pixel: 1024,
    },
    results: {
      render_time_seconds: renderTime,
      peak_memory_mb: peakMemory,
    },
    quality_vs_reference: {
      reference_renderer: "reference",
      reference_samples: 4096,
      psnr,
      ssim,
    },
    convergence: [],
  };
}

const RENDERER_NAMES: Record<string, string> = {
  fast: "Fast Renderer",
  slow: "Slow Renderer",
  medium: "Medium Renderer",
};

describe("computeRankings", () => {
  it("returns empty array with fewer than 2 renderers", () => {
    const entries = [makeBenchmark("fast", "scene1", 10, 512, 40, 0.99)];
    expect(computeRankings(entries, RENDERER_NAMES)).toEqual([]);
  });

  it("returns empty array with no entries", () => {
    expect(computeRankings([], RENDERER_NAMES)).toEqual([]);
  });

  it("returns 3 ranking categories with sufficient data", () => {
    const entries = [
      makeBenchmark("fast", "scene1", 10, 1024, 35, 0.95),
      makeBenchmark("slow", "scene1", 60, 512, 42, 0.99),
    ];

    const rankings = computeRankings(entries, RENDERER_NAMES);
    expect(rankings).toHaveLength(3);

    const categories = rankings.map((r) => r.category);
    expect(categories).toContain("fastest");
    expect(categories).toContain("memory-efficient");
    expect(categories).toContain("highest-quality");
  });

  it("identifies fastest renderer correctly", () => {
    const entries = [
      makeBenchmark("fast", "scene1", 10, 1024, 35, 0.95),
      makeBenchmark("slow", "scene1", 60, 512, 42, 0.99),
      makeBenchmark("fast", "scene2", 15, 1024, 36, 0.96),
      makeBenchmark("slow", "scene2", 55, 512, 41, 0.98),
    ];

    const rankings = computeRankings(entries, RENDERER_NAMES);
    const fastest = rankings.find(
      (r) => r.category === "fastest",
    ) as RankingResult;

    expect(fastest.winnerId).toBe("fast");
    expect(fastest.winnerName).toBe("Fast Renderer");
    expect(fastest.value).toBe(12.5); // avg(10, 15)
    expect(fastest.sceneCount).toBe(2);
    expect(fastest.icon).toBe("Zap");
    expect(fastest.accentColor).toBe("amber");
  });

  it("identifies most memory-efficient renderer correctly", () => {
    const entries = [
      makeBenchmark("fast", "scene1", 10, 1024, 35, 0.95),
      makeBenchmark("slow", "scene1", 60, 256, 42, 0.99),
    ];

    const rankings = computeRankings(entries, RENDERER_NAMES);
    const memEfficient = rankings.find(
      (r) => r.category === "memory-efficient",
    ) as RankingResult;

    expect(memEfficient.winnerId).toBe("slow");
    expect(memEfficient.winnerName).toBe("Slow Renderer");
    expect(memEfficient.value).toBe(256);
    expect(memEfficient.icon).toBe("HardDrive");
    expect(memEfficient.accentColor).toBe("teal");
  });

  it("identifies highest quality renderer correctly", () => {
    const entries = [
      makeBenchmark("fast", "scene1", 10, 1024, 35, 0.95),
      makeBenchmark("slow", "scene1", 60, 512, 42, 0.99),
    ];

    const rankings = computeRankings(entries, RENDERER_NAMES);
    const quality = rankings.find(
      (r) => r.category === "highest-quality",
    ) as RankingResult;

    expect(quality.winnerId).toBe("slow");
    expect(quality.winnerName).toBe("Slow Renderer");
    expect(quality.value).toBe(42);
    expect(quality.icon).toBe("Target");
    expect(quality.accentColor).toBe("violet");
  });

  it("includes runners-up (up to 3)", () => {
    const entries = [
      makeBenchmark("fast", "scene1", 10, 512, 35, 0.95),
      makeBenchmark("slow", "scene1", 60, 2048, 42, 0.99),
      makeBenchmark("medium", "scene1", 30, 1024, 38, 0.97),
    ];

    const rankings = computeRankings(entries, RENDERER_NAMES);
    const fastest = rankings.find(
      (r) => r.category === "fastest",
    ) as RankingResult;

    expect(fastest.runners).toHaveLength(2);
    expect(fastest.runners[0]!.rendererId).toBe("medium");
    expect(fastest.runners[1]!.rendererId).toBe("slow");
  });

  it("averages across multiple scenes per renderer", () => {
    const entries = [
      makeBenchmark("fast", "scene1", 10, 512, 30, 0.90),
      makeBenchmark("fast", "scene2", 20, 768, 40, 0.95),
      makeBenchmark("slow", "scene1", 100, 256, 45, 0.99),
    ];

    const rankings = computeRankings(entries, RENDERER_NAMES);
    const fastest = rankings.find(
      (r) => r.category === "fastest",
    ) as RankingResult;

    // fast: avg(10, 20) = 15, slow: avg(100) = 100
    expect(fastest.winnerId).toBe("fast");
    expect(fastest.value).toBe(15);
    expect(fastest.sceneCount).toBe(2);
  });

  it("falls back to renderer ID when name map is missing", () => {
    const entries = [
      makeBenchmark("unknown-a", "scene1", 10, 512, 35, 0.95),
      makeBenchmark("unknown-b", "scene1", 60, 256, 42, 0.99),
    ];

    const rankings = computeRankings(entries, {});
    const fastest = rankings.find(
      (r) => r.category === "fastest",
    ) as RankingResult;

    expect(fastest.winnerName).toBe("unknown-a");
  });

  it("formattedValue contains meaningful text", () => {
    const entries = [
      makeBenchmark("fast", "scene1", 10, 512, 35, 0.95),
      makeBenchmark("slow", "scene1", 60, 256, 42, 0.99),
    ];

    const rankings = computeRankings(entries, RENDERER_NAMES);
    for (const ranking of rankings) {
      expect(ranking.formattedValue.length).toBeGreaterThan(0);
      expect(ranking.formattedValue).toContain("avg");
    }
  });
});
