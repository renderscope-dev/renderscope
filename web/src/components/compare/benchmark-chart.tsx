"use client";

import { useState, useMemo } from "react";
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
import { Timer, HardDrive, Target, Sparkles, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { describeBarChart } from "@/lib/a11y-utils";
import type {
  ChartBenchmarkEntry,
  BenchmarkMetric,
  GroupByMode,
} from "@/types/benchmark";

// ── Types & config ─────────────────────────────────────────────

interface BenchmarkChartProps {
  entries: ChartBenchmarkEntry[];
  rendererColors: Record<string, string>;
  className?: string;
}

interface MetricConfig {
  label: string;
  icon: React.ReactNode;
  unit: string;
  format: (value: number) => string;
  tooltipFormat: (value: number) => string;
  accessor: (entry: ChartBenchmarkEntry) => number | undefined;
}

const METRIC_CONFIGS: Record<BenchmarkMetric, MetricConfig> = {
  render_time: {
    label: "Render Time",
    icon: <Timer className="h-3.5 w-3.5" />,
    unit: "s",
    format: (v) => `${v.toFixed(1)}s`,
    tooltipFormat: (v) => {
      if (v >= 60) {
        const m = Math.floor(v / 60);
        const s = Math.round(v % 60);
        return `${v.toFixed(1)}s (${m}m ${s}s)`;
      }
      return `${v.toFixed(1)}s`;
    },
    accessor: (e) => e.render_time_seconds,
  },
  memory: {
    label: "Memory",
    icon: <HardDrive className="h-3.5 w-3.5" />,
    unit: "MB",
    format: (v) => (v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${Math.round(v)} MB`),
    tooltipFormat: (v) =>
      v >= 1024
        ? `${(v / 1024).toFixed(2)} GB (${Math.round(v)} MB)`
        : `${Math.round(v)} MB`,
    accessor: (e) => e.peak_memory_mb,
  },
  psnr: {
    label: "PSNR",
    icon: <Target className="h-3.5 w-3.5" />,
    unit: "dB",
    format: (v) => `${v.toFixed(1)} dB`,
    tooltipFormat: (v) => `${v.toFixed(2)} dB`,
    accessor: (e) => e.psnr,
  },
  ssim: {
    label: "SSIM",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    unit: "",
    format: (v) => v.toFixed(4),
    tooltipFormat: (v) => v.toFixed(4),
    accessor: (e) => e.ssim,
  },
};

// ── Data transformation ────────────────────────────────────────

interface ChartDataPoint {
  name: string;
  [key: string]: string | number | undefined;
}

interface BarDefinition {
  dataKey: string;
  name: string;
  color: string;
}

function transformData(
  entries: ChartBenchmarkEntry[],
  metric: BenchmarkMetric,
  groupBy: GroupByMode,
  rendererColors: Record<string, string>
): { data: ChartDataPoint[]; bars: BarDefinition[] } {
  const config = METRIC_CONFIGS[metric];

  if (groupBy === "scene") {
    // Groups = scenes, bars = renderers
    const sceneMap = new Map<string, { name: string; entries: ChartBenchmarkEntry[] }>();
    for (const entry of entries) {
      const existing = sceneMap.get(entry.scene);
      if (existing) {
        existing.entries.push(entry);
      } else {
        sceneMap.set(entry.scene, { name: entry.scene_name, entries: [entry] });
      }
    }

    const rendererIds = [...new Set(entries.map((e) => e.renderer))];
    const bars: BarDefinition[] = rendererIds.map((id) => ({
      dataKey: id,
      name: entries.find((e) => e.renderer === id)?.renderer_name ?? id,
      color: rendererColors[id] ?? "#888888",
    }));

    const data: ChartDataPoint[] = [];
    for (const [, scene] of sceneMap) {
      const point: ChartDataPoint = { name: scene.name };
      for (const entry of scene.entries) {
        const value = config.accessor(entry);
        if (value != null) {
          point[entry.renderer] = value;
        }
      }
      data.push(point);
    }

    return { data, bars };
  }

  // Groups = renderers, bars = scenes
  const rendererMap = new Map<string, { name: string; entries: ChartBenchmarkEntry[] }>();
  for (const entry of entries) {
    const existing = rendererMap.get(entry.renderer);
    if (existing) {
      existing.entries.push(entry);
    } else {
      rendererMap.set(entry.renderer, { name: entry.renderer_name, entries: [entry] });
    }
  }

  const sceneIds = [...new Set(entries.map((e) => e.scene))];
  const sceneColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7"];
  const bars: BarDefinition[] = sceneIds.map((id, i) => ({
    dataKey: id,
    name: entries.find((e) => e.scene === id)?.scene_name ?? id,
    color: sceneColors[i % sceneColors.length]!,
  }));

  const data: ChartDataPoint[] = [];
  for (const [, renderer] of rendererMap) {
    const point: ChartDataPoint = { name: renderer.name };
    for (const entry of renderer.entries) {
      const value = config.accessor(entry);
      if (value != null) {
        point[entry.scene] = value;
      }
    }
    data.push(point);
  }

  return { data, bars };
}

// ── Custom tooltip ─────────────────────────────────────────────

interface ChartTooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string;
  metric: BenchmarkMetric;
}

function ChartTooltip({ active, payload, label, metric }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const config = METRIC_CONFIGS[metric];

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-popover-foreground">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => {
          if (entry.value == null) return null;
          return (
            <div
              key={entry.dataKey ?? entry.name}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto font-mono font-medium text-popover-foreground">
                {config.tooltipFormat(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Custom legend ──────────────────────────────────────────────

interface LegendPayloadEntry {
  value?: string;
  color?: string;
  dataKey?: string;
}

interface CustomLegendProps {
  payload?: LegendPayloadEntry[];
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2">
      {payload.map((entry) => (
        <div
          key={entry.dataKey ?? entry.value}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────

function BenchmarkChartEmpty() {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="mx-auto max-w-sm rounded-xl border-2 border-dashed border-border/40 px-8 py-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/30 text-muted-foreground/40">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">
          No Benchmark Data Available
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Performance benchmarks for these renderers will be added in a future
          update.
        </p>
      </div>
    </div>
  );
}

// ── Y-axis tick formatter ──────────────────────────────────────

function getYAxisFormatter(metric: BenchmarkMetric): (value: number) => string {
  switch (metric) {
    case "render_time":
      return (v) => `${v}s`;
    case "memory":
      return (v) => (v >= 1024 ? `${(v / 1024).toFixed(1)}G` : `${v}M`);
    case "psnr":
      return (v) => `${v}`;
    case "ssim":
      return (v) => v.toFixed(3);
  }
}

// ── Main component ─────────────────────────────────────────────

const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

export function BenchmarkChart({
  entries,
  rendererColors,
  className,
}: BenchmarkChartProps) {
  const [activeMetric, setActiveMetric] = useState<BenchmarkMetric>("render_time");
  const [groupBy, setGroupBy] = useState<GroupByMode>("scene");

  const { data, bars } = useMemo(
    () => transformData(entries, activeMetric, groupBy, rendererColors),
    [entries, activeMetric, groupBy, rendererColors]
  );

  const yAxisFormatter = useMemo(
    () => getYAxisFormatter(activeMetric),
    [activeMetric]
  );

  const hasData = data.length > 0 && bars.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Metric switcher */}
        <Tabs
          value={activeMetric}
          onValueChange={(v) => setActiveMetric(v as BenchmarkMetric)}
        >
          <TabsList className="h-8">
            {(
              Object.entries(METRIC_CONFIGS) as [BenchmarkMetric, MetricConfig][]
            ).map(([key, config]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="gap-1.5 px-2.5 text-xs"
                aria-label={config.label}
              >
                {config.icon}
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Group-by switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Group by</span>
          <Tabs
            value={groupBy}
            onValueChange={(v) => setGroupBy(v as GroupByMode)}
          >
            <TabsList className="h-7">
              <TabsTrigger value="scene" className="px-2.5 text-xs">
                Scene
              </TabsTrigger>
              <TabsTrigger value="renderer" className="px-2.5 text-xs">
                Renderer
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Chart area */}
      {hasData ? (
        <figure
          role="group"
          aria-label={`Bar chart comparing ${METRIC_CONFIGS[activeMetric].label.toLowerCase()} across renderers`}
        >
          <figcaption className="sr-only">
            {describeBarChart(
              data.flatMap((point) =>
                bars
                  .map((bar) => ({
                    label: `${String(point["name"] ?? "")} — ${bar.name}`,
                    value: Number(point[bar.dataKey] ?? 0),
                  }))
                  .filter((d) => d.value > 0)
              ),
              METRIC_CONFIGS[activeMetric].label,
              METRIC_CONFIGS[activeMetric].unit
            )}
          </figcaption>
          <ResponsiveContainer width="100%" height={400} className="md:!h-[400px] !h-[300px]">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
              barCategoryGap="20%"
              barGap={2}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                interval={0}
                tickFormatter={(value: string) =>
                  value.length > 14 ? `${value.slice(0, 12)}…` : value
                }
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisFormatter}
                width={55}
              />
              <Tooltip
                content={<ChartTooltip metric={activeMetric} />}
                cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}
              />
              <Legend content={<CustomLegend />} />
              {bars.map((bar) => (
                <Bar
                  key={bar.dataKey}
                  dataKey={bar.dataKey}
                  name={bar.name}
                  fill={bar.color}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </figure>
      ) : (
        <BenchmarkChartEmpty />
      )}
    </div>
  );
}
