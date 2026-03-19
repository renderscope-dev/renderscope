'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComparisonImage, NormalizedRegion } from '@/types/image-compare';

interface MagnifiedPanelProps {
  /** The image to zoom into */
  image: ComparisonImage;
  /** The region to display in normalized coordinates (0-1) */
  region: NormalizedRegion;
  /** Current zoom factor (for display badge) */
  zoomLevel: number;
  /** Optional explicit panel dimensions */
  panelSize?: { width: number; height: number };
  /** Optional className for the outer container */
  className?: string;
}

export function MagnifiedPanel({
  image,
  region,
  zoomLevel,
  panelSize,
  className,
}: MagnifiedPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Load the image as HTMLImageElement for canvas drawing
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

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

  // Track container size via ResizeObserver
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

    // Initial measurement
    const rect = container.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });

    return () => observer.disconnect();
  }, []);

  // Draw zoomed region to canvas
  const drawRegion = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const displayWidth = panelSize?.width ?? containerSize.width;
    const displayHeight = panelSize?.height ?? containerSize.height;
    if (displayWidth <= 0 || displayHeight <= 0) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

    // Set canvas internal resolution for high-DPI sharpness
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable image smoothing at high zoom for crisp pixel visibility
    ctx.imageSmoothingEnabled = zoomLevel < 4;
    ctx.imageSmoothingQuality = 'high';

    // Source rectangle in image pixel coordinates
    const sx = region.x * img.naturalWidth;
    const sy = region.y * img.naturalHeight;
    const sw = region.width * img.naturalWidth;
    const sh = region.height * img.naturalHeight;

    // Clear and draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }, [region, zoomLevel, containerSize, panelSize]);

  // Redraw when region, image, or size changes — use rAF for performance
  useEffect(() => {
    if (!loaded || error) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawRegion);

    return () => cancelAnimationFrame(rafRef.current);
  }, [loaded, error, drawRegion]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-muted',
        className,
      )}
      aria-label={`Zoomed view: ${image.label}`}
    >
      {/* Label bar */}
      <div className="border-b border-border bg-muted/50 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {image.label}
        </span>
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="relative aspect-square w-full">
        {/* Loading skeleton */}
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-primary/10" />
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted">
            <ImageOff className="h-6 w-6 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">
              {image.label}
            </span>
          </div>
        )}

        {/* Magnified canvas */}
        {loaded && !error && (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Magnified region of ${image.label} at ${zoomLevel}x zoom`}
            className="absolute inset-0 h-full w-full"
          />
        )}

        {/* Zoom level badge */}
        {loaded && !error && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/50 px-2 py-1 backdrop-blur-sm">
            <span className="text-xs text-white">{zoomLevel}×</span>
          </div>
        )}
      </div>
    </div>
  );
}
