/**
 * SSIM (Structural Similarity Index) false-color heatmap.
 *
 * Renders a full-resolution heatmap where the selected colormap visualizes
 * per-block SSIM scores. Includes a colorbar legend and global SSIM score.
 *
 * Fully standalone — no Next.js, Tailwind, shadcn/ui, or lucide-react.
 */

import { useEffect, useMemo, useRef, useState, memo } from "react";
import { cx } from "../../utils/classnames";
import {
  loadImageData,
  computeSSIM,
  generateSSIMHeatmap,
} from "../../utils/imageProcessing";
import { getColorMap } from "../../utils/colorMaps";
import { AlertTriangleIcon } from "../common/InlineSvgIcons";
import type { ColorMapName } from "../../types/image-compare";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImageSSIMHeatmapProps {
  /** Reference image URL. */
  reference: string;
  /** Test image URL. */
  test: string;
  /** Colormap for the heatmap. Default: 'viridis' */
  colorMap?: ColorMapName;
  /** SSIM block size in pixels. Default: 8 */
  blockSize?: number;
  /** Show global SSIM score overlay. Default: true */
  showScore?: boolean;
  /** Show a colorbar legend. Default: true */
  showColorbar?: boolean;
  /** Callback when SSIM score is computed. */
  onScoreComputed?: (ssim: number) => void;
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

function interpretSSIM(score: number): string {
  if (score >= 0.98) return "Near-identical";
  if (score >= 0.95) return "Very similar";
  if (score >= 0.9) return "Similar";
  if (score >= 0.8) return "Noticeably different";
  return "Substantially different";
}

// ---------------------------------------------------------------------------
// ColorMapPreview (inline canvas gradient)
// ---------------------------------------------------------------------------

const ColorMapPreview = memo(function ColorMapPreview({
  colorMapName,
  width = 200,
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
    const ctx = canvas.getContext("2d");
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
      className="rs-ssim__legend"
      style={{ width, height, display: "block", borderRadius: 2, flex: 1 }}
    />
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ImageSSIMHeatmap({
  reference,
  test,
  colorMap = "viridis",
  blockSize = 8,
  showScore = true,
  showColorbar = true,
  onScoreComputed,
  className,
}: ImageSSIMHeatmapProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  const [status, setStatus] = useState<LoadStatus>("idle");
  const [pairedData, setPairedData] = useState<PairedImageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const onScoreComputedRef = useRef(onScoreComputed);
  useEffect(() => {
    onScoreComputedRef.current = onScoreComputed;
  }, [onScoreComputed]);

  // Load images
  useEffect(() => {
    if (!reference || !test) {
      setStatus("idle");
      setPairedData(null);
      return;
    }

    const currentId = ++requestIdRef.current;
    setStatus("loading");
    setError(null);

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

  // Compute SSIM
  const ssimResult = useMemo(() => {
    if (!pairedData) return null;
    try {
      const result = computeSSIM(
        pairedData.referenceData,
        pairedData.testData,
        blockSize,
      );
      onScoreComputedRef.current?.(result.score);
      return result;
    } catch {
      return null;
    }
  }, [pairedData, blockSize]);

  // Generate heatmap
  const heatmapData = useMemo(() => {
    if (!ssimResult || !pairedData) return null;
    const { width, height } = pairedData;
    if (width === 0 || height === 0) return null;
    return generateSSIMHeatmap(
      ssimResult.map,
      ssimResult.mapWidth,
      ssimResult.mapHeight,
      width,
      height,
      blockSize,
      colorMap,
    );
  }, [ssimResult, pairedData, blockSize, colorMap]);

  // Paint heatmap to canvas
  useEffect(() => {
    if (!heatmapData || !pairedData) return;
    const { width, height } = pairedData;
    if (width === 0 || height === 0) return;

    let canvas = canvasElRef.current;
    const container = canvasContainerRef.current;
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
      ctx.putImageData(heatmapData, 0, 0);
    }
  }, [heatmapData, pairedData]);

  // Cleanup
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
      <div className={cx("rs-ssim", className)}>
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
      <div className={cx("rs-ssim", className)}>
        <div className="rs-skeleton" style={{ aspectRatio, width: "100%" }} />
        <div className="rs-diff__loading">
          <p className="rs-diff__loading-text">
            Computing SSIM heatmap\u2026
          </p>
        </div>
      </div>
    );
  }

  // --- Ready state ---
  return (
    <div className={cx("rs-ssim", className)}>
      <div
        ref={canvasContainerRef}
        className="rs-ssim__canvas"
        style={{
          aspectRatio: pairedData
            ? `${pairedData.width} / ${pairedData.height}`
            : undefined,
        }}
      />

      {/* Colormap badge */}
      <div className="rs-ssim__badge">
        <span className="rs-badge">{colorMap}</span>
      </div>

      {/* Global SSIM score overlay */}
      {showScore && ssimResult && (
        <div className="rs-ssim__score">
          <span className="rs-ssim__score-value">
            SSIM: {ssimResult.score.toFixed(4)}
          </span>
          <span className="rs-ssim__score-label">
            {interpretSSIM(ssimResult.score)}
          </span>
        </div>
      )}

      {/* Color legend */}
      {showColorbar && (
        <div className="rs-ssim__legend">
          <span className="rs-ssim__legend-label">Identical</span>
          <ColorMapPreview colorMapName={colorMap} width={200} height={12} />
          <span className="rs-ssim__legend-label">Different</span>
        </div>
      )}
    </div>
  );
}
