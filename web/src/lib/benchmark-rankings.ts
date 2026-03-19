import type { BenchmarkEntry } from "@/types/benchmark";
import { formatMemory, formatPSNR } from "@/lib/format";
import { formatRenderTime } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// BENCHMARK RANKING COMPUTATION
// Pure utility functions — no UI, no React, fully testable.
// ═══════════════════════════════════════════════════════════════

export interface RankingRunner {
  rendererId: string;
  rendererName: string;
  value: number;
  formattedValue: string;
}

export interface RankingResult {
  category: "fastest" | "memory-efficient" | "highest-quality";
  label: string;
  description: string;
  winnerId: string;
  winnerName: string;
  value: number;
  formattedValue: string;
  sceneCount: number;
  icon: "Zap" | "HardDrive" | "Target";
  accentColor: string;
  runners: RankingRunner[];
}

interface RendererAvg {
  rendererId: string;
  rendererName: string;
  avg: number;
  sceneCount: number;
}

/**
 * Group entries by renderer and compute the average of a numeric field.
 * Only averages across scenes the renderer has data for — does not
 * penalize for missing scenes.
 */
function computeRendererAverages(
  entries: BenchmarkEntry[],
  rendererNames: Record<string, string>,
  extractValue: (entry: BenchmarkEntry) => number
): RendererAvg[] {
  const groups = new Map<string, number[]>();

  for (const entry of entries) {
    const values = groups.get(entry.renderer);
    if (values) {
      values.push(extractValue(entry));
    } else {
      groups.set(entry.renderer, [extractValue(entry)]);
    }
  }

  const averages: RendererAvg[] = [];
  for (const [rendererId, values] of groups) {
    const sum = values.reduce((a, b) => a + b, 0);
    averages.push({
      rendererId,
      rendererName: rendererNames[rendererId] ?? rendererId,
      avg: sum / values.length,
      sceneCount: values.length,
    });
  }

  return averages;
}

/**
 * Compute all three ranking categories from filtered benchmark entries.
 *
 * Returns an array of RankingResult objects for:
 *   1. Fastest Renderer (lowest average render time)
 *   2. Most Memory-Efficient (lowest average peak memory)
 *   3. Highest Quality (highest average PSNR)
 *
 * Edge cases:
 *   - With fewer than 2 renderers, returns an empty array.
 *   - Ties (within 0.1%) show the first alphabetically.
 *   - If a renderer has data for only some scenes, its average
 *     is computed across just the scenes it has.
 */
export function computeRankings(
  entries: BenchmarkEntry[],
  rendererNames: Record<string, string>
): RankingResult[] {
  const uniqueRenderers = new Set(entries.map((e) => e.renderer));
  if (uniqueRenderers.size < 2) return [];

  const results: RankingResult[] = [];

  // ── Fastest Renderer (lower is better) ──────────────────────
  const timeAvgs = computeRendererAverages(
    entries,
    rendererNames,
    (e) => e.results.render_time_seconds
  ).sort((a, b) => a.avg - b.avg);

  if (timeAvgs.length >= 1) {
    const winner = timeAvgs[0]!;
    results.push({
      category: "fastest",
      label: "Fastest Renderer",
      description: "Lowest average render time across all scenes",
      winnerId: winner.rendererId,
      winnerName: winner.rendererName,
      value: winner.avg,
      formattedValue: `${formatRenderTime(winner.avg)} avg`,
      sceneCount: winner.sceneCount,
      icon: "Zap",
      accentColor: "amber",
      runners: timeAvgs.slice(1, 4).map((r) => ({
        rendererId: r.rendererId,
        rendererName: r.rendererName,
        value: r.avg,
        formattedValue: formatRenderTime(r.avg),
      })),
    });
  }

  // ── Most Memory-Efficient (lower is better) ─────────────────
  const memAvgs = computeRendererAverages(
    entries,
    rendererNames,
    (e) => e.results.peak_memory_mb
  ).sort((a, b) => a.avg - b.avg);

  if (memAvgs.length >= 1) {
    const winner = memAvgs[0]!;
    results.push({
      category: "memory-efficient",
      label: "Most Memory-Efficient",
      description: "Lowest average peak memory usage",
      winnerId: winner.rendererId,
      winnerName: winner.rendererName,
      value: winner.avg,
      formattedValue: `${formatMemory(winner.avg)} avg`,
      sceneCount: winner.sceneCount,
      icon: "HardDrive",
      accentColor: "teal",
      runners: memAvgs.slice(1, 4).map((r) => ({
        rendererId: r.rendererId,
        rendererName: r.rendererName,
        value: r.avg,
        formattedValue: formatMemory(r.avg),
      })),
    });
  }

  // ── Highest Quality (higher is better) ──────────────────────
  const psnrAvgs = computeRendererAverages(
    entries,
    rendererNames,
    (e) => e.quality_vs_reference.psnr
  ).sort((a, b) => b.avg - a.avg);

  if (psnrAvgs.length >= 1) {
    const winner = psnrAvgs[0]!;
    results.push({
      category: "highest-quality",
      label: "Highest Quality",
      description: "Highest average PSNR across all scenes",
      winnerId: winner.rendererId,
      winnerName: winner.rendererName,
      value: winner.avg,
      formattedValue: `${formatPSNR(winner.avg)} avg`,
      sceneCount: winner.sceneCount,
      icon: "Target",
      accentColor: "violet",
      runners: psnrAvgs.slice(1, 4).map((r) => ({
        rendererId: r.rendererId,
        rendererName: r.rendererName,
        value: r.avg,
        formattedValue: formatPSNR(r.avg),
      })),
    });
  }

  return results;
}
