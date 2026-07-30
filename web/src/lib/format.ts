// ═══════════════════════════════════════════════════════════════
// BENCHMARK-SPECIFIC FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Format megabytes into human-readable memory.
 * Under 1024 MB: "340 MB"
 * Over 1024 MB: "1.2 GB"
 * Not recorded: "—"
 */
export function formatMemory(mb: number | null | undefined): string {
  if (mb == null) {
    return NOT_MEASURED;
  }
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

/**
 * Placeholder shown wherever a benchmark did not record a value.
 * An em dash reads as "not measured" without implying a zero.
 */
export const NOT_MEASURED = "—";

/**
 * Format PSNR value with unit.
 * "42.1 dB", or "—" when the run had no reference to compare against.
 */
export function formatPSNR(value: number | null | undefined): string {
  return value == null ? NOT_MEASURED : `${value.toFixed(1)} dB`;
}

/**
 * Format SSIM value (4 decimal places).
 * "0.9987", or "—" when the run had no reference to compare against.
 */
export function formatSSIM(value: number | null | undefined): string {
  return value == null ? NOT_MEASURED : value.toFixed(4);
}
