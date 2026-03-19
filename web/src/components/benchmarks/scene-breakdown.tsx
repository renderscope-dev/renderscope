"use client";

import { useState, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { BenchmarkEntry } from "@/types/benchmark";
import { formatRenderTime } from "@/lib/utils";
import { formatMemory, formatPSNR } from "@/lib/format";
import { chartTooltipStyle } from "@/lib/chart-utils";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// SCENE BREAKDOWN — Radar chart showing normalized performance
// profiles across scenes, plus a supplementary table with
// actual (non-normalized) values.
// ═══════════════════════════════════════════════════════════════

type RadarMetric = "renderTime" | "memory" | "psnr";

const RADAR_METRIC_CONFIG: Record<
  RadarMetric,
  {
    label: string;
    higherIsBetter: boolean;
    format: (v: number) => string;
  }
> = {
  renderTime: {
    label: "Render Time",
    higherIsBetter: false,
    format: (v) => formatRenderTime(v),
  },
  memory: {
    label: "Memory",
    higherIsBetter: false,
    format: (v) => formatMemory(v),
  },
  psnr: {
    label: "PSNR",
    higherIsBetter: true,
    format: (v) => formatPSNR(v),
  },
};

function extractRadarValue(entry: BenchmarkEntry, metric: RadarMetric): number {
  switch (metric) {
    case "renderTime":
      return entry.results.render_time_seconds;
    case "memory":
      return entry.results.peak_memory_mb;
    case "psnr":
      return entry.quality_vs_reference.psnr;
  }
}

/**
 * Normalize a value to a 0–100 score for radar chart display.
 *
 * For "lower is better" metrics (render time, memory):
 *   score = 100 * (max - value) / (max - min)
 *   → fastest renderer gets 100, slowest gets 0
 *
 * For "higher is better" metrics (PSNR):
 *   score = 100 * (value - min) / (max - min)
 *   → highest quality gets 100, lowest gets 0
 */
function normalize(
  value: number,
  min: number,
  max: number,
  higherIsBetter: boolean
): number {
  if (max === min) return 50; // All values identical → mid-score
  if (higherIsBetter) {
    return ((value - min) / (max - min)) * 100;
  }
  return ((max - value) / (max - min)) * 100;
}

interface SceneBreakdownProps {
  entries: BenchmarkEntry[];
  rendererColors: Record<string, string>;
  rendererNames: Record<string, string>;
  className?: string;
}

export function SceneBreakdown({
  entries,
  rendererColors,
  rendererNames,
  className,
}: SceneBreakdownProps) {
  const [metric, setMetric] = useState<RadarMetric>("renderTime");
  const prefersReducedMotion = useReducedMotion();

  const metricCfg = RADAR_METRIC_CONFIG[metric];

  const renderers = useMemo(
    () => [...new Set(entries.map((e) => e.renderer))].sort(),
    [entries]
  );
  const scenes = useMemo(
    () => [...new Set(entries.map((e) => e.scene))].sort(),
    [entries]
  );

  // Build lookup: renderer → scene → raw value
  const rawValues = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const entry of entries) {
      let sceneMap = map.get(entry.renderer);
      if (!sceneMap) {
        sceneMap = new Map();
        map.set(entry.renderer, sceneMap);
      }
      sceneMap.set(entry.scene, extractRadarValue(entry, metric));
    }
    return map;
  }, [entries, metric]);

  // Compute min/max per scene for normalization
  const radarData = useMemo(() => {
    return scenes.map((scene) => {
      // Collect all values for this scene
      const values: number[] = [];
      for (const renderer of renderers) {
        const val = rawValues.get(renderer)?.get(scene);
        if (val !== undefined) values.push(val);
      }
      const min = Math.min(...values);
      const max = Math.max(...values);

      const point: Record<string, string | number> = {
        scene: scene
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        fullScene: scene,
      };

      for (const renderer of renderers) {
        const val = rawValues.get(renderer)?.get(scene);
        point[renderer] =
          val !== undefined
            ? Math.round(normalize(val, min, max, metricCfg.higherIsBetter))
            : 0;
      }

      return point;
    });
  }, [scenes, renderers, rawValues, metricCfg.higherIsBetter]);

  // ── Minimum data check ──────────────────────────────────────
  if (scenes.length < 2 || renderers.length < 2) {
    return (
      <div className={className}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Scene Performance Profiles
          </h3>
          <p className="text-sm text-muted-foreground">
            How renderers compare across different scene types.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card px-6 py-12">
          <TriangleAlert className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="mb-1 text-sm font-medium text-foreground">
            Insufficient Data
          </p>
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Scene breakdown requires benchmark data for at least 2 renderers
            across 2 or more scenes. Adjust your filters to include more data.
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
          Scene Performance Profiles
        </h3>
        <p className="text-sm text-muted-foreground">
          How renderers compare across different scene types. A wider shape means
          more consistent performance across scenes.
        </p>
      </div>

      {/* Metric switcher */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">
          Metric:
        </label>
        <div role="group" aria-label="Radar metric" className="flex rounded-lg border border-border/50 bg-card p-0.5">
          {(Object.keys(RADAR_METRIC_CONFIG) as RadarMetric[]).map((m) => (
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
              {RADAR_METRIC_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Radar chart */}
      <div
        className="rounded-xl border border-border/50 bg-card p-4"
        aria-label={`Radar chart comparing ${metricCfg.label} across ${renderers.length} renderers and ${scenes.length} scenes`}
      >
        <div className="mx-auto max-w-[500px]">
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
              />
              <PolarAngleAxis
                dataKey="scene"
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              {renderers.map((id) => (
                <Radar
                  key={id}
                  name={rendererNames[id] ?? id}
                  dataKey={id}
                  stroke={rendererColors[id] ?? "#6366f1"}
                  fill={rendererColors[id] ?? "#6366f1"}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={500}
                />
              ))}
              <Tooltip
                {...chartTooltipStyle}
                formatter={(value: number | undefined, name: string | undefined, props) => {
                  // Show both normalized score and actual value
                  const scene = (
                    props.payload as Record<string, string>
                  ).fullScene ?? "";
                  const nameStr = name ?? "";
                  const rendererId = renderers.find(
                    (r) => (rendererNames[r] ?? r) === nameStr
                  ) ?? nameStr;
                  const actualValue = rawValues.get(rendererId)?.get(scene);
                  const actual =
                    actualValue !== undefined
                      ? metricCfg.format(actualValue)
                      : "—";
                  return [`Score: ${value ?? "—"} (${actual})`, nameStr];
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Supplementary table with actual values */}
      <div
        className="mt-4 overflow-x-auto rounded-xl border border-border/50"
        role="region"
        aria-label="Scene breakdown table, scrollable"
        tabIndex={0}
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30 bg-card">
              <th className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left font-semibold text-muted-foreground">
                Renderer
              </th>
              {scenes.map((scene) => (
                <th
                  key={scene}
                  className="px-3 py-2.5 text-right font-semibold text-muted-foreground"
                >
                  {scene
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderers.map((renderer) => (
              <tr
                key={renderer}
                className="border-b border-border/20 transition-colors hover:bg-muted/5"
              >
                <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium text-foreground">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: rendererColors[renderer] ?? "#6366f1",
                      }}
                    />
                    {rendererNames[renderer] ?? renderer}
                  </span>
                </td>
                {scenes.map((scene) => {
                  const val = rawValues.get(renderer)?.get(scene);
                  return (
                    <td
                      key={scene}
                      className="px-3 py-2 text-right tabular-nums text-muted-foreground"
                    >
                      {val !== undefined ? metricCfg.format(val) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
