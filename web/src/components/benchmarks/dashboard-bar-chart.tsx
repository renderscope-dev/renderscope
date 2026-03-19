"use client";

import { useState, useMemo, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { BenchmarkEntry } from "@/types/benchmark";
import { formatRenderTime } from "@/lib/utils";
import { formatMemory, formatPSNR, formatSSIM } from "@/lib/format";
import { chartTooltipStyle, chartAxisStyle } from "@/lib/chart-utils";
import { describeBarChart } from "@/lib/a11y-utils";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// DASHBOARD BAR CHART — Grouped bar chart showing renderer
// performance across benchmark scenes with metric/grouping
// switchers and chart→table click interactivity.
// ═══════════════════════════════════════════════════════════════

type ChartMetric = "renderTime" | "memory" | "psnr" | "ssim";
type GroupBy = "scene" | "renderer";

const METRIC_CONFIG: Record<
  ChartMetric,
  { label: string; format: (v: number) => string; unit: string }
> = {
  renderTime: { label: "Render Time", format: (v) => formatRenderTime(v), unit: "s" },
  memory: { label: "Memory", format: (v) => formatMemory(v), unit: "MB" },
  psnr: { label: "PSNR", format: (v) => formatPSNR(v), unit: "dB" },
  ssim: { label: "SSIM", format: (v) => formatSSIM(v), unit: "" },
};

function extractMetricValue(entry: BenchmarkEntry, metric: ChartMetric): number {
  switch (metric) {
    case "renderTime":
      return entry.results.render_time_seconds;
    case "memory":
      return entry.results.peak_memory_mb;
    case "psnr":
      return entry.quality_vs_reference.psnr;
    case "ssim":
      return entry.quality_vs_reference.ssim;
  }
}

interface DashboardBarChartProps {
  entries: BenchmarkEntry[];
  rendererColors: Record<string, string>;
  rendererNames: Record<string, string>;
  onBarClick?: (benchmarkId: string) => void;
  className?: string;
}

export function DashboardBarChart({
  entries,
  rendererColors,
  rendererNames,
  onBarClick,
  className,
}: DashboardBarChartProps) {
  const [metric, setMetric] = useState<ChartMetric>("renderTime");
  const [groupBy, setGroupBy] = useState<GroupBy>("scene");
  const prefersReducedMotion = useReducedMotion();

  const metricCfg = METRIC_CONFIG[metric];

  // Build an entry-to-id lookup for click handling
  const entryIdLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const entry of entries) {
      // key: "renderer|scene" → entry.id
      lookup.set(`${entry.renderer}|${entry.scene}`, entry.id);
    }
    return lookup;
  }, [entries]);

  // Unique renderers and scenes from current entries
  const renderers = useMemo(
    () => [...new Set(entries.map((e) => e.renderer))].sort(),
    [entries]
  );
  const scenes = useMemo(
    () => [...new Set(entries.map((e) => e.scene))].sort(),
    [entries]
  );

  // Build chart data grouped by the selected dimension
  const chartData = useMemo(() => {
    if (groupBy === "scene") {
      return scenes.map((scene) => {
        const point: Record<string, string | number> = {
          name: rendererNames[scene] ?? scene.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        };
        for (const renderer of renderers) {
          const entry = entries.find(
            (e) => e.scene === scene && e.renderer === renderer
          );
          point[renderer] = entry ? extractMetricValue(entry, metric) : 0;
        }
        return point;
      });
    }

    // groupBy === "renderer"
    return renderers.map((renderer) => {
      const point: Record<string, string | number> = {
        name: rendererNames[renderer] ?? renderer,
      };
      for (const scene of scenes) {
        const entry = entries.find(
          (e) => e.renderer === renderer && e.scene === scene
        );
        point[scene] = entry ? extractMetricValue(entry, metric) : 0;
      }
      return point;
    });
  }, [entries, renderers, scenes, metric, groupBy, rendererNames]);

  // The data keys for bars (each series = one renderer or scene)
  const barKeys = groupBy === "scene" ? renderers : scenes;

  const handleChartClick = useCallback(
    (state: Record<string, unknown>) => {
      if (!onBarClick) return;
      const activePayload = state["activePayload"] as
        | Array<{ payload?: Record<string, string | number> }>
        | undefined;
      if (!activePayload?.length) return;
      const payload = activePayload[0]?.payload;
      if (!payload) return;

      // Determine which bar was actually closest
      const groupName = payload["name"] as string;
      // For grouped bar chart, we can identify the clicked entry from the active label
      // Find the first renderer/scene match
      if (groupBy === "scene") {
        const scene = scenes.find(
          (s) =>
            (rendererNames[s] ?? s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())) ===
            groupName
        );
        if (scene) {
          // Just pick the first renderer with data — the click is on the group
          for (const renderer of renderers) {
            const id = entryIdLookup.get(`${renderer}|${scene}`);
            if (id) {
              onBarClick(id);
              return;
            }
          }
        }
      } else {
        const renderer = renderers.find(
          (r) => (rendererNames[r] ?? r) === groupName
        );
        if (renderer) {
          for (const scene of scenes) {
            const id = entryIdLookup.get(`${renderer}|${scene}`);
            if (id) {
              onBarClick(id);
              return;
            }
          }
        }
      }
    },
    [onBarClick, groupBy, renderers, scenes, rendererNames, entryIdLookup]
  );

  const getBarColor = (key: string) => {
    if (groupBy === "scene") {
      return rendererColors[key] ?? "#6366f1";
    }
    // When grouped by renderer, color by scene using a fixed palette
    const sceneColors = ["#6366f1", "#22d3ee", "#f59e0b", "#ec4899", "#10b981"];
    const idx = scenes.indexOf(key);
    return sceneColors[idx % sceneColors.length] ?? "#6366f1";
  };

  if (entries.length === 0) return null;

  return (
    <div className={className}>
      {/* Section heading */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Performance Comparison
        </h3>
        <p className="text-sm text-muted-foreground">
          Render time, memory usage, and image quality across standard benchmark
          scenes.{" "}
          {onBarClick && (
            <span className="text-muted-foreground">
              Click any bar group to highlight it in the table above.
            </span>
          )}
        </p>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Metric switcher */}
        <div role="group" aria-label="Chart metric" className="flex rounded-lg border border-border/50 bg-card p-0.5">
          {(Object.keys(METRIC_CONFIG) as ChartMetric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              aria-pressed={metric === m}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                metric === m
                  ? "bg-blue-700 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>

        {/* Group-by switcher */}
        <div role="group" aria-label="Group by" className="flex rounded-lg border border-border/50 bg-card p-0.5">
          <button
            type="button"
            onClick={() => setGroupBy("scene")}
            aria-pressed={groupBy === "scene"}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              groupBy === "scene"
                ? "bg-blue-700 text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            By Scene
          </button>
          <button
            type="button"
            onClick={() => setGroupBy("renderer")}
            aria-pressed={groupBy === "renderer"}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              groupBy === "renderer"
                ? "bg-blue-700 text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            By Renderer
          </button>
        </div>
      </div>

      {/* Chart */}
      <figure
        className="overflow-x-auto rounded-xl border border-border/50 bg-card p-4"
        role="group"
        aria-label={`Bar chart comparing ${metricCfg.label} across ${renderers.length} renderers and ${scenes.length} scenes`}
      >
        <figcaption className="sr-only">
          {describeBarChart(
            chartData.flatMap((point) =>
              barKeys
                .map((key) => ({
                  label: `${String(point["name"] ?? "")} — ${groupBy === "scene" ? (rendererNames[key] ?? key) : key}`,
                  value: Number(point[key] ?? 0),
                }))
                .filter((d) => d.value > 0)
            ),
            metricCfg.label,
            metricCfg.unit
          )}
        </figcaption>
        <div className="min-w-[500px]">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={chartData}
              onClick={onBarClick ? handleChartClick : undefined}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                {...chartAxisStyle}
                interval={0}
                tick={{ ...chartAxisStyle.tick, fontSize: 11 }}
                angle={chartData.length > 5 ? -20 : 0}
                textAnchor={chartData.length > 5 ? "end" : "middle"}
                height={chartData.length > 5 ? 60 : 40}
              />
              <YAxis
                {...chartAxisStyle}
                tickFormatter={(v: number) => {
                  if (metric === "ssim") return v.toFixed(2);
                  if (metric === "psnr") return `${v.toFixed(0)}`;
                  if (metric === "memory") return `${Math.round(v)}`;
                  return formatRenderTime(v);
                }}
                width={65}
              />
              <Tooltip
                {...chartTooltipStyle}
                formatter={(value: number | undefined, name: string | undefined) => [
                  value != null ? metricCfg.format(value) : "—",
                  groupBy === "scene"
                    ? (rendererNames[name ?? ""] ?? name ?? "")
                    : (name ?? "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                ]}
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.15 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                formatter={(value: string) =>
                  groupBy === "scene"
                    ? (rendererNames[value] ?? value)
                    : value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                }
              />
              {barKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={getBarColor(key)}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={500}
                  cursor={onBarClick ? "pointer" : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
