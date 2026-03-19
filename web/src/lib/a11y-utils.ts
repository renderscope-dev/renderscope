import type { CSSProperties } from "react";

// ═══════════════════════════════════════════════════════════════
// SCREEN READER ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════

let liveRegion: HTMLDivElement | null = null;

/**
 * Announce a message to screen readers via an ARIA live region.
 *
 * This utility manages a single visually-hidden live region
 * in the DOM. Screen readers announce text changes in the region
 * automatically. The "double-write" trick (clear → wait → set)
 * ensures the screen reader notices the change even when the
 * new message is identical to the previous one.
 *
 * @param message - Text to announce.
 * @param priority - "polite" (default) waits for the screen reader
 *   to finish speaking; "assertive" interrupts immediately.
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  if (typeof document === "undefined") return;

  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.id = "a11y-live-region";
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    Object.assign(liveRegion.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
      padding: "0",
      margin: "-1px",
    });
    document.body.appendChild(liveRegion);
  }

  // Update priority if needed
  liveRegion.setAttribute("aria-live", priority);

  // Double-write trick: clear first, then set after a frame.
  // This ensures the screen reader detects the change even if
  // the new text is identical to the previous text.
  liveRegion.textContent = "";
  requestAnimationFrame(() => {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// CHART DESCRIPTIONS
// ═══════════════════════════════════════════════════════════════

interface ChartDataItem {
  label: string;
  value: number;
}

/**
 * Generate a human-readable description of a bar chart for screen readers.
 *
 * @param data - Array of { label, value } items.
 * @param metric - Name of the metric being displayed (e.g., "render time").
 * @param unit - Unit of measurement (e.g., "seconds", "MB", "dB").
 * @returns A descriptive string like: "Bar chart of render time. PBRT: 42 seconds. Mitsuba: 35 seconds."
 */
export function describeBarChart(
  data: ChartDataItem[],
  metric: string,
  unit: string
): string {
  if (data.length === 0) return `Bar chart of ${metric}. No data available.`;

  const items = data
    .map((d) => `${d.label}: ${d.value}${unit ? ` ${unit}` : ""}`)
    .join(". ");

  return `Bar chart of ${metric}. ${items}.`;
}

/**
 * Generate a human-readable description of a convergence plot for screen readers.
 *
 * @param renderers - Array of { name, finalValue } for each line in the plot.
 * @param metric - Name of the metric (e.g., "PSNR").
 * @param unit - Unit of measurement (e.g., "dB").
 * @returns A descriptive string summarizing the convergence data.
 */
export function describeConvergencePlot(
  renderers: { name: string; finalValue: number }[],
  metric: string,
  unit: string
): string {
  if (renderers.length === 0) {
    return `Convergence plot of ${metric}. No data available.`;
  }

  const items = renderers
    .map((r) => `${r.name}: ${r.finalValue}${unit ? ` ${unit}` : ""}`)
    .join(". ");

  return `Convergence plot showing ${metric} over time for ${renderers.length} renderer${renderers.length === 1 ? "" : "s"}. Final values: ${items}.`;
}

// ═══════════════════════════════════════════════════════════════
// VISUALLY HIDDEN STYLES
// ═══════════════════════════════════════════════════════════════

/**
 * CSS properties that visually hide an element while keeping it
 * accessible to screen readers. Use as `style={visuallyHiddenStyles}`
 * on elements that provide sr-only text.
 *
 * Equivalent to Tailwind's `sr-only` utility class.
 */
export const visuallyHiddenStyles: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
  padding: 0,
  margin: "-1px",
};
