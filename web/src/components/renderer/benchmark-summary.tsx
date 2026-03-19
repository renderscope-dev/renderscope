import Link from "next/link";
import {
  BarChart3,
  ArrowRight,
  Clock,
  HardDrive,
  Sparkles,
  FlaskConical,
} from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import type { BenchmarkEntry } from "@/types/benchmark";
import { formatMemory, formatPSNR, formatSSIM } from "@/lib/format";

interface BenchmarkSummaryProps {
  rendererName: string;
  rendererId: string;
  benchmarks: BenchmarkEntry[];
}

/** Format render time with appropriate precision. */
function formatTime(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

/** Compute average of an array of numbers. */
function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function BenchmarkSummary({
  rendererName,
  rendererId,
  benchmarks,
}: BenchmarkSummaryProps) {
  const hasBenchmarks = benchmarks.length > 0;

  if (!hasBenchmarks) {
    return (
      <div>
        <SectionHeading
          title="Performance Benchmarks"
          icon={<BarChart3 className="h-5 w-5" />}
          id="benchmarks"
        />
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-6 md:p-8">
          <div className="flex flex-col items-center text-center py-4">
            <div className="mb-4 rounded-full bg-muted/30 p-4">
              <FlaskConical
                className="h-10 w-10 text-muted-foreground/40"
                aria-hidden="true"
              />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              No benchmark data available for{" "}
              <span className="font-medium text-foreground">
                {rendererName}
              </span>{" "}
              yet.
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-md mb-5">
              Benchmarks will be added as more renderers are tested across our
              standard scene suite.
            </p>
            <Link
              href="/benchmarks"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Learn about our methodology
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Compute summary statistics
  const renderTimes = benchmarks.map((b) => b.results.render_time_seconds);
  const memories = benchmarks.map((b) => b.results.peak_memory_mb);
  const psnrValues = benchmarks.map((b) => b.quality_vs_reference.psnr);
  const ssimValues = benchmarks.map((b) => b.quality_vs_reference.ssim);
  const sceneNames = [...new Set(benchmarks.map((b) => b.scene))];
  const hwProfiles = [...new Set(benchmarks.map((b) => b.hardware.label))];

  const avgTime = avg(renderTimes);
  const avgMemory = avg(memories);
  const avgPsnr = avg(psnrValues);
  const avgSsim = avg(ssimValues);

  // Deduplicate by scene (take first entry per scene)
  const uniqueByScene = benchmarks.filter(
    (b, i, arr) => arr.findIndex((x) => x.scene === b.scene) === i
  );

  // Find fastest and slowest scenes
  const fastest = uniqueByScene.reduce((a, b) =>
    a.results.render_time_seconds < b.results.render_time_seconds ? a : b
  );
  const slowest = uniqueByScene.reduce((a, b) =>
    a.results.render_time_seconds > b.results.render_time_seconds ? a : b
  );

  // Compute max render time for bar widths
  const maxTime = Math.max(...renderTimes);

  return (
    <div>
      <SectionHeading
        title="Performance Benchmarks"
        icon={<BarChart3 className="h-5 w-5" />}
        id="benchmarks"
      />

      <div className="space-y-6">
        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Avg Render Time"
            value={formatTime(avgTime)}
          />
          <StatCard
            icon={<HardDrive className="h-4 w-4" />}
            label="Avg Memory"
            value={formatMemory(avgMemory)}
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Avg PSNR"
            value={formatPSNR(avgPsnr)}
          />
          <StatCard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Avg SSIM"
            value={formatSSIM(avgSsim)}
          />
        </div>

        {/* Render Time by Scene — Horizontal Bar Chart */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 md:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Render Time by Scene
          </h3>
          <div className="space-y-3">
            {uniqueByScene
              .sort(
                (a, b) =>
                  a.results.render_time_seconds -
                  b.results.render_time_seconds
              )
              .map((entry) => {
                const pct =
                  maxTime > 0
                    ? (entry.results.render_time_seconds / maxTime) * 100
                    : 0;
                return (
                  <div key={entry.scene}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {entry.scene.replace(/-/g, " ")}
                      </span>
                      <span className="text-xs font-medium text-foreground tabular-nums">
                        {formatTime(entry.results.render_time_seconds)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Quality vs Speed summary */}
          {uniqueByScene.length > 1 && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Fastest:{" "}
                  <span className="text-foreground font-medium capitalize">
                    {fastest.scene.replace(/-/g, " ")}
                  </span>{" "}
                  ({formatTime(fastest.results.render_time_seconds)})
                </span>
                <span>
                  Slowest:{" "}
                  <span className="text-foreground font-medium capitalize">
                    {slowest.scene.replace(/-/g, " ")}
                  </span>{" "}
                  ({formatTime(slowest.results.render_time_seconds)})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quality Metrics */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 md:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Image Quality Metrics
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/30">
                  <th className="pb-2 pr-4 font-medium">Scene</th>
                  <th className="pb-2 px-4 font-medium text-right">PSNR</th>
                  <th className="pb-2 px-4 font-medium text-right">SSIM</th>
                  <th className="pb-2 px-4 font-medium text-right">Memory</th>
                  <th className="pb-2 pl-4 font-medium text-right">SPP</th>
                </tr>
              </thead>
              <tbody>
                {uniqueByScene.map((entry) => (
                  <tr
                    key={entry.scene}
                    className="border-b border-border/20 last:border-0"
                  >
                    <td className="py-2 pr-4 text-foreground capitalize">
                      {entry.scene.replace(/-/g, " ")}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                      {formatPSNR(entry.quality_vs_reference.psnr)}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                      {formatSSIM(entry.quality_vs_reference.ssim)}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
                      {formatMemory(entry.results.peak_memory_mb)}
                    </td>
                    <td className="py-2 pl-4 text-right tabular-nums text-muted-foreground">
                      {entry.settings.samples_per_pixel.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metadata + CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground/60">
            {sceneNames.length} scene{sceneNames.length !== 1 ? "s" : ""} tested
            on {hwProfiles.join(", ")}
          </p>
          <Link
            href={`/benchmarks?renderer=${rendererId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all benchmarks
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}
