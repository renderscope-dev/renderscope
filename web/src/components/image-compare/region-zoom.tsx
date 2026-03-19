'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useResizeObserver } from '@/hooks/use-resize-observer';
import { useSyncedZoom } from '@/hooks/use-synced-zoom';
import { ZoomSelectionBox } from './zoom-selection-box';
import { MagnifiedPanel } from './magnified-panel';
import type { RegionZoomProps } from '@/types/image-compare';

const ZOOM_PRESETS = [2, 4, 8, 16] as const;
const MIN_SELECTION_PX = 30;
const NUDGE_STEP = 0.05; // 5% per arrow key press

export function RegionZoom({
  images,
  zoomLevel: initialZoomLevel = 4,
  regionSize: initialRegionSize = 150,
  onRegionChange,
  className,
}: RegionZoomProps) {
  const [zoomLevel, setZoomLevel] = useState(initialZoomLevel);
  const [overviewIndex, setOverviewIndex] = useState(0);
  const [overviewLoaded, setOverviewLoaded] = useState(false);
  const [overviewError, setOverviewError] = useState(false);
  const [overviewNaturalSize, setOverviewNaturalSize] = useState({
    width: 0,
    height: 0,
  });
  const [animateSelection, setAnimateSelection] = useState(false);

  const overviewImgRef = useRef<HTMLImageElement>(null);
  const { ref: overviewContainerRef, width: containerWidth, height: containerHeight } =
    useResizeObserver<HTMLDivElement>();

  const imageCount = images.length;

  // Calculate region dimensions in normalized coordinates based on zoom level
  // effectiveRegionSize = panelDisplaySize / zoomLevel
  // We use the initial region size as the base panel display size
  const regionNormWidth = useMemo(() => {
    if (containerWidth <= 0 || overviewNaturalSize.width <= 0) return 0.2;
    const effectivePx = initialRegionSize / zoomLevel;
    // Enforce minimum selection size
    const minNorm = MIN_SELECTION_PX / containerWidth;
    return Math.max(effectivePx / containerWidth, minNorm);
  }, [containerWidth, initialRegionSize, zoomLevel, overviewNaturalSize.width]);

  const regionNormHeight = useMemo(() => {
    if (containerHeight <= 0 || overviewNaturalSize.height <= 0) return 0.2;
    const effectivePx = initialRegionSize / zoomLevel;
    const minNorm = MIN_SELECTION_PX / containerHeight;
    return Math.max(effectivePx / containerHeight, minNorm);
  }, [containerHeight, initialRegionSize, zoomLevel, overviewNaturalSize.height]);

  const {
    region,
    isDragging,
    setRegion,
    startDrag,
    updateDrag,
    endDrag,
  } = useSyncedZoom({
    initialRegionWidth: regionNormWidth,
    initialRegionHeight: regionNormHeight,
    onRegionChange,
  });

  // Use a ref to read the latest region without triggering the effect
  const regionRef = useRef(region);
  regionRef.current = region;

  // Update region dimensions when zoom level changes (keep center stable)
  useEffect(() => {
    if (containerWidth <= 0 || containerHeight <= 0) return;

    const effectivePx = initialRegionSize / zoomLevel;
    const minNormW = MIN_SELECTION_PX / containerWidth;
    const minNormH = MIN_SELECTION_PX / containerHeight;
    const newW = Math.max(effectivePx / containerWidth, minNormW);
    const newH = Math.max(effectivePx / containerHeight, minNormH);

    // Keep the center of the selection stable
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

    // Disable animation after transition completes
    const timer = setTimeout(() => setAnimateSelection(false), 200);
    return () => clearTimeout(timer);
  }, [zoomLevel, containerWidth, containerHeight, initialRegionSize, setRegion]);

  // --- Overview image handlers ---

  const handleOverviewLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setOverviewNaturalSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setOverviewLoaded(true);
      setOverviewError(false);
    },
    [],
  );

  const handleOverviewError = useCallback(() => {
    setOverviewLoaded(true);
    setOverviewError(true);
  }, []);

  // Reset load state when overview image changes
  useEffect(() => {
    setOverviewLoaded(false);
    setOverviewError(false);
  }, [overviewIndex]);

  // --- Overview click to reposition ---

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

  // --- Drag handlers with container rect ---

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      const container = overviewContainerRef.current;
      if (!container) return;
      setAnimateSelection(false);
      startDrag(clientX, clientY, container.getBoundingClientRect());
    },
    [overviewContainerRef, startDrag],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      const container = overviewContainerRef.current;
      if (!container) return;
      updateDrag(clientX, clientY, container.getBoundingClientRect());
    },
    [overviewContainerRef, updateDrag],
  );

  // --- Keyboard controls ---

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setRegion({ ...region, x: region.x - NUDGE_STEP });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setRegion({ ...region, x: region.x + NUDGE_STEP });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setRegion({ ...region, y: region.y - NUDGE_STEP });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setRegion({ ...region, y: region.y + NUDGE_STEP });
          break;
        case '+':
        case '=': {
          e.preventDefault();
          const currentIdx = ZOOM_PRESETS.indexOf(
            zoomLevel as (typeof ZOOM_PRESETS)[number],
          );
          if (currentIdx < ZOOM_PRESETS.length - 1) {
            setZoomLevel(ZOOM_PRESETS[currentIdx + 1] ?? zoomLevel);
          }
          break;
        }
        case '-':
        case '_': {
          e.preventDefault();
          const currentIdx = ZOOM_PRESETS.indexOf(
            zoomLevel as (typeof ZOOM_PRESETS)[number],
          );
          if (currentIdx > 0) {
            setZoomLevel(ZOOM_PRESETS[currentIdx - 1] ?? zoomLevel);
          }
          break;
        }
        case 'Escape':
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

  // Aspect ratio for the overview
  const aspectRatio =
    overviewNaturalSize.width > 0 && overviewNaturalSize.height > 0
      ? overviewNaturalSize.width / overviewNaturalSize.height
      : 16 / 9;

  // Grid columns for magnified panels
  const gridCols =
    imageCount <= 2
      ? 'grid-cols-2'
      : imageCount === 3
        ? 'grid-cols-2 md:grid-cols-3'
        : imageCount === 4
          ? 'grid-cols-2'
          : 'grid-cols-2 md:grid-cols-3';

  const currentOverviewImage = images[overviewIndex];

  return (
    <div
      role="application"
      aria-label="Region zoom comparison"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      {/* Overview section */}
      <div className="relative">
        {/* Overview container */}
        <div
          ref={overviewContainerRef}
          className="relative overflow-hidden"
          style={{ aspectRatio }}
          onClick={handleOverviewClick}
        >
          {/* Loading skeleton */}
          {!overviewLoaded && (
            <div className="absolute inset-0 z-10 animate-pulse bg-primary/10" />
          )}

          {/* Error state */}
          {overviewError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted">
              <ImageOff className="h-8 w-8 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">
                Failed to load image
              </span>
            </div>
          )}

          {/* Overview image */}
          {currentOverviewImage && !overviewError && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={overviewImgRef}
              src={currentOverviewImage.src}
              alt={currentOverviewImage.label}
              draggable={false}
              onLoad={handleOverviewLoad}
              onError={handleOverviewError}
              className={cn(
                'h-full w-full object-cover',
                !overviewLoaded && 'invisible',
              )}
            />
          )}

          {/* Subtle darkening overlay */}
          {overviewLoaded && !overviewError && (
            <div className="pointer-events-none absolute inset-0 bg-black/10" />
          )}

          {/* Selection rectangle */}
          {overviewLoaded && !overviewError && containerWidth > 0 && (
            <ZoomSelectionBox
              region={region}
              containerWidth={containerWidth}
              containerHeight={containerHeight}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={endDrag}
              isDragging={isDragging}
              animate={animateSelection}
            />
          )}

          {/* Image switcher pills */}
          {imageCount > 1 && overviewLoaded && !overviewError && (
            <div className="absolute left-3 top-3 z-20 flex gap-1">
              {images.map((image, index) => (
                <button
                  key={`pill-${index}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOverviewIndex(index);
                  }}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs backdrop-blur-sm transition-colors',
                    index === overviewIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-black/50 text-white hover:bg-black/70',
                  )}
                >
                  {image.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Magnified panels section */}
      <div className="border-t border-border p-3">
        {/* Responsive grid — scrollable on mobile */}
        <div
          className={cn(
            'grid gap-3',
            // On mobile with 3+ images, use horizontal scroll
            imageCount > 2
              ? 'max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:[&>*]:min-w-[200px] max-md:[&>*]:flex-shrink-0 max-md:[&>*]:snap-start'
              : '',
            // Desktop grid layout
            gridCols,
          )}
        >
          {images.map((image, index) => (
            <MagnifiedPanel
              key={`mag-${index}`}
              image={image}
              region={region}
              zoomLevel={zoomLevel}
            />
          ))}
        </div>

        {/* Zoom level controls */}
        <div className="mt-3 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/80 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-xs text-muted-foreground">Zoom:</span>
            <ToggleGroup
              type="single"
              value={String(zoomLevel)}
              onValueChange={(val) => {
                if (val) setZoomLevel(Number(val));
              }}
              size="sm"
            >
              {ZOOM_PRESETS.map((preset) => (
                <ToggleGroupItem
                  key={preset}
                  value={String(preset)}
                  aria-label={`${preset}× zoom`}
                  className="h-6 px-2 text-[10px]"
                >
                  {preset}×
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
