/**
 * Pixel-level difference visualization between two images.
 *
 * Supports absolute RGB difference and luminance difference modes.
 * Computes and displays PSNR and SSIM quality metrics as an overlay.
 *
 * Fully standalone — no Next.js, Tailwind, shadcn/ui, or lucide-react.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "../../utils/classnames";
import {
  loadImageData,
  computeAbsoluteDiff,
  computeLuminanceDiff,
  computePSNR,
  computeSSIM,
} from "../../utils/imageProcessing";
import { AlertTriangleIcon } from "../common/InlineSvgIcons";
import type { DiffMode, ColorMapName, ImageMetrics } from "../../types/image-compare";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImageDiffProps {
  /** Reference image URL (the baseline / ground truth). */
  reference: string;
  /** Test image URL (the image being evaluated). */
  test: string;
  /** Diff visualization mode. Default: 'absolute' */
  mode?: DiffMode;
  /** Colormap for SSIM heatmap mode. Default: 'viridis' */
  colorMap?: ColorMapName;
  /** Error amplification factor. Default: 5 */
  amplification?: number;
  /** Show PSNR/SSIM metrics overlay. Default: true */
  showMetrics?: boolean;
  /** Callback when metrics are computed. */
  onMetricsComputed?: (metrics: ImageMetrics) => void;
  /** Additional CSS class name. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface PairedImageData {
  referenceData: ImageData;
  testData: ImageData;
  width: number;
  height: number;
}

function formatPSNR(value: number): string {
  if (!isFinite(value)) return "\u221E dB";
  return `${value.toFixed(2)} dB`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ImageDiff({
  reference,
  test,
  mode = "absolute",
  amplification = 5,
  showMetrics = true,
  onMetricsComputed,
  className,
}: ImageDiffProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  const [status, setStatus] = useState<LoadStatus>("idle");
  const [pairedData, setPairedData] = useState<PairedImageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{ psnr: number; ssim: number } | null>(
    null,
  );

  const requestIdRef = useRef(0);
  const onMetricsComputedRef = useRef(onMetricsComputed);
  useEffect(() => {
    onMetricsComputedRef.current = onMetricsComputed;
  }, [onMetricsComputed]);

  // Load both images and extract pixel data
  useEffect(() => {
    if (!reference || !test) {
      setStatus("idle");
      setPairedData(null);
      return;
    }

    const currentId = ++requestIdRef.current;
    setStatus("loading");
    setError(null);
    setMetrics(null);

    Promise.all([loadImageData(reference), loadImageData(test)])
      .then(([ref, tst]) => {
        if (requestIdRef.current !== currentId) return;

        if (ref.width !== tst.width || ref.height !== tst.height) {
          setStatus("error");
          setError(
            `Images must be the same size (reference: ${ref.width}\u00D7${ref.height}, test: ${tst.width}\u00D7${tst.height})`,
          );
          return;
        }

        setPairedData({
          referenceData: ref.data,
          testData: tst.data,
          width: ref.width,
          height: ref.height,
        });
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== currentId) return;
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Failed to load images",
        );
      });
  }, [reference, test]);

  // Compute diff visualization
  const diffImageData = useMemo(() => {
    if (!pairedData) return null;
    try {
      return mode === "absolute"
        ? computeAbsoluteDiff(
            pairedData.referenceData,
            pairedData.testData,
            amplification,
          )
        : computeLuminanceDiff(
            pairedData.referenceData,
            pairedData.testData,
            amplification,
          );
    } catch {
      return null;
    }
  }, [pairedData, mode, amplification]);

  // Paint diff to canvas
  useEffect(() => {
    if (!diffImageData || !pairedData) return;
    const { width, height } = pairedData;
    if (width === 0 || height === 0) return;

    let canvas = canvasElRef.current;
    const container = canvasRef.current;
    if (!container) return;

    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      container.appendChild(canvas);
      canvasElRef.current = canvas;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.putImageData(diffImageData, 0, 0);
    }
  }, [diffImageData, pairedData]);

  // Compute quality metrics (deferred so canvas paints first)
  useEffect(() => {
    if (!showMetrics || !pairedData) {
      setMetrics(null);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      try {
        const psnr = computePSNR(
          pairedData.referenceData,
          pairedData.testData,
        );
        const { score } = computeSSIM(
          pairedData.referenceData,
          pairedData.testData,
        );
        setMetrics({ psnr, ssim: score });

        onMetricsComputedRef.current?.({
          psnr,
          ssim: score,
          mse: 0, // will be recomputed if needed
        });
      } catch {
        setMetrics(null);
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [pairedData, showMetrics]);

  // Cleanup canvas on unmount
  useEffect(() => {
    return () => {
      const canvas = canvasElRef.current;
      if (canvas?.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasElRef.current = null;
    };
  }, []);

  const aspectRatio =
    pairedData && pairedData.width && pairedData.height
      ? pairedData.width / pairedData.height
      : 16 / 9;

  // --- Error state ---
  if (status === "error") {
    return (
      <div className={cx("rs-diff", className)}>
        <div className="rs-error-container" style={{ aspectRatio: "16 / 9" }}>
          <AlertTriangleIcon />
          <p className="rs-error-text">{error}</p>
        </div>
      </div>
    );
  }

  // --- Loading state ---
  if (status === "loading" || status === "idle") {
    return (
      <div className={cx("rs-diff", className)}>
        <div className="rs-skeleton" style={{ aspectRatio, width: "100%" }} />
        <div className="rs-diff__loading">
          <p className="rs-diff__loading-text">Computing difference\u2026</p>
        </div>
      </div>
    );
  }

  // --- Ready state ---
  return (
    <div className={cx("rs-diff", className)}>
      <div
        ref={canvasRef}
        className="rs-diff__canvas"
        style={{
          aspectRatio: pairedData
            ? `${pairedData.width} / ${pairedData.height}`
            : undefined,
        }}
      />

      {/* Mode badge */}
      <div className="rs-diff__badge">
        <span className="rs-badge">{mode}</span>
      </div>

      {/* Metrics overlay */}
      {showMetrics && metrics && (
        <div className="rs-diff__metrics">
          <div className="rs-diff__metric-row">
            <span className="rs-diff__metric-value">
              PSNR: {formatPSNR(metrics.psnr)}
            </span>
          </div>
          <div className="rs-diff__metric-row">
            <span className="rs-diff__metric-value">
              SSIM: {metrics.ssim.toFixed(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
