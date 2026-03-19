/**
 * GraphControls — Zoom control overlay for the taxonomy graph.
 *
 * Three icon buttons: Zoom In, Zoom Out, Fit to View.
 * Uses inline SVG icons from icons.tsx — no external icon library.
 *
 * @internal Not part of the public API — used by TaxonomyGraph wrapper.
 */

import { ZoomInIcon, ZoomOutIcon, ExpandIcon } from "./icons";

export interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
}

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitToView,
}: GraphControlsProps) {
  return (
    <div className="rs-taxonomy-controls">
      <button
        className="rs-taxonomy-controls__btn"
        onClick={onZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomInIcon />
      </button>
      <button
        className="rs-taxonomy-controls__btn"
        onClick={onZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOutIcon />
      </button>
      <div className="rs-taxonomy-controls__divider" />
      <button
        className="rs-taxonomy-controls__btn"
        onClick={onFitToView}
        aria-label="Fit to view"
        title="Fit to view"
      >
        <ExpandIcon />
      </button>
    </div>
  );
}
