/**
 * Side-by-side image comparison with synchronized zoom and pan.
 *
 * Two or more images are placed next to each other with linked
 * zoom/pan — when the user zooms or pans one image, all others follow.
 *
 * NEW component — not present in the web app.
 */

import { useCallback, useState, memo } from "react";
import { cx } from "../../utils/classnames";
import { useSyncedZoom } from "../../hooks/useSyncedZoom";
import { useImageLoader } from "../../hooks/useImageLoader";
import {
  ZoomInIcon,
  ZoomOutIcon,
  ResetIcon,
  ImageOffIcon,
} from "../common/InlineSvgIcons";
import type { ComparisonImage } from "../../types/image-compare";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImageSideBySideProps {
  /** Array of images to show side by side (2-4 recommended). */
  images: ComparisonImage[];
  /** Show image labels. Default: true */
  showLabels?: boolean;
  /** Enable synchronized zoom/pan. Default: true */
  syncZoom?: boolean;
  /** Initial zoom level. Default: 1 */
  initialZoom?: number;
  /** Show zoom controls. Default: true */
  showZoomControls?: boolean;
  /** Layout direction. Default: 'horizontal' */
  layout?: "horizontal" | "vertical";
  /** Additional CSS class name. */
  className?: string;
}

// ---------------------------------------------------------------------------
// ImagePanel sub-component
// ---------------------------------------------------------------------------

const ImagePanel = memo(function ImagePanel({
  image,
  scale,
  offsetX,
  offsetY,
  handlers,
  showLabel,
}: {
  image: ComparisonImage;
  scale: number;
  offsetX: number;
  offsetY: number;
  handlers: {
    onWheel: (e: React.WheelEvent) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onDoubleClick: () => void;
  };
  showLabel: boolean;
}) {
  const { image: loadedImg, loading, error } = useImageLoader(image.src);

  const isPanning = scale > 1;
  const isZoomed = scale > 1;

  return (
    <div
      className={cx(
        "rs-sidebyside__panel",
        isPanning && "rs-sidebyside__panel--panning",
        isZoomed && "rs-sidebyside__panel--zoomed",
      )}
      onWheel={handlers.onWheel}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onDoubleClick={handlers.onDoubleClick}
    >
      {showLabel && (
        <div className="rs-sidebyside__panel-label">{image.label}</div>
      )}

      <div className="rs-sidebyside__image-wrapper">
        {loading && (
          <div
            className="rs-skeleton"
            style={{ width: "100%", aspectRatio: "16 / 9" }}
          />
        )}

        {error && (
          <div
            className="rs-error-container"
            style={{ width: "100%", aspectRatio: "16 / 9" }}
          >
            <ImageOffIcon />
            <span className="rs-error-text">{image.label}</span>
          </div>
        )}

        {loadedImg && !error && (
          <img
            src={image.src}
            alt={image.label}
            draggable={false}
            className="rs-sidebyside__image"
            style={{
              transform: `scale(${scale}) translate(${offsetX / scale}px, ${offsetY / scale}px)`,
            }}
          />
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ImageSideBySide({
  images,
  showLabels = true,
  syncZoom = true,
  showZoomControls = true,
  layout = "horizontal",
  className,
}: ImageSideBySideProps) {
  const { state, handlers, reset, setZoom } = useSyncedZoom();

  // For independent zoom when syncZoom is false
  const [independentScales] = useState(() =>
    images.map(() => ({ scale: 1, offsetX: 0, offsetY: 0 })),
  );

  const effectiveScale = syncZoom ? state.scale : 1;
  const effectiveOffsetX = syncZoom ? state.offsetX : 0;
  const effectiveOffsetY = syncZoom ? state.offsetY : 0;

  const handleZoomIn = useCallback(() => {
    setZoom(state.scale * 1.5);
  }, [state.scale, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(state.scale / 1.5);
  }, [state.scale, setZoom]);

  const isVertical = layout === "vertical";

  return (
    <div className={cx("rs-sidebyside", className)}>
      <div
        className={cx(
          "rs-sidebyside__grid",
          isVertical && "rs-sidebyside__grid--vertical",
        )}
      >
        {images.map((image, index) => {
          const panelScale = syncZoom
            ? effectiveScale
            : independentScales[index]?.scale ?? 1;
          const panelOffsetX = syncZoom
            ? effectiveOffsetX
            : independentScales[index]?.offsetX ?? 0;
          const panelOffsetY = syncZoom
            ? effectiveOffsetY
            : independentScales[index]?.offsetY ?? 0;

          return (
            <ImagePanel
              key={`${image.src}-${index}`}
              image={image}
              scale={panelScale}
              offsetX={panelOffsetX}
              offsetY={panelOffsetY}
              handlers={syncZoom ? handlers : handlers}
              showLabel={showLabels}
            />
          );
        })}
      </div>

      {showZoomControls && (
        <div className="rs-sidebyside__controls">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={state.scale <= 1}
            aria-label="Zoom out"
            className="rs-sidebyside__zoom-btn"
          >
            <ZoomOutIcon />
          </button>

          <span className="rs-sidebyside__zoom-level">
            {state.scale <= 1 ? "Fit" : `${state.scale.toFixed(1)}\u00D7`}
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={state.scale >= 32}
            aria-label="Zoom in"
            className="rs-sidebyside__zoom-btn"
          >
            <ZoomInIcon />
          </button>

          <button
            type="button"
            onClick={reset}
            disabled={state.scale <= 1}
            aria-label="Reset zoom"
            className="rs-sidebyside__zoom-btn"
          >
            <ResetIcon />
          </button>
        </div>
      )}
    </div>
  );
}
