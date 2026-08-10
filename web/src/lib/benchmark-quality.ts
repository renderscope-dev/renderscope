import type { BenchmarkEntry, BenchmarkTableRow } from "@/types/benchmark";

/**
 * Whether a benchmark's quality metrics were measured against the *same*
 * renderer that produced them.
 *
 * `quality_vs_reference` names the renderer that produced the reference image.
 * When that is the renderer under test — typically its own higher-sample-count
 * render — the resulting PSNR/SSIM describe how far the run has converged
 * toward that renderer's own answer. That is a useful number, but it is not a
 * comparison against ground truth, and it is not comparable across renderers:
 *
 * - A biased renderer converges quickly to its own (possibly wrong) result and
 *   scores very highly.
 * - An unbiased renderer converges more slowly toward the correct result and
 *   scores lower.
 *
 * Ranking renderers on such values would reward converging quietly rather than
 * rendering accurately, so self-referenced records are labelled in the table
 * and excluded from cross-renderer comparisons.
 */
export function isSelfReferenced(
  quality: { reference_renderer?: string } | null | undefined,
  renderer: string
): boolean {
  return Boolean(quality?.reference_renderer) &&
    quality!.reference_renderer === renderer;
}

/** `isSelfReferenced` for a full benchmark entry. */
export function entryIsSelfReferenced(entry: BenchmarkEntry): boolean {
  return isSelfReferenced(entry.quality_vs_reference, entry.renderer);
}

/** `isSelfReferenced` for a flattened table row. */
export function rowIsSelfReferenced(row: BenchmarkTableRow): boolean {
  return Boolean(row.selfReferencedQuality);
}

/**
 * Quality metrics that can be compared *between* renderers.
 *
 * Returns `undefined` for self-referenced records so callers can skip them
 * rather than average incomparable numbers together.
 */
export function crossRendererPsnr(entry: BenchmarkEntry): number | undefined {
  return entryIsSelfReferenced(entry) ? undefined : entry.quality_vs_reference?.psnr;
}

/** Cross-renderer-comparable SSIM, or `undefined` when self-referenced. */
export function crossRendererSsim(entry: BenchmarkEntry): number | undefined {
  return entryIsSelfReferenced(entry) ? undefined : entry.quality_vs_reference?.ssim;
}

/**
 * Short explanation shown alongside a self-referenced quality value.
 * Kept here so the table, the tooltip, and any future surface stay consistent.
 */
export const SELF_REFERENCE_NOTE =
  "Measured against this renderer's own higher-sample render, so this is a " +
  "convergence measurement rather than a comparison against ground truth. " +
  "It is not comparable with other renderers.";
