import type { BenchmarkEntry } from "@/types/benchmark";

// ═══════════════════════════════════════════════════════════════
// CHART UTILITIES — Shared across Benchmark Dashboard and
// Compare page charts. Provides consistent renderer colors
// and common chart helpers.
// ═══════════════════════════════════════════════════════════════

/**
 * A curated palette of distinct, colorblind-friendly colors
 * for chart series. Each color has sufficient contrast on
 * dark backgrounds and is visually distinguishable from its
 * neighbors — even at 5 simultaneous renderers.
 */
const CHART_COLORS = [
  "#6366f1", // indigo
  "#22d3ee", // cyan
  "#f59e0b", // amber
  "#ec4899", // pink
  "#10b981", // emerald
  "#f97316", // orange
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#ef4444", // red
  "#84cc16", // lime
  "#06b6d4", // dark cyan
  "#a855f7", // purple
] as const;

/**
 * Stable mapping from renderer IDs to chart colors.
 * Ensures the same renderer always gets the same color
 * across all charts and pages.
 */
const rendererColorCache = new Map<string, string>();
const assignedIndices: string[] = [];

/**
 * Get a consistent chart color for a renderer.
 * The same renderer ID always returns the same color.
 */
export function getRendererChartColor(rendererId: string): string {
  const cached = rendererColorCache.get(rendererId);
  if (cached) return cached;

  const index = assignedIndices.length;
  const color = CHART_COLORS[index % CHART_COLORS.length]!;
  rendererColorCache.set(rendererId, color);
  assignedIndices.push(rendererId);
  return color;
}

/**
 * Build a complete renderer color map from benchmark entries.
 * Ensures colors are assigned in a stable, deterministic order
 * (sorted alphabetically by renderer ID).
 */
export function buildRendererColorMap(
  entries: BenchmarkEntry[]
): Record<string, string> {
  const rendererIds = [...new Set(entries.map((e) => e.renderer))].sort();
  const map: Record<string, string> = {};

  for (const id of rendererIds) {
    map[id] = getRendererChartColor(id);
  }

  return map;
}

/**
 * Custom tooltip styling properties for Recharts.
 * Provides a consistent dark-themed tooltip appearance.
 */
export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },
  labelStyle: {
    color: "hsl(var(--foreground))",
    fontWeight: 600,
    marginBottom: "4px",
  },
  itemStyle: {
    color: "hsl(var(--muted-foreground))",
    fontSize: "12px",
    padding: "1px 0",
  },
} as const;

/**
 * Common axis styling for dark-themed Recharts charts.
 */
export const chartAxisStyle = {
  tick: {
    fill: "hsl(var(--muted-foreground))",
    fontSize: 12,
  },
  axisLine: {
    stroke: "hsl(var(--border))",
    strokeOpacity: 0.5,
  },
  tickLine: {
    stroke: "hsl(var(--border))",
    strokeOpacity: 0.3,
  },
} as const;

/**
 * Legend styling for Recharts.
 */
export const chartLegendStyle = {
  wrapperStyle: {
    paddingTop: "16px",
    fontSize: "13px",
  },
} as const;
