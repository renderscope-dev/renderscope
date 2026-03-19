"use client";

import { useCallback, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";
import Link from "next/link";
import type {
  BenchmarkTableRow,
  HardwareProfile,
  BenchmarkOverviewData,
  BenchmarkEntry,
} from "@/types/benchmark";
import { useBenchmarkFilters } from "@/hooks/use-benchmark-filters";
import { useChartHighlight } from "@/hooks/use-chart-highlight";
import { BenchmarkOverviewStats } from "./benchmark-overview-stats";
import { HardwareProfilesSection } from "./hardware-profiles-section";
import { BenchmarkTableFilters } from "./benchmark-table-filters";
import { BenchmarkDataTable } from "./benchmark-data-table";
import { BenchmarkChartsSectionSkeleton } from "./chart-skeleton";
import { MethodologySection } from "./methodology-section";
import { DownloadDataSection } from "./download-data-section";

/**
 * Dynamically import the Recharts-heavy charts section.
 * This keeps Recharts (~45KB gzipped) out of the initial bundle
 * and loads it only when the benchmarks page is visited.
 */
const BenchmarkChartsSection = dynamic(
  () =>
    import("./benchmark-charts-section").then(
      (mod) => mod.BenchmarkChartsSection
    ),
  {
    ssr: true,
    loading: () => <BenchmarkChartsSectionSkeleton />,
  }
);

interface BenchmarkDashboardProps {
  rows: BenchmarkTableRow[];
  hardwareProfiles: HardwareProfile[];
  overview: BenchmarkOverviewData;
  availableRenderers: { id: string; name: string }[];
  availableScenes: { id: string; name: string }[];
  rawBenchmarks: BenchmarkEntry[];
}

function BenchmarkDashboardInner({
  rows,
  hardwareProfiles,
  overview,
  availableRenderers,
  availableScenes,
  rawBenchmarks,
}: BenchmarkDashboardProps) {
  const {
    filteredRows,
    paginatedRows,
    totalPages,
    currentPage,
    sortConfig,
    activeFilters,
    setRendererFilter,
    setSceneFilter,
    setHardwareFilter,
    setSortConfig,
    setPage,
    clearAllFilters,
    hasActiveFilters,
  } = useBenchmarkFilters(rows);

  const { highlightedRowId, handleBarClick, clearHighlight } =
    useChartHighlight();

  // Filter rawBenchmarks to match the currently visible rows
  const filteredBenchmarks = useMemo(() => {
    const visibleIds = new Set(filteredRows.map((r) => r.id));
    return rawBenchmarks.filter((b) => visibleIds.has(b.id));
  }, [filteredRows, rawBenchmarks]);

  // Build renderer name lookup from available renderers
  const rendererNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of availableRenderers) {
      map[r.id] = r.name;
    }
    return map;
  }, [availableRenderers]);

  const handleToggleHardware = useCallback(
    (hwId: string) => {
      const current = activeFilters.hardware;
      if (current.includes(hwId)) {
        setHardwareFilter(current.filter((id) => id !== hwId));
      } else {
        setHardwareFilter([...current, hwId]);
      }
    },
    [activeFilters.hardware, setHardwareFilter]
  );

  const availableHardwareOptions = hardwareProfiles.map((p) => ({
    id: p.id,
    name: p.label,
  }));

  return (
    <div className="mx-auto w-full max-w-8xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mb-12"
      >
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Benchmarks
        </h1>
        <p className="mb-4 text-lg text-muted-foreground">
          Standardized performance data for open source rendering engines
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Every benchmark is run under controlled conditions with full hardware
          and settings documentation. Use the sortable table below to find the
          specific data points you need, or download the entire dataset for your
          own analysis. All data is reproducible using the RenderScope CLI tool.
        </p>
      </motion.div>

      {/* Overview stats */}
      <section className="mb-12">
        <BenchmarkOverviewStats overview={overview} />
      </section>

      {/* Hardware profiles */}
      <section className="mb-12">
        <HardwareProfilesSection
          profiles={hardwareProfiles}
          rows={rows}
          activeHardware={activeFilters.hardware}
          onToggleHardware={handleToggleHardware}
        />
      </section>

      {/* Data table section */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mb-12"
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Benchmark Results
        </h2>

        <div className="mb-4">
          <BenchmarkTableFilters
            availableRenderers={availableRenderers}
            availableScenes={availableScenes}
            availableHardware={availableHardwareOptions}
            activeRenderers={activeFilters.renderers}
            activeScenes={activeFilters.scenes}
            activeHardware={activeFilters.hardware}
            onRendererChange={setRendererFilter}
            onSceneChange={setSceneFilter}
            onHardwareChange={setHardwareFilter}
            onClearAll={clearAllFilters}
            hasActiveFilters={hasActiveFilters}
            filteredCount={filteredRows.length}
            totalCount={rows.length}
          />
        </div>

        <BenchmarkDataTable
          rows={paginatedRows}
          sortConfig={sortConfig}
          onSort={setSortConfig}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          highlightedRowId={highlightedRowId}
          onClearHighlight={clearHighlight}
          onClearFilters={clearAllFilters}
        />
      </motion.section>

      {/* Interactive Charts & Rankings */}
      <BenchmarkChartsSection
        entries={filteredBenchmarks}
        rendererNames={rendererNames}
        onBarClick={handleBarClick}
        className="mb-12"
      />

      {/* Methodology */}
      <section className="mb-12">
        <MethodologySection />
      </section>

      {/* Download */}
      <section className="mb-12">
        <DownloadDataSection
          filteredRows={filteredRows}
          rawBenchmarks={rawBenchmarks}
          activeRenderers={activeFilters.renderers}
          activeScenes={activeFilters.scenes}
          activeHardware={activeFilters.hardware}
        />
      </section>

      {/* Submit Results CTA */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 p-8"
      >
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Submit Your Own Benchmarks
        </h2>
        <p className="mb-4 max-w-prose text-sm text-muted-foreground">
          The RenderScope CLI tool lets anyone run standardized benchmarks on
          their own hardware and contribute results to the community dataset.
        </p>
        <div className="mb-5 overflow-x-auto rounded-lg border border-border/50 bg-card p-4">
          <code className="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-mono">
              pip install renderscope && renderscope benchmark --scene
              cornell-box --renderer pbrt
            </span>
          </code>
        </div>
        <Link
          href="/docs/contributing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Learn more about contributing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.section>
    </div>
  );
}

export function BenchmarkDashboard(props: BenchmarkDashboardProps) {
  return (
    <Suspense fallback={null}>
      <BenchmarkDashboardInner {...props} />
    </Suspense>
  );
}
