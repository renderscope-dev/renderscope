/**
 * FeatureMatrix — Top-level orchestrator component.
 *
 * The only component the consumer imports. Manages internal state
 * (collapsed groups, highlight differences) and composes the
 * toolbar + table.
 *
 * Usage:
 * ```tsx
 * import { FeatureMatrix, RENDERSCOPE_FEATURE_CATEGORIES } from 'renderscope-ui';
 * import 'renderscope-ui/styles';
 *
 * <FeatureMatrix
 *   renderers={myRenderers}
 *   features={RENDERSCOPE_FEATURE_CATEGORIES}
 * />
 * ```
 */

import { useState, useCallback, useRef } from "react";
import { cx } from "../../utils/classnames";
import { FeatureMatrixToolbar } from "./FeatureMatrixToolbar";
import { FeatureMatrixTable } from "./FeatureMatrixTable";
import {
  exportFeatureMatrixCSV,
  exportFeatureMatrixPNG,
} from "./FeatureMatrixExport";
import type { FeatureMatrixProps } from "../../types/feature-matrix";

export function FeatureMatrix({
  renderers,
  features,
  exportable = true,
  collapsible = true,
  stickyHeader = true,
  className,
  onRendererClick,
  onRendererRemove,
}: FeatureMatrixProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [highlightDifferences, setHighlightDifferences] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const totalFeatures = features.reduce(
    (sum, cat) => sum + cat.features.length,
    0,
  );

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
    exportFeatureMatrixCSV(renderers, features);
  }, [renderers, features]);

  const handleExportPNG = useCallback(() => {
    if (tableRef.current) {
      void exportFeatureMatrixPNG(tableRef.current);
    }
  }, []);

  // Empty state for fewer than 2 renderers
  if (renderers.length < 2) {
    return (
      <div className={cx("rs-feature-matrix", className)}>
        <div className="rs-feature-matrix-empty">
          Select at least 2 items to compare
        </div>
      </div>
    );
  }

  return (
    <div className={cx("rs-feature-matrix", className)}>
      <FeatureMatrixToolbar
        highlightDifferences={highlightDifferences}
        onToggleHighlight={handleToggleHighlight}
        onExportCSV={handleExportCSV}
        onExportPNG={handleExportPNG}
        rendererCount={renderers.length}
        featureCount={totalFeatures}
        exportable={exportable}
      />
      <FeatureMatrixTable
        renderers={renderers}
        features={features}
        collapsedGroups={collapsedGroups}
        highlightDifferences={highlightDifferences}
        collapsible={collapsible}
        stickyHeader={stickyHeader}
        onToggleGroup={handleToggleGroup}
        onRendererClick={onRendererClick}
        onRendererRemove={onRendererRemove}
        tableRef={tableRef}
      />
    </div>
  );
}
