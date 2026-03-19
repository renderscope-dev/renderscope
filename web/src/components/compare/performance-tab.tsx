"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getMockBenchmarkData,
  getRendererChartColor,
} from "@/lib/mock-benchmark-data";
import { HardwareContext } from "./hardware-context";
import { BenchmarkChart } from "./benchmark-chart";
import { ConvergencePlot } from "./convergence-plot";

interface PerformanceTabProps {
  selectedRendererIds: string[];
  className?: string;
}

/**
 * Performance tab orchestrator for the Compare page.
 *
 * Assembles the hardware context banner, benchmark bar chart,
 * and convergence line chart from mock data. The data source
 * can be swapped to real benchmark data in Phase 28 by replacing
 * the getMockBenchmarkData import — component tree stays the same.
 */
export function PerformanceTab({
  selectedRendererIds,
  className,
}: PerformanceTabProps) {
  const dataset = useMemo(
    () => getMockBenchmarkData(selectedRendererIds),
    [selectedRendererIds]
  );

  const rendererColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const id of selectedRendererIds) {
      colors[id] = getRendererChartColor(id);
    }
    return colors;
  }, [selectedRendererIds]);

  const hasConvergenceData = useMemo(
    () =>
      dataset.entries.some(
        (e) => e.convergence && e.convergence.length > 0
      ),
    [dataset.entries]
  );

  // Entries with missing benchmark data
  const missingRenderers = useMemo(() => {
    const withData = new Set(dataset.entries.map((e) => e.renderer));
    return selectedRendererIds.filter((id) => !withData.has(id));
  }, [dataset.entries, selectedRendererIds]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      role="tabpanel"
      id="tabpanel-performance"
      aria-labelledby="tab-performance"
      className={cn("space-y-8", className)}
    >
      {/* Hardware context banner */}
      <HardwareContext hardware={dataset.hardware} />

      {/* Missing renderers notice */}
      {missingRenderers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {missingRenderers.length === 1
            ? `${missingRenderers[0]} has`
            : `${missingRenderers.join(", ")} have`}{" "}
          no benchmark data available.
        </p>
      )}

      {/* Performance Comparison section */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Performance Comparison
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Render time, memory usage, and image quality metrics across standard
            scenes.
          </p>
        </div>
        <BenchmarkChart
          entries={dataset.entries}
          rendererColors={rendererColors}
        />
      </section>

      {/* Convergence Analysis section */}
      {hasConvergenceData && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Convergence Analysis
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              How quickly each renderer produces a clean, noise-free image.
              Steeper curves mean faster convergence.
            </p>
          </div>
          <ConvergencePlot
            entries={dataset.entries}
            rendererColors={rendererColors}
          />
        </section>
      )}
    </motion.div>
  );
}
