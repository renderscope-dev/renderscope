"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { describeConvergencePlot } from "@/lib/a11y-utils";
import type {
  ChartBenchmarkEntry,
  ConvergenceXAxis,
} from "@/types/benchmark";

// ── Types ──────────────────────────────────────────────────────

interface ConvergencePlotProps {
  entries: ChartBenchmarkEntry[];
  rendererColors: Record<string, string>;
  className?: string;
}

type QualityMetric = "psnr" | "ssim";

// ── Data transformation ────────────────────────────────────────

interface ConvergenceLinePoint {
  x: number;
  [rendererKey: string]: number | undefined;
}

interface LineDefinition {
  dataKey: string;
  name: string;
  color: string;
}

/**
 * Build a unified dataset where each row has an x-value and
 * one column per renderer with the quality metric value.
 */
function buildConvergenceData(
  entries: ChartBenchmarkEntry[],
  sceneId: string,
  xAxis: ConvergenceXAxis,
  qualityMetric: QualityMetric
): { data: ConvergenceLinePoint[]; lines: LineDefinition[] } {
  // Filter to entries for this scene that have convergence data
  const sceneEntries = entries.filter(
    (e) => e.scene === sceneId && e.convergence && e.convergence.length > 0
  );

  if (sceneEntries.length === 0) {
    return { data: [], lines: [] };
  }

  const lines: LineDefinition[] = [];

  // Collect all unique x-values across all renderers
  const xSet = new Set<number>();
  const rendererCurves = new Map<string, Map<number, number>>();

  for (const entry of sceneEntries) {
    lines.push({
      dataKey: entry.renderer,
      name: entry.renderer_name,
      color: "", // filled below
    });

    const curve = new Map<number, number>();
    for (const pt of entry.convergence!) {
      const x = xAxis === "time" ? pt.time_seconds : pt.samples;
      const y = qualityMetric === "psnr" ? pt.psnr : pt.ssim;
      if (x != null && y != null) {
        xSet.add(x);
        curve.set(x, y);
      }
    }
    rendererCurves.set(entry.renderer, curve);
  }

  // Sort x-values
  const sortedX = [...xSet].sort((a, b) => a - b);

  // Build data rows
  const data: ConvergenceLinePoint[] = sortedX.map((x) => {
    const row: ConvergenceLinePoint = { x };
    for (const entry of sceneEntries) {
      const curve = rendererCurves.get(entry.renderer);
      const value = curve?.get(x);
      if (value != null) {
        row[entry.renderer] = value;
      }
    }
    return row;
  });

  return { data, lines };
}

// ── Custom tooltip ─────────────────────────────────────────────

interface ConvergenceTooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface ConvergenceTooltipProps {
  active?: boolean;
  payload?: ConvergenceTooltipPayloadEntry[];
  label?: number;
  xAxis: ConvergenceXAxis;
  qualityMetric: QualityMetric;
}

function ConvergenceTooltip({
  active,
  payload,
  label,
  xAxis,
  qualityMetric,
}: ConvergenceTooltipProps) {
  if (!active || !payload?.length || label == null) return null;

  const xLabel =
    xAxis === "time" ? `${label.toFixed(2)}s` : `${label} SPP`;
  const yUnit = qualityMetric === "psnr" ? " dB" : "";

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-popover-foreground">
        {xLabel}
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
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto font-mono font-medium text-popover-foreground">
                {qualityMetric === "ssim"
                  ? entry.value.toFixed(4)
                  : `${entry.value.toFixed(1)}${yUnit}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Custom legend ──────────────────────────────────────────────

interface ConvergenceLegendPayloadEntry {
  value?: string;
  color?: string;
  dataKey?: string;
}

interface ConvergenceLegendProps {
  payload?: ConvergenceLegendPayloadEntry[];
}

function ConvergenceLegend({ payload }: ConvergenceLegendProps) {
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2">
      {payload.map((entry) => (
        <div
          key={entry.dataKey ?? entry.value}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="inline-block h-0.5 w-3.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────

function ConvergencePlotEmpty() {
  return (
    <div className="flex min-h-[250px] items-center justify-center">
      <div className="mx-auto max-w-sm rounded-xl border-2 border-dashed border-border/40 px-8 py-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/30 text-muted-foreground/40">
          <TrendingUp className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">
          No Convergence Data
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Convergence data is available for progressive renderers. Select a path
          tracer to see convergence curves.
        </p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

export function ConvergencePlot({
  entries,
  rendererColors,
  className,
}: ConvergencePlotProps) {
  // Only include entries with convergence data
  const convergenceEntries = useMemo(
    () => entries.filter((e) => e.convergence && e.convergence.length > 0),
    [entries]
  );

  // Available scenes (only those with convergence data)
  const availableScenes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of convergenceEntries) {
      if (!seen.has(e.scene)) {
        seen.set(e.scene, e.scene_name);
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [convergenceEntries]);

  const [activeScene, setActiveScene] = useState<string>(
    availableScenes[0]?.id ?? ""
  );
  const [xAxis, setXAxis] = useState<ConvergenceXAxis>("time");
  const [qualityMetric, setQualityMetric] = useState<QualityMetric>("psnr");

  // Update active scene if it becomes unavailable
  const resolvedScene =
    availableScenes.find((s) => s.id === activeScene)?.id ??
    availableScenes[0]?.id ??
    "";

  const { data, lines } = useMemo(
    () =>
      buildConvergenceData(convergenceEntries, resolvedScene, xAxis, qualityMetric),
    [convergenceEntries, resolvedScene, xAxis, qualityMetric]
  );

  // Apply colors from the rendererColors map
  const coloredLines = useMemo(
    () =>
      lines.map((line) => ({
        ...line,
        color: rendererColors[line.dataKey] ?? "#888888",
      })),
    [lines, rendererColors]
  );

  if (convergenceEntries.length === 0) {
    return <ConvergencePlotEmpty />;
  }

  const xAxisLabel = xAxis === "time" ? "Time (seconds)" : "Samples (SPP)";
  const yAxisLabel = qualityMetric === "psnr" ? "PSNR (dB)" : "SSIM";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {/* Scene selector */}
        {availableScenes.length > 1 && (
          <Select value={resolvedScene} onValueChange={setActiveScene}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]" aria-label="Select scene for convergence plot">
              <SelectValue placeholder="Select scene" />
            </SelectTrigger>
            <SelectContent>
              {availableScenes.map((scene) => (
                <SelectItem key={scene.id} value={scene.id} className="text-xs">
                  {scene.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {/* X-axis switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">X-axis</span>
            <Tabs
              value={xAxis}
              onValueChange={(v) => setXAxis(v as ConvergenceXAxis)}
            >
              <TabsList className="h-7">
                <TabsTrigger value="time" className="px-2.5 text-xs">
                  Time
                </TabsTrigger>
                <TabsTrigger value="samples" className="px-2.5 text-xs">
                  Samples
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Quality metric switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Metric</span>
            <Tabs
              value={qualityMetric}
              onValueChange={(v) => setQualityMetric(v as QualityMetric)}
            >
              <TabsList className="h-7">
                <TabsTrigger value="psnr" className="px-2.5 text-xs">
                  PSNR
                </TabsTrigger>
                <TabsTrigger value="ssim" className="px-2.5 text-xs">
                  SSIM
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Chart area */}
      {data.length > 0 && coloredLines.length > 0 ? (
        <figure
          role="group"
          aria-label={`Line chart showing ${yAxisLabel} convergence over ${xAxisLabel.toLowerCase()}`}
        >
          <figcaption className="sr-only">
            {describeConvergencePlot(
              coloredLines.map((line) => {
                const lastPoint = data[data.length - 1];
                return {
                  name: line.name,
                  finalValue: Number(lastPoint?.[line.dataKey] ?? 0),
                };
              }),
              qualityMetric === "psnr" ? "PSNR" : "SSIM",
              qualityMetric === "psnr" ? "dB" : ""
            )}
          </figcaption>
          <ResponsiveContainer width="100%" height={350} className="md:!h-[350px] !h-[250px]">
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 4, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
              />
              <XAxis
                dataKey="x"
                type="number"
                scale={xAxis === "samples" ? "log" : "auto"}
                domain={
                  xAxis === "samples" ? [1, "dataMax"] : ["dataMin", "dataMax"]
                }
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                label={{
                  value: xAxisLabel,
                  position: "insideBottomRight",
                  offset: -4,
                  style: {
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  },
                }}
                tickFormatter={(value: number) =>
                  xAxis === "time" ? `${value.toFixed(1)}s` : String(value)
                }
                allowDataOverflow
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={55}
                domain={qualityMetric === "ssim" ? [0, 1] : ["auto", "auto"]}
                tickFormatter={(value: number) =>
                  qualityMetric === "ssim"
                    ? value.toFixed(2)
                    : `${value.toFixed(0)}`
                }
                label={{
                  value: yAxisLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: {
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                    textAnchor: "middle",
                  },
                }}
              />
              <Tooltip
                content={
                  <ConvergenceTooltip
                    xAxis={xAxis}
                    qualityMetric={qualityMetric}
                  />
                }
              />
              <Legend content={<ConvergenceLegend />} />
              {coloredLines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: line.color, strokeWidth: 2, stroke: "hsl(var(--popover))" }}
                  connectNulls
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </figure>
      ) : (
        <ConvergencePlotEmpty />
      )}
    </div>
  );
}
