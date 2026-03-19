import { describe, it, expect } from "vitest";
import {
  getRendererChartColor,
  buildRendererColorMap,
  chartTooltipStyle,
  chartAxisStyle,
} from "./chart-utils";
import type { BenchmarkEntry } from "@/types/benchmark";

describe("getRendererChartColor", () => {
  it("returns a hex color string", () => {
    const color = getRendererChartColor("pbrt");
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns the same color for the same renderer", () => {
    const first = getRendererChartColor("test-renderer-a");
    const second = getRendererChartColor("test-renderer-a");
    expect(first).toBe(second);
  });

  it("returns different colors for different renderers", () => {
    const a = getRendererChartColor("unique-a");
    const b = getRendererChartColor("unique-b");
    expect(a).not.toBe(b);
  });
});

describe("buildRendererColorMap", () => {
  it("builds a color map from benchmark entries", () => {
    const entries = [
      { renderer: "pbrt" },
      { renderer: "mitsuba3" },
      { renderer: "pbrt" }, // duplicate
    ] as BenchmarkEntry[];

    const map = buildRendererColorMap(entries);
    expect(Object.keys(map)).toHaveLength(2);
    expect(map["pbrt"]).toBeDefined();
    expect(map["mitsuba3"]).toBeDefined();
  });

  it("returns empty object for empty input", () => {
    const map = buildRendererColorMap([]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("assigns consistent colors regardless of entry order", () => {
    const entries1 = [
      { renderer: "a-renderer" },
      { renderer: "b-renderer" },
    ] as BenchmarkEntry[];

    const entries2 = [
      { renderer: "b-renderer" },
      { renderer: "a-renderer" },
    ] as BenchmarkEntry[];

    const map1 = buildRendererColorMap(entries1);
    const map2 = buildRendererColorMap(entries2);

    // Both maps should have the same colors for the same renderers
    // because buildRendererColorMap sorts alphabetically
    expect(map1["a-renderer"]).toBe(map2["a-renderer"]);
    expect(map1["b-renderer"]).toBe(map2["b-renderer"]);
  });
});

describe("chart style constants", () => {
  it("chartTooltipStyle has required properties", () => {
    expect(chartTooltipStyle.contentStyle).toBeDefined();
    expect(chartTooltipStyle.labelStyle).toBeDefined();
    expect(chartTooltipStyle.itemStyle).toBeDefined();
  });

  it("chartAxisStyle has required properties", () => {
    expect(chartAxisStyle.tick).toBeDefined();
    expect(chartAxisStyle.axisLine).toBeDefined();
    expect(chartAxisStyle.tickLine).toBeDefined();
  });
});
