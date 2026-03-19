/**
 * FeatureMatrixToolbar — Control bar above the feature table.
 *
 * Contains a contextual summary, "Highlight Differences" toggle,
 * and export buttons (CSV / PNG). Uses a minimal custom toggle
 * switch styled with CSS custom properties.
 *
 * @internal Receives props from the FeatureMatrix orchestrator.
 */

import { cx } from "../../utils/classnames";
import { DownloadIcon, CameraIcon } from "./FeatureMatrixIcons";

interface FeatureMatrixToolbarProps {
  highlightDifferences: boolean;
  onToggleHighlight: () => void;
  onExportCSV: () => void;
  onExportPNG: () => void;
  rendererCount: number;
  featureCount: number;
  exportable: boolean;
}

export function FeatureMatrixToolbar({
  highlightDifferences,
  onToggleHighlight,
  onExportCSV,
  onExportPNG,
  rendererCount,
  featureCount,
  exportable,
}: FeatureMatrixToolbarProps) {
  return (
    <div className="rs-feature-matrix-toolbar">
      <span className="rs-feature-matrix-toolbar-summary">
        Comparing {rendererCount} renderer{rendererCount !== 1 ? "s" : ""} across{" "}
        {featureCount} features
      </span>

      <div className="rs-feature-matrix-toolbar-controls">
        {/* Highlight Differences toggle */}
        <button
          className={cx(
            "rs-toggle",
            highlightDifferences && "rs-toggle--active",
          )}
          role="switch"
          aria-checked={highlightDifferences}
          onClick={onToggleHighlight}
          type="button"
        >
          <span className="rs-toggle-track">
            <span className="rs-toggle-thumb" />
          </span>
          <span className="rs-toggle-label">Highlight Differences</span>
        </button>

        {/* Export buttons */}
        {exportable && (
          <>
            <button
              className="rs-export-btn"
              onClick={onExportCSV}
              aria-label="Export feature comparison as CSV"
              type="button"
            >
              <DownloadIcon />
              <span>CSV</span>
            </button>
            <button
              className="rs-export-btn"
              onClick={onExportPNG}
              aria-label="Export feature comparison as PNG"
              type="button"
            >
              <CameraIcon />
              <span>PNG</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
