"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Columns3 } from "lucide-react";
import { FEATURE_CATEGORIES } from "@/lib/features";
import {
  exportFeatureMatrixCSV,
  exportFeatureMatrixPNG,
} from "./feature-matrix-export";
import { FeatureMatrixToolbar } from "./feature-matrix-toolbar";
import { FeatureMatrixTable } from "./feature-matrix-table";
import type { RendererData } from "@/types/renderer";

interface FeatureMatrixProps {
  renderers: RendererData[];
  onRemoveRenderer?: (rendererId: string) => void;
}

/**
 * Top-level Feature Matrix orchestrator.
 *
 * Receives the selected renderers from the Compare page and renders
 * the toolbar + scrollable table. Manages collapsed groups state
 * and the "highlight differences" toggle.
 */
export function FeatureMatrix({
  renderers,
  onRemoveRenderer,
}: FeatureMatrixProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [highlightDifferences, setHighlightDifferences] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Handlers ─────────────────────────────────────────────

  const handleToggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleToggleHighlight = useCallback(() => {
    setHighlightDifferences((prev) => !prev);
  }, []);

  const handleExportCSV = useCallback(() => {
    exportFeatureMatrixCSV(renderers, FEATURE_CATEGORIES);
  }, [renderers]);

  const handleExportPNG = useCallback(() => {
    void exportFeatureMatrixPNG(tableRef);
  }, []);

  const handleRemoveRenderer = useCallback(
    (rendererId: string) => {
      onRemoveRenderer?.(rendererId);
    },
    [onRemoveRenderer]
  );

  // ── Guard: fewer than 2 renderers ────────────────────────

  if (renderers.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex min-h-[300px] items-center justify-center"
      >
        <div className="mx-auto max-w-sm rounded-xl border-2 border-dashed border-border/40 px-8 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/30 text-muted-foreground/40">
            <Columns3 className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Select at least 2 renderers
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Use the picker above to add renderers and compare their features
            side by side.
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <motion.div
      data-testid="feature-matrix"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      <FeatureMatrixToolbar
        highlightDifferences={highlightDifferences}
        onToggleHighlight={handleToggleHighlight}
        onExportCSV={handleExportCSV}
        onExportPNG={handleExportPNG}
        rendererCount={renderers.length}
      />

      <FeatureMatrixTable
        renderers={renderers}
        collapsedGroups={collapsedGroups}
        highlightDifferences={highlightDifferences}
        onToggleGroup={handleToggleGroup}
        onRemoveRenderer={handleRemoveRenderer}
        tableRef={tableRef}
      />
    </motion.div>
  );
}
