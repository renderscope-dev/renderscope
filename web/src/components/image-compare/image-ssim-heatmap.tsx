'use client';

import { useEffect, useMemo, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImageLoader } from '@/hooks/use-image-loader';
import { computeSSIM, generateSSIMHeatmap } from '@/lib/image-processing';
import { getColorMap, type ColorMapName } from '@/lib/color-maps';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export interface ImageSSIMHeatmapProps {
  /** URL of the reference image. */
  reference: string;
  /** URL of the test image. */
  test: string;
  /**
   * Color map for the heatmap visualization.
   * @default 'viridis'
   */
  colorMap?: ColorMapName;
  /**
   * SSIM block size in pixels. Smaller = finer detail but slower.
   * @default 8
   */
  blockSize?: number;
  /** Additional CSS classes for the outer container. */
  className?: string;
}

function interpretSSIM(score: number): string {
  if (score >= 0.98) return 'Near-identical';
  if (score >= 0.95) return 'Very similar';
  if (score >= 0.90) return 'Similar';
  if (score >= 0.80) return 'Noticeably different';
  return 'Substantially different';
}

/**
 * Renders a small inline canvas showing a colormap gradient preview.
 */
function ColorMapPreview({
  colorMapName,
  width = 60,
  height = 12,
}: {
  colorMapName: ColorMapName;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lut = getColorMap(colorMapName);
    for (let x = 0; x < width; x++) {
      const idx = Math.round((x / (width - 1)) * 255);
      const color = lut[idx];
      if (color) {
        ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
        ctx.fillRect(x, 0, 1, height);
      }
    }
  }, [colorMapName, width, height]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`${colorMapName} color map gradient from identical to different`}
      className="rounded-sm"
      style={{ width, height, display: 'block' }}
    />
  );
}

export { ColorMapPreview };

export function ImageSSIMHeatmap({
  reference,
  test,
  colorMap = 'viridis',
  blockSize = 8,
  className,
}: ImageSSIMHeatmapProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const { status, referenceData, testData, width, height, error } =
    useImageLoader(reference, test);

  // Compute SSIM data.
  const ssimResult = useMemo(() => {
    if (!referenceData || !testData) return null;
    try {
      return computeSSIM(referenceData, testData, blockSize);
    } catch {
      return null;
    }
  }, [referenceData, testData, blockSize]);

  // Generate the heatmap ImageData.
  const heatmapData = useMemo(() => {
    if (!ssimResult || width === 0 || height === 0) return null;
    return generateSSIMHeatmap(
      ssimResult.map,
      ssimResult.mapWidth,
      ssimResult.mapHeight,
      width,
      height,
      blockSize,
      colorMap,
    );
  }, [ssimResult, width, height, blockSize, colorMap]);

  // Paint the heatmap onto the canvas.
  useEffect(() => {
    if (!heatmapData || width === 0 || height === 0) return;

    let canvas = canvasElRef.current;
    const container = canvasContainerRef.current;
    if (!container) return;

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);
      canvasElRef.current = canvas;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(heatmapData, 0, 0);
    }
  }, [heatmapData, width, height]);

  // Clean up canvas on unmount.
  useEffect(() => {
    return () => {
      const canvas = canvasElRef.current;
      if (canvas?.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasElRef.current = null;
    };
  }, []);

  const aspectRatio = width && height ? width / height : 16 / 9;

  // --- Error state ---
  if (status === 'error') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-border bg-card',
          className,
        )}
      >
        <div
          className="flex flex-col items-center justify-center gap-3 p-8"
          style={{ aspectRatio: '16 / 9' }}
        >
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-center text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (status === 'loading' || status === 'idle') {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-border bg-card',
          className,
        )}
      >
        <Skeleton
          className="w-full"
          style={{ aspectRatio: `${aspectRatio}` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Computing SSIM heatmap&hellip;
          </p>
        </div>
      </div>
    );
  }

  // --- Ready state ---
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card',
        className,
      )}
    >
      {/* Canvas container */}
      <div
        ref={canvasContainerRef}
        role="img"
        aria-label={`SSIM structural similarity heatmap using ${colorMap} color map`}
        className="w-full"
        style={{ aspectRatio: `${width} / ${height}` }}
      />

      {/* Colormap badge (top-right) */}
      <Badge
        variant="secondary"
        className="absolute right-2 top-2 text-[10px] uppercase tracking-wider transition-all duration-200"
      >
        {colorMap}
      </Badge>

      {/* Global SSIM score overlay (bottom-left) */}
      {ssimResult && (
        <div className="absolute bottom-2 left-2 flex flex-col gap-0.5 rounded-md bg-black/70 px-3 py-2 backdrop-blur-sm transition-all duration-200">
          <span className="font-mono text-sm font-semibold text-white/95">
            SSIM: {ssimResult.score.toFixed(4)}
          </span>
          <span className="text-[10px] text-white/60">
            {interpretSSIM(ssimResult.score)}
          </span>
        </div>
      )}

      {/* Color legend */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-2">
        <span className="shrink-0 text-xs text-muted-foreground">Identical</span>
        <ColorMapPreview colorMapName={colorMap} width={200} height={12} />
        <span className="shrink-0 text-xs text-muted-foreground">Different</span>
      </div>
    </div>
  );
}
