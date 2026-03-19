// ═══════════════════════════════════════════════════════════════
// BENCHMARK-SPECIFIC FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Format megabytes into human-readable memory.
 * Under 1024 MB: "340 MB"
 * Over 1024 MB: "1.2 GB"
 */
export function formatMemory(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

/**
 * Format PSNR value with unit.
 * "42.1 dB"
 */
export function formatPSNR(value: number): string {
  return `${value.toFixed(1)} dB`;
}

/**
 * Format SSIM value (4 decimal places).
 * "0.9987"
 */
export function formatSSIM(value: number): string {
  return value.toFixed(4);
}
