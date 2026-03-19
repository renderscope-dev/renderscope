'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImageLoader } from '@/hooks/use-image-loader';
import {
  computeAbsoluteDiff,
  computeLuminanceDiff,
  computePSNR,
  computeSSIM,
} from '@/lib/image-processing';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export interface ImageDiffProps {
  /** URL of the reference (ground truth) image. */
  reference: string;
  /** URL of the test (comparison) image. */
  test: string;
  /** Visualization mode. */
  mode: 'absolute' | 'luminance';
  /**
   * Error amplification factor. Higher values make subtle differences visible.
   * @default 5
   */
  amplification?: number;
  /**
   * Whether to show PSNR and approximate SSIM metrics overlaid on the image.
   * @default true
   */
  showMetrics?: boolean;
  /** Additional CSS classes for the outer container. */
  className?: string;
}

interface Metrics {
  psnr: number;
  ssim: number;
}

function formatPSNR(value: number): string {
  if (!isFinite(value)) return '∞ dB';
  return `${value.toFixed(2)} dB`;
}

export function ImageDiff({
  reference,
  test,
  mode,
  amplification = 5,
  showMetrics = true,
  className,
}: ImageDiffProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const { status, referenceData, testData, width, height, error } =
    useImageLoader(reference, test);

  const [metrics, setMetrics] = useState<Metrics | null>(null);

  // Compute the diff image whenever inputs change.
  const diffImageData = useMemo(() => {
    if (!referenceData || !testData) return null;
    try {
      return mode === 'absolute'
        ? computeAbsoluteDiff(referenceData, testData, amplification)
        : computeLuminanceDiff(referenceData, testData, amplification);
    } catch {
      return null;
    }
  }, [referenceData, testData, mode, amplification]);

  // Paint the diff onto the canvas.
  useEffect(() => {
    if (!diffImageData || width === 0 || height === 0) return;

    let canvas = canvasElRef.current;
    const container = canvasRef.current;
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
      ctx.putImageData(diffImageData, 0, 0);
    }
  }, [diffImageData, width, height]);

  // Compute quality metrics (slightly deferred so diff image shows first).
  useEffect(() => {
    if (!showMetrics || !referenceData || !testData) {
      setMetrics(null);
      return;
    }

    // Use requestAnimationFrame to yield after the canvas paint.
    const frameId = requestAnimationFrame(() => {
      try {
        const psnr = computePSNR(referenceData, testData);
        const { score } = computeSSIM(referenceData, testData);
        setMetrics({ psnr, ssim: score });
      } catch {
        setMetrics(null);
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [referenceData, testData, showMetrics]);

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
            Computing difference&hellip;
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
        ref={canvasRef}
        role="img"
        aria-label={`${mode === 'absolute' ? 'Absolute' : 'Luminance'} difference visualization between reference and test images`}
        className="w-full"
        style={{ aspectRatio: `${width} / ${height}` }}
      />

      {/* Mode badge (top-right) */}
      <Badge
        variant="secondary"
        className="absolute right-2 top-2 text-[10px] uppercase tracking-wider transition-all duration-200"
      >
        {mode}
      </Badge>

      {/* Metrics overlay (bottom-left) */}
      {showMetrics && metrics && (
        <TooltipProvider delayDuration={300}>
          <div className="absolute bottom-2 left-2 flex flex-col gap-1 rounded-md bg-black/70 px-3 py-2 backdrop-blur-sm transition-all duration-200">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-white/90">
                PSNR: {formatPSNR(metrics.psnr)}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 cursor-help text-white/50" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="max-w-[200px] text-xs">
                    Peak Signal-to-Noise Ratio. Higher = more similar.
                    {'>'}40 dB: imperceptible, 30–40: minor, {'<'}20: very different.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-white/90">
                SSIM: {metrics.ssim.toFixed(4)}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 cursor-help text-white/50" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="max-w-[200px] text-xs">
                    Structural Similarity Index. 1.0 = identical. Measures
                    perceived visual similarity, not just pixel difference.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
