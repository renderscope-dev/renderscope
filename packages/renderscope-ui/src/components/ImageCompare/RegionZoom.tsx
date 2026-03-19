/**
 * Region zoom comparison — overview with draggable selection + magnified panels.
 *
 * Shows an overview image with a draggable rectangular selection.
 * Magnified panels display the selected region from each image at zoom level.
 *
 * Fully standalone — no Next.js, Tailwind, shadcn/ui, or lucide-react.
 */

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { cx } from "../../utils/classnames";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { ImageOffIcon } from "../common/InlineSvgIcons";
import type { ComparisonImage, NormalizedRegion } from "../../types/image-compare";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RegionZoomProps {
  /** Array of images to compare (minimum 2). */
  images: ComparisonImage[];
  /** Magnification factor. Default: 4 */
  zoomLevel?: number;
  /** Selection region size in pixels. Default: 150 */
  regionSize?: number;
  /** Show image labels in magnified panels. Default: true */
  showLabels?: boolean;
  /** Callback when selected region changes. */
  onRegionChange?: (region: NormalizedRegion) => void;
  /** Additional CSS class name. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ZOOM_PRESETS = [2, 4, 8, 16] as const;
const MIN_SELECTION_PX = 30;
const NUDGE_STEP = 0.05;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// MagnifiedPanel sub-component
// ---------------------------------------------------------------------------

const MagnifiedPanel = memo(function MagnifiedPanel({
  image,
  region,
  zoomLevel,
  showLabel = true,
}: {
  image: ComparisonImage;
  region: NormalizedRegion;
  zoomLevel: number;
  showLabel?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef(0);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
      setError(false);
    };
    img.onerror = () => {
      imgRef.current = null;
      setLoaded(true);
      setError(true);
    };
    img.src = image.src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [image.src]);

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    });
    observer.observe(container);
    const rect = container.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    return () => observer.disconnect();
  }, []);

  // Draw zoomed region
  const drawRegion = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const { width: dw, height: dh } = containerSize;
    if (dw <= 0 || dh <= 0) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    canvas.width = Math.round(dw * dpr);
    canvas.height = Math.round(dh * dpr);
    canvas.style.width = `${dw}px`;
    canvas.style.height = `${dh}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = zoomLevel < 4;
    ctx.imageSmoothingQuality = "high";

    const sx = region.x * img.naturalWidth;
    const sy = region.y * img.naturalHeight;
    const sw = region.width * img.naturalWidth;
    const sh = region.height * img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }, [region, zoomLevel, containerSize]);

  useEffect(() => {
    if (!loaded || error) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawRegion);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, error, drawRegion]);

  return (
    <div className="rs-zoom__panel" aria-label={`Zoomed view: ${image.label}`}>
      {showLabel && (
        <div className="rs-zoom__panel-header">
          <span className="rs-zoom__panel-label">{image.label}</span>
        </div>
      )}

      <div ref={containerRef} className="rs-zoom__panel-canvas">
        {!loaded && <div className="rs-skeleton" style={{ position: "absolute", inset: 0 }} />}
        {error && (
          <div className="rs-error-container" style={{ position: "absolute", inset: 0 }}>
            <ImageOffIcon width={24} height={24} />
            <span className="rs-error-text">{image.label}</span>
          </div>
        )}
        {loaded && !error && (
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
        )}
        {loaded && !error && (
          <div className="rs-zoom__panel-zoom-badge">{zoomLevel}\u00D7</div>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// ZoomSelectionBox sub-component
// ---------------------------------------------------------------------------

function ZoomSelectionBox({
  region,
  containerWidth,
  containerHeight,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  animate,
}: {
  region: NormalizedRegion;
  containerWidth: number;
  containerHeight: number;
  onDragStart: (clientX: number, clientY: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  animate: boolean;
}) {
  const left = region.x * containerWidth;
  const top = region.y * containerHeight;
  const width = region.width * containerWidth;
  const height = region.height * containerHeight;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onDragStart(e.clientX, e.clientY);
    },
    [onDragStart],
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
      onDragMove(e.clientX, e.clientY);
    };
    const handleUp = () => onDragEnd();
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging, onDragMove, onDragEnd]);

  return (
    <>
      {/* Dimmed overlay regions */}
      <div className="rs-zoom__dim-overlay" style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className="rs-zoom__dim-overlay" style={{ bottom: 0, left: 0, right: 0, height: containerHeight - top - height }} />
      <div className="rs-zoom__dim-overlay" style={{ top, left: 0, height, width: left }} />
      <div className="rs-zoom__dim-overlay" style={{ top, right: 0, height, width: containerWidth - left - width }} />

      {/* Selection box */}
      <div
        onPointerDown={handlePointerDown}
        className={cx(
          "rs-zoom__selection",
          isDragging && "rs-zoom__selection--dragging",
          animate && !isDragging && "rs-zoom__selection--animate",
        )}
        style={{ left, top, width, height }}
        role="slider"
        aria-label="Zoom region selector"
        aria-valuenow={Math.round(region.x * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`Region at ${Math.round(region.x * 100)}%, ${Math.round(region.y * 100)}%`}
      >
        <div className="rs-zoom__selection-corner rs-zoom__selection-corner--tl" />
        <div className="rs-zoom__selection-corner rs-zoom__selection-corner--tr" />
        <div className="rs-zoom__selection-corner rs-zoom__selection-corner--bl" />
        <div className="rs-zoom__selection-corner rs-zoom__selection-corner--br" />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RegionZoom({
  images,
  zoomLevel: initialZoomLevel = 4,
  regionSize: initialRegionSize = 150,
  showLabels = true,
  onRegionChange,
  className,
}: RegionZoomProps) {
  const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
  const [overviewIndex, setOverviewIndex] = useState(0);
  const [overviewLoaded, setOverviewLoaded] = useState(false);
  const [overviewError, setOverviewError] = useState(false);
  const [overviewNaturalSize, setOverviewNaturalSize] = useState({ width: 0, height: 0 });
  const [animateSelection, setAnimateSelection] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { ref: overviewContainerRef, width: containerWidth, height: containerHeight } =
    useResizeObserver<HTMLDivElement>();

  const imageCount = images.length;

  // Drag offset ref
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Region state
  const regionNormWidth = useMemo(() => {
    if (containerWidth <= 0) return 0.2;
    const effectivePx = initialRegionSize / zoomLevel;
    return Math.max(effectivePx / containerWidth, MIN_SELECTION_PX / containerWidth);
  }, [containerWidth, initialRegionSize, zoomLevel]);

  const regionNormHeight = useMemo(() => {
    if (containerHeight <= 0) return 0.2;
    const effectivePx = initialRegionSize / zoomLevel;
    return Math.max(effectivePx / containerHeight, MIN_SELECTION_PX / containerHeight);
  }, [containerHeight, initialRegionSize, zoomLevel]);

  const [region, setRegionState] = useState<NormalizedRegion>(() => ({
    x: 0.5 - regionNormWidth / 2,
    y: 0.5 - regionNormHeight / 2,
    width: regionNormWidth,
    height: regionNormHeight,
  }));

  const regionRef = useRef(region);
  regionRef.current = region;

  const setRegion = useCallback(
    (newRegion: NormalizedRegion) => {
      const clamped: NormalizedRegion = {
        x: clamp(newRegion.x, 0, 1 - newRegion.width),
        y: clamp(newRegion.y, 0, 1 - newRegion.height),
        width: newRegion.width,
        height: newRegion.height,
      };
      setRegionState(clamped);
      onRegionChange?.(clamped);
    },
    [onRegionChange],
  );

  // Update region dimensions when zoom changes (keep center stable)
  useEffect(() => {
    if (containerWidth <= 0 || containerHeight <= 0) return;
    const effectivePx = initialRegionSize / zoomLevel;
    const newW = Math.max(effectivePx / containerWidth, MIN_SELECTION_PX / containerWidth);
    const newH = Math.max(effectivePx / containerHeight, MIN_SELECTION_PX / containerHeight);
    const cur = regionRef.current;
    const centerX = cur.x + cur.width / 2;
    const centerY = cur.y + cur.height / 2;

    setAnimateSelection(true);
    setRegion({
      x: centerX - newW / 2,
      y: centerY - newH / 2,
      width: newW,
      height: newH,
    });
    const timer = setTimeout(() => setAnimateSelection(false), 200);
    return () => clearTimeout(timer);
  }, [zoomLevel, containerWidth, containerHeight, initialRegionSize, setRegion]);

  // --- Overview handlers ---

  const handleOverviewLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setOverviewNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setOverviewLoaded(true);
      setOverviewError(false);
    },
    [],
  );

  const handleOverviewError = useCallback(() => {
    setOverviewLoaded(true);
    setOverviewError(true);
  }, []);

  useEffect(() => {
    setOverviewLoaded(false);
    setOverviewError(false);
  }, [overviewIndex]);

  const handleOverviewClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      setAnimateSelection(true);
      setRegion({
        x: normX - region.width / 2,
        y: normY - region.height / 2,
        width: region.width,
        height: region.height,
      });
      setTimeout(() => setAnimateSelection(false), 200);
    },
    [isDragging, region.width, region.height, setRegion],
  );

  // --- Drag handlers ---

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      const container = overviewContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;
      dragOffsetRef.current = { x: normX - regionRef.current.x, y: normY - regionRef.current.y };
      setAnimateSelection(false);
      setIsDragging(true);
    },
    [overviewContainerRef],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      const container = overviewContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;
      const rawX = normX - dragOffsetRef.current.x;
      const rawY = normY - dragOffsetRef.current.y;
      setRegionState((prev) => {
        const clamped: NormalizedRegion = {
          x: clamp(rawX, 0, 1 - prev.width),
          y: clamp(rawY, 0, 1 - prev.height),
          width: prev.width,
          height: prev.height,
        };
        onRegionChange?.(clamped);
        return clamped;
      });
    },
    [overviewContainerRef, onRegionChange],
  );

  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  // --- Keyboard ---

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setRegion({ ...region, x: region.x - NUDGE_STEP });
          break;
        case "ArrowRight":
          e.preventDefault();
          setRegion({ ...region, x: region.x + NUDGE_STEP });
          break;
        case "ArrowUp":
          e.preventDefault();
          setRegion({ ...region, y: region.y - NUDGE_STEP });
          break;
        case "ArrowDown":
          e.preventDefault();
          setRegion({ ...region, y: region.y + NUDGE_STEP });
          break;
        case "+":
        case "=": {
          e.preventDefault();
          const idx = ZOOM_PRESETS.indexOf(zoomLevel as (typeof ZOOM_PRESETS)[number]);
          if (idx < ZOOM_PRESETS.length - 1) {
            setZoomLevel(ZOOM_PRESETS[idx + 1] ?? zoomLevel);
          }
          break;
        }
        case "-":
        case "_": {
          e.preventDefault();
          const idx = ZOOM_PRESETS.indexOf(zoomLevel as (typeof ZOOM_PRESETS)[number]);
          if (idx > 0) {
            setZoomLevel(ZOOM_PRESETS[idx - 1] ?? zoomLevel);
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          setAnimateSelection(true);
          setRegion({
            x: 0.5 - region.width / 2,
            y: 0.5 - region.height / 2,
            width: region.width,
            height: region.height,
          });
          setTimeout(() => setAnimateSelection(false), 200);
          break;
      }
    },
    [region, setRegion, zoomLevel],
  );

  const aspectRatio =
    overviewNaturalSize.width > 0 && overviewNaturalSize.height > 0
      ? overviewNaturalSize.width / overviewNaturalSize.height
      : 16 / 9;

  const currentOverviewImage = images[overviewIndex];

  return (
    <div
      role="application"
      aria-label="Region zoom comparison"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cx("rs-zoom", className)}
    >
      {/* Overview */}
      <div
        ref={overviewContainerRef}
        className="rs-zoom__overview"
        style={{ aspectRatio }}
        onClick={handleOverviewClick}
      >
        {!overviewLoaded && (
          <div className="rs-skeleton" style={{ position: "absolute", inset: 0, zIndex: 10 }} />
        )}

        {overviewError && (
          <div className="rs-error-container" style={{ position: "absolute", inset: 0 }}>
            <ImageOffIcon />
            <span className="rs-error-text">Failed to load image</span>
          </div>
        )}

        {currentOverviewImage && !overviewError && (
          <img
            src={currentOverviewImage.src}
            alt={currentOverviewImage.label}
            draggable={false}
            onLoad={handleOverviewLoad}
            onError={handleOverviewError}
            className={cx(
              "rs-zoom__overview-image",
              !overviewLoaded && "rs-zoom__overview-image--hidden",
            )}
          />
        )}

        {/* Darkening overlay */}
        {overviewLoaded && !overviewError && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "rgba(0,0,0,0.1)" }} />
        )}

        {/* Selection box */}
        {overviewLoaded && !overviewError && containerWidth > 0 && (
          <ZoomSelectionBox
            region={region}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            isDragging={isDragging}
            animate={animateSelection}
          />
        )}

        {/* Image switcher pills */}
        {imageCount > 1 && overviewLoaded && !overviewError && (
          <div className="rs-zoom__pills">
            {images.map((image, index) => (
              <button
                key={`pill-${index}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOverviewIndex(index);
                }}
                className={cx(
                  "rs-zoom__pill",
                  index === overviewIndex
                    ? "rs-zoom__pill--active"
                    : "rs-zoom__pill--inactive",
                )}
              >
                {image.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Magnified panels */}
      <div className="rs-zoom__panels">
        <div className={cx(
          "rs-zoom__panels-grid",
          imageCount >= 3 && "rs-zoom__panels-grid--3",
        )}>
          {images.map((image, index) => (
            <MagnifiedPanel
              key={`mag-${index}`}
              image={image}
              region={region}
              zoomLevel={zoomLevel}
              showLabel={showLabels}
            />
          ))}
        </div>

        {/* Zoom controls */}
        <div className="rs-zoom__controls">
          <div className="rs-zoom__controls-inner">
            <span className="rs-zoom__controls-label">Zoom:</span>
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setZoomLevel(preset)}
                aria-label={`${preset}\u00D7 zoom`}
                className={cx(
                  "rs-zoom__preset-btn",
                  zoomLevel === preset && "rs-zoom__preset-btn--active",
                )}
              >
                {preset}\u00D7
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
