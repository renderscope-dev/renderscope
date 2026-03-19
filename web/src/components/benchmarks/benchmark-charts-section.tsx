"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BenchmarkEntry } from "@/types/benchmark";
import { buildRendererColorMap } from "@/lib/chart-utils";
import { RendererRankings } from "./renderer-rankings";
import { DashboardBarChart } from "./dashboard-bar-chart";
import { DashboardConvergencePlot } from "./dashboard-convergence-plot";
import { SceneBreakdown } from "./scene-breakdown";

// ═══════════════════════════════════════════════════════════════
// BENCHMARK CHARTS SECTION — Orchestrates all chart components
// into a cohesive section within the Benchmark Dashboard.
// Inserted between the data table and methodology sections.
// ═══════════════════════════════════════════════════════════════

interface BenchmarkChartsSectionProps {
  entries: BenchmarkEntry[];
  rendererNames: Record<string, string>;
  onBarClick?: (benchmarkId: string) => void;
  className?: string;
}

export function BenchmarkChartsSection({
  entries,
  rendererNames,
  onBarClick,
  className,
}: BenchmarkChartsSectionProps) {
  const prefersReducedMotion = useReducedMotion();

  const rendererColors = useMemo(
    () => buildRendererColorMap(entries),
    [entries]
  );

  if (entries.length === 0) return null;

  const stagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.12,
      },
    },
  };

  const fadeUp = {
    hidden: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" as const },
    },
  };

  return (
    <div data-testid="benchmark-charts" className={className}>
      {/* Section divider */}
      <div className="relative mb-8 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/40" />
        </div>
        <span className="relative bg-background px-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Charts &amp; Rankings
        </span>
      </div>

      {/* Section heading */}
      <div className="mb-8">
        <h2 className="mb-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Visual Analytics
        </h2>
        <p className="text-sm text-muted-foreground">
          Interactive charts for exploring benchmark patterns. All charts respect
          the active filters above.
        </p>
      </div>

      {/* Chart components with staggered entrance */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="space-y-12"
      >
        {/* 1. Renderer Rankings */}
        <motion.div variants={fadeUp}>
          <RendererRankings
            entries={entries}
            rendererNames={rendererNames}
          />
        </motion.div>

        {/* 2. Bar Chart — Performance Comparison */}
        <motion.div variants={fadeUp}>
          <DashboardBarChart
            entries={entries}
            rendererColors={rendererColors}
            rendererNames={rendererNames}
            onBarClick={onBarClick}
          />
        </motion.div>

        {/* 3. Convergence Plot */}
        <motion.div variants={fadeUp}>
          <DashboardConvergencePlot
            entries={entries}
            rendererColors={rendererColors}
            rendererNames={rendererNames}
          />
        </motion.div>

        {/* 4. Scene Breakdown (Radar) */}
        <motion.div variants={fadeUp}>
          <SceneBreakdown
            entries={entries}
            rendererColors={rendererColors}
            rendererNames={rendererNames}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
