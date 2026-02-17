"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { TimelineRenderer } from "@/types/learn";
import { techniqueLabels } from "@/lib/constants";

// ── Technique color config ───────────────────────────────────────────────

const TECHNIQUE_COLORS: Record<string, { fill: string; stroke: string }> = {
  path_tracing: { fill: "#60a5fa", stroke: "#3b82f6" },
  ray_tracing: { fill: "#38bdf8", stroke: "#0ea5e9" },
  rasterization: { fill: "#4ade80", stroke: "#22c55e" },
  neural: { fill: "#c084fc", stroke: "#a855f7" },
  gaussian_splatting: { fill: "#f472b6", stroke: "#ec4899" },
  differentiable: { fill: "#fb7185", stroke: "#f43f5e" },
  volume_rendering: { fill: "#fb923c", stroke: "#f97316" },
  volume: { fill: "#fb923c", stroke: "#f97316" },
  ray_marching: { fill: "#22d3ee", stroke: "#06b6d4" },
  educational: { fill: "#facc15", stroke: "#eab308" },
};

// ── Swim lane config ─────────────────────────────────────────────────────

const SWIM_LANES: { id: string; label: string }[] = [
  { id: "path_tracing", label: "Path Tracers" },
  { id: "rasterization", label: "Real-Time" },
  { id: "neural", label: "Neural" },
  { id: "gaussian_splatting", label: "Gaussian Splatting" },
  { id: "differentiable", label: "Differentiable" },
  { id: "volume_rendering", label: "Volume" },
];

function getPrimaryTechnique(renderer: TimelineRenderer): string {
  // Priority order for assigning to swim lanes
  const priority = [
    "gaussian_splatting",
    "neural",
    "differentiable",
    "volume_rendering",
    "path_tracing",
    "rasterization",
  ];
  for (const tech of priority) {
    if (renderer.technique.includes(tech)) return tech;
  }
  return renderer.technique[0] ?? "rasterization";
}

// ── Simple linear scale ──────────────────────────────────────────────────

function linearScale(
  domain: [number, number],
  range: [number, number]
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  if (span === 0) return () => r0;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

// ── Component ────────────────────────────────────────────────────────────

interface TimelineVisualizationProps {
  renderers: TimelineRenderer[];
  filters: string[];
}

interface TooltipData {
  renderer: TimelineRenderer;
  x: number;
  y: number;
}

const LANE_HEIGHT = 80;
const LABEL_WIDTH = 140;
const TOP_PADDING = 40;
const BOTTOM_PADDING = 30;
const NODE_RADIUS = 6;

export function TimelineVisualization({
  renderers,
  filters,
}: TimelineVisualizationProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [zoom, setZoom] = useState(1);

  const filtered = useMemo(
    () =>
      filters.length === 0
        ? renderers
        : renderers.filter((r) => r.technique.some((t) => filters.includes(t))),
    [renderers, filters]
  );

  // Group renderers into swim lanes
  const lanes = useMemo(() => {
    const laneMap: Record<string, TimelineRenderer[]> = {};
    for (const lane of SWIM_LANES) {
      laneMap[lane.id] = [];
    }

    for (const renderer of filtered) {
      const primary = getPrimaryTechnique(renderer);
      if (laneMap[primary]) {
        laneMap[primary].push(renderer);
      } else {
        // Fallback: put in first matching lane
        const fallback = SWIM_LANES.find((l) =>
          renderer.technique.includes(l.id)
        );
        if (fallback) {
          const fallbackLane = laneMap[fallback.id];
          if (fallbackLane) fallbackLane.push(renderer);
        }
      }
    }

    // Filter out empty lanes
    return SWIM_LANES.filter(
      (lane) => (laneMap[lane.id]?.length ?? 0) > 0
    ).map((lane) => ({
      ...lane,
      renderers: laneMap[lane.id]!.sort(
        (a, b) => a.firstReleaseYear - b.firstReleaseYear
      ),
    }));
  }, [filtered]);

  // Year range
  const years = filtered.map((r) => r.firstReleaseYear);
  const minYear = years.length > 0 ? Math.min(...years) - 2 : 1990;
  const maxYear = Math.max(new Date().getFullYear() + 1, ...years);

  // SVG dimensions
  const baseContentWidth = (maxYear - minYear) * 50;
  const contentWidth = Math.max(baseContentWidth * zoom, 600);
  const svgWidth = contentWidth + LABEL_WIDTH + 20;
  const svgHeight =
    TOP_PADDING + lanes.length * LANE_HEIGHT + BOTTOM_PADDING;

  const xScale = linearScale(
    [minYear, maxYear],
    [LABEL_WIDTH + 10, LABEL_WIDTH + 10 + contentWidth]
  );

  // Generate year ticks
  const tickInterval = zoom < 0.8 ? 10 : zoom < 1.5 ? 5 : zoom < 3 ? 2 : 1;
  const ticks: number[] = [];
  for (
    let y = Math.ceil(minYear / tickInterval) * tickInterval;
    y <= maxYear;
    y += tickInterval
  ) {
    ticks.push(y);
  }

  const handleNodeClick = useCallback(
    (rendererId: string) => {
      router.push(`/renderer/${rendererId}`);
    },
    [router]
  );

  const handleMouseEnter = useCallback(
    (renderer: TimelineRenderer, x: number, y: number) => {
      setTooltip({ renderer, x, y });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="relative">
      {/* Zoom Controls */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          className="rounded-md border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="min-w-[4rem] text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
          className="rounded-md border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
        {zoom !== 1 && (
          <button
            onClick={() => setZoom(1)}
            className="rounded-md border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="overflow-x-auto rounded-lg border border-border/50 bg-card/30"
        role="img"
        aria-label="Interactive timeline showing when rendering engines were first released, grouped by technique category"
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          className="select-none"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          {/* Year axis ticks */}
          {ticks.map((year) => {
            const x = xScale(year);
            return (
              <g key={year}>
                <line
                  x1={x}
                  y1={TOP_PADDING - 10}
                  x2={x}
                  y2={svgHeight - BOTTOM_PADDING}
                  stroke="hsl(240 4% 16%)"
                  strokeWidth={1}
                  strokeDasharray={year % 10 === 0 ? "none" : "2 4"}
                />
                <text
                  x={x}
                  y={TOP_PADDING - 16}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {year}
                </text>
              </g>
            );
          })}

          {/* Swim lanes */}
          {lanes.map((lane, laneIndex) => {
            const laneY = TOP_PADDING + laneIndex * LANE_HEIGHT;
            const techColor = TECHNIQUE_COLORS[lane.id] ?? {
              fill: "#94a3b8",
              stroke: "#64748b",
            };

            return (
              <g key={lane.id}>
                {/* Lane separator */}
                {laneIndex > 0 && (
                  <line
                    x1={0}
                    y1={laneY}
                    x2={svgWidth}
                    y2={laneY}
                    stroke="hsl(240 4% 16%)"
                    strokeWidth={1}
                  />
                )}

                {/* Lane label */}
                <text
                  x={8}
                  y={laneY + LANE_HEIGHT / 2}
                  dominantBaseline="central"
                  className="fill-muted-foreground text-[11px] font-medium"
                >
                  {lane.label}
                </text>

                {/* Renderer nodes */}
                {lane.renderers.map((renderer, nodeIndex) => {
                  const cx = xScale(renderer.firstReleaseYear);
                  // Offset nodes vertically within lane to reduce overlap
                  const yOffset = (nodeIndex % 3) * 16 - 16;
                  const cy = laneY + LANE_HEIGHT / 2 + yOffset;

                  return (
                    <g
                      key={renderer.id}
                      className="cursor-pointer"
                      onClick={() => handleNodeClick(renderer.id)}
                      onMouseEnter={() => handleMouseEnter(renderer, cx, cy)}
                      onMouseLeave={handleMouseLeave}
                      onFocus={() => handleMouseEnter(renderer, cx, cy)}
                      onBlur={handleMouseLeave}
                      tabIndex={0}
                      role="button"
                      aria-label={`${renderer.name}, released ${renderer.firstReleaseYear}`}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={NODE_RADIUS}
                        fill={techColor.fill}
                        stroke={techColor.stroke}
                        strokeWidth={2}
                        className="transition-transform duration-150 hover:scale-[1.4]"
                        style={{ transformOrigin: `${cx}px ${cy}px` }}
                      />
                      {/* Label for non-overlapping nodes */}
                      {zoom >= 1.5 && (
                        <text
                          x={cx}
                          y={cy + NODE_RADIUS + 12}
                          textAnchor="middle"
                          className="fill-muted-foreground text-[9px]"
                        >
                          {renderer.name.length > 12
                            ? renderer.name.slice(0, 11) + "…"
                            : renderer.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg"
              style={{
                left: tooltip.x,
                top: tooltip.y - 60,
                transform: "translateX(-50%)",
              }}
            >
              <p className="text-sm font-semibold text-foreground">
                {tooltip.renderer.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {tooltip.renderer.firstReleaseYear} &middot;{" "}
                {tooltip.renderer.technique
                  .map((t) => techniqueLabels[t] ?? t)
                  .join(", ")}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {tooltip.renderer.status}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll hint */}
      {contentWidth > 800 && (
        <p className="mt-2 text-center text-xs text-muted-foreground/60">
          Scroll horizontally to explore the full timeline
        </p>
      )}
    </div>
  );
}
