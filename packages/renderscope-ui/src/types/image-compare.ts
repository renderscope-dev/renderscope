/**
 * Shared TypeScript types for image comparison components.
 *
 * These types are exported publicly so consumers get full type safety
 * when using ImageCompareSlider, ImageDiff, ImageToggle, etc.
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Core Data Types
// ---------------------------------------------------------------------------

/** A single image in a comparison. */
export interface ComparisonImage {
  /** URL of the image (relative, absolute, or blob URL). */
  src: string;
  /** Display label (e.g., renderer name like "PBRT v4"). */
  label: string;
  /** Optional key-value metadata for overlay display (e.g., render time). */
  metadata?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Enumerations / Unions
// ---------------------------------------------------------------------------

/** Orientation for the comparison slider divider. */
export type SliderOrientation = "horizontal" | "vertical";

/** Diff visualization mode for ImageDiff. */
export type DiffMode = "absolute" | "luminance";

/** Available colormap names for heatmap visualization. */
export type ColorMapName = "viridis" | "inferno" | "magma";

// ---------------------------------------------------------------------------
// State Types
// ---------------------------------------------------------------------------

/** Image loading state returned by useImageLoader. */
export interface ImageLoadState {
  /** The loaded image element, or null if not yet loaded. */
  image: HTMLImageElement | null;
  /** Whether the image is currently loading. */
  loading: boolean;
  /** Error message if loading failed, or null. */
  error: string | null;
  /** Natural width of the loaded image (0 if not loaded). */
  width: number;
  /** Natural height of the loaded image (0 if not loaded). */
  height: number;
}

/** Zoom/pan state for synchronized viewing (ImageSideBySide). */
export interface ZoomPanState {
  /** Current zoom scale (1 = fit to container). */
  scale: number;
  /** Horizontal pan offset in pixels. */
  offsetX: number;
  /** Vertical pan offset in pixels. */
  offsetY: number;
}

/** A rectangular region defined in normalized coordinates (0-1). */
export interface NormalizedRegion {
  /** Left edge as fraction of image width (0-1). */
  x: number;
  /** Top edge as fraction of image height (0-1). */
  y: number;
  /** Width as fraction of image width (0-1). */
  width: number;
  /** Height as fraction of image height (0-1). */
  height: number;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** Quality metrics computed from image comparison. */
export interface ImageMetrics {
  /** Peak Signal-to-Noise Ratio in dB. Higher = more similar. */
  psnr: number;
  /** Structural Similarity Index (0-1). Higher = more similar. */
  ssim: number;
  /** Mean Squared Error. Lower = more similar. */
  mse: number;
}

/** SSIM computation result with per-block similarity map. */
export interface SSIMResult {
  /** Global mean SSIM score (0-1). */
  score: number;
  /** Per-block SSIM values as a flat Float32Array. */
  map: Float32Array;
  /** Width of the SSIM block map. */
  mapWidth: number;
  /** Height of the SSIM block map. */
  mapHeight: number;
}
