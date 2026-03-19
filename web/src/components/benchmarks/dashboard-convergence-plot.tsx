"use client";

import { useState, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { BarChart3 } from "lucide-react";
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
import type { BenchmarkEntry } from "@/types/benchmark";
import { formatRenderTime } from "@/lib/utils";
import { formatPSNR } from "@/lib/format";
import { chartTooltipStyle, chartAxisStyle } from "@/lib/chart-utils";
import { describeConvergencePlot } from "@/lib/a11y-utils";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// DASHBOARD CONVERGENCE PLOT — Shows how quickly each renderer
// produces a clean, noise-free image over time or samples.
// Note: convergence data only includes PSNR (not SSIM).
// ═══════════════════════════════════════════════════════════════

type XAxisMode = "time" | "samples";

interface DashboardConvergencePlotProps {
  entries: BenchmarkEntry[];
  rendererColors: Record<string, string>;
  rendererNames: Record<string, string>;
  className?: string;
}

export function DashboardConvergencePlot({
  entries,
  rendererColors,
  rendererNames,
  className,
}: DashboardConvergencePlotProps) {
  const prefersReducedMotion = useReducedMotion();

  // Filter to entries that have convergence data
  const convergenceEntries = useMemo(
    () => entries.filter((e) => e.convergence && e.convergence.length > 0),
    [entries]
  );

  // Available scenes with convergence data
  const scenes = useMemo(
    () => [...new Set(convergenceEntries.map((e) => e.scene))].sort(),
    [convergenceEntries]
  );

  const [selectedScene, setSelectedScene] = useState<string>(scenes[0] ?? "");
  const [xAxis, setXAxis] = useState<XAxisMode>("samples");

  // Reset scene selection when scenes change (e.g., filters change)
  const activeScene =
    scenes.includes(selectedScene) ? selectedScene : (scenes[0] ?? "");

  // Entries for the selected scene
  const sceneEntries = useMemo(
    () => convergenceEntries.filter((e) => e.scene === activeScene),
    [convergenceEntries, activeScene]
  );

  // Build unified chart data: each point has an x-value and one y-value per renderer
  const rendererIds = useMemo(
    () => [...new Set(sceneEntries.map((e) => e.renderer))].sort(),
    [sceneEntries]
  );

  const chartData = useMemo(() => {
    // Collect all unique x-values across all renderers
    const xValues = new Set<number>();
    for (const entry of sceneEntries) {
      for (const pt of entry.convergence) {
        xValues.add(xAxis === "time" ? pt.time : pt.samples);
      }
    }

    const sortedX = [...xValues].sort((a, b) => a - b);

    return sortedX.map((x) => {
      const point: Record<string, number | undefined> = { x };
      for (const entry of sceneEntries) {
        const match = entry.convergence.find((pt) =>
          xAxis === "time" ? pt.time === x : pt.samples === x
        );
        if (match) {
          point[entry.renderer] = match.psnr;
        }
      }
      return point;
    });
  }, [sceneEntries, xAxis]);

  // ── Empty state ─────────────────────────────────────────────
  if (convergenceEntries.length === 0) {
    return (
      <div className={className}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Convergence Analysis
          </h3>
          <p className="text-sm text-muted-foreground">
            How quickly each renderer produces a clean, noise-free image.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card px-6 py-12">
          <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="mb-1 text-sm font-medium text-foreground">
            No Convergence Data Available
          </p>
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Convergence curves are available for progressive renderers (path
            tracers). Adjust your filters to include a path tracer to see
            convergence analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Section heading */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Convergence Analysis
        </h3>
        <p className="text-sm text-muted-foreground">
          How quickly each renderer produces a clean, noise-free image. Steeper
          curves indicate faster convergence — less time waiting for a usable
          result.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Scene selector */}
        {scenes.length > 1 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="convergence-scene"
              className="text-xs font-medium text-muted-foreground"
            >
              Scene:
            </label>
            <select
              id="convergence-scene"
              value={activeScene}
              onChange={(e) => setSelectedScene(e.target.value)}
              className="rounded-md border border-border/50 bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {scenes.map((scene) => (
                <option key={scene} value={scene}>
                  {scene.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* X-axis switcher */}
        <div role="group" aria-label="X-axis unit" className="flex rounded-lg border border-border/50 bg-card p-0.5">
          <button
            type="button"
            onClick={() => setXAxis("samples")}
            aria-pressed={xAxis === "samples"}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              xAxis === "samples"
                ? "bg-blue-700 text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Samples
          </button>
          <button
            type="button"
            onClick={() => setXAxis("time")}
            aria-pressed={xAxis === "time"}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              xAxis === "time"
                ? "bg-blue-700 text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Time
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          Metric: PSNR (dB)
        </span>
      </div>

      {/* Chart */}
      <figure
        className="overflow-x-auto rounded-xl border border-border/50 bg-card p-4"
        role="group"
        aria-label={`Line chart showing convergence of ${rendererIds.length} renderers on ${activeScene}`}
      >
        <figcaption className="sr-only">
          {describeConvergencePlot(
            sceneEntries.map((e) => {
              const lastPt = e.convergence[e.convergence.length - 1];
              return {
                name: rendererNames[e.renderer] ?? e.renderer,
                finalValue: lastPt?.psnr ?? 0,
              };
            }),
            "PSNR",
            "dB"
          )}
        </figcaption>
        <div className="min-w-[450px]">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey="x"
                {...chartAxisStyle}
                tickFormatter={(v: number) =>
                  xAxis === "time" ? formatRenderTime(v) : `${v}`
                }
                label={{
                  value: xAxis === "time" ? "Time" : "Samples",
                  position: "insideBottom",
                  offset: -4,
                  style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
                }}
                scale={xAxis === "samples" ? "log" : "auto"}
                domain={xAxis === "samples" ? ["dataMin", "dataMax"] : undefined}
                type="number"
              />
              <YAxis
                {...chartAxisStyle}
                tickFormatter={(v: number) => `${v.toFixed(0)}`}
                label={{
                  value: "PSNR (dB)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
                }}
                width={55}
              />
              <Tooltip
                {...chartTooltipStyle}
                labelFormatter={(v: unknown) =>
                  xAxis === "time"
                    ? `Time: ${formatRenderTime(Number(v))}`
                    : `Samples: ${v}`
                }
                formatter={(value: number | undefined, name: string | undefined) => [
                  value != null ? formatPSNR(value) : "—",
                  rendererNames[name ?? ""] ?? name ?? "",
                ]}
              />
              <Legend
                wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                formatter={(value: string) =>
                  rendererNames[value] ?? value
                }
              />
              {rendererIds.map((id) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  stroke={rendererColors[id] ?? "#6366f1"}
                  strokeWidth={2}
                  dot={{ r: 3, fill: rendererColors[id] ?? "#6366f1" }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={500}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
