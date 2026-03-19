"use client";

import { useState, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// CHART ↔ TABLE HIGHLIGHT STATE
// Manages bidirectional highlighting between chart bars and
// data table rows. When a bar is clicked, the corresponding
// row highlights and scrolls into view.
// ═══════════════════════════════════════════════════════════════

interface UseChartHighlightReturn {
  highlightedRowId: string | null;
  handleBarClick: (rowId: string) => void;
  clearHighlight: () => void;
}

/**
 * useChartHighlight — manages the highlight state between charts
 * and the data table.
 *
 * - `handleBarClick(rowId)`: toggles highlight on/off for a row.
 * - `clearHighlight()`: removes any active highlight.
 * - When a new row is highlighted, the hook scrolls it into view
 *   after a short delay (to let layout settle).
 */
export function useChartHighlight(): UseChartHighlightReturn {
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  const handleBarClick = useCallback((rowId: string) => {
    setHighlightedRowId((prev) => (prev === rowId ? null : rowId));
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedRowId(null);
  }, []);

  // Scroll to the highlighted row when it changes
  useEffect(() => {
    if (!highlightedRowId) return;

    const timer = setTimeout(() => {
      const row = document.querySelector(
        `[data-row-id="${highlightedRowId}"]`
      );
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });

        // Move focus to the row for screen reader announcement
        if (row instanceof HTMLElement) {
          row.focus({ preventScroll: true });
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [highlightedRowId]);

  return { highlightedRowId, handleBarClick, clearHighlight };
}
