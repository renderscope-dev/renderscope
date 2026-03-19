/** Shared image type used across all comparison components */
export interface ComparisonImage {
  /** Image source URL */
  src: string;
  /** Display label (e.g., renderer name) */
  label: string;
  /** Optional metadata key-value pairs */
  metadata?: Record<string, string>;
}

/** Configuration for the ImageToggle component */
export interface ImageToggleProps {
  /** Array of images to cycle through. Minimum 2. */
  images: ComparisonImage[];
  /** Auto-toggle interval in milliseconds. 0 means manual-only. Default: 0 */
  interval?: number;
  /** Whether to show the current image label overlay. Default: true */
  showLabel?: boolean;
  /** Transition duration in milliseconds for crossfade. Default: 200 */
  transitionDuration?: number;
  /** Optional callback when active image changes */
  onImageChange?: (index: number) => void;
  /** Optional className for the outer container */
  className?: string;
}

/** A rectangular region defined in normalized coordinates (0-1) */
export interface NormalizedRegion {
  /** Left edge as fraction of image width (0-1) */
  x: number;
  /** Top edge as fraction of image height (0-1) */
  y: number;
  /** Width as fraction of image width (0-1) */
  width: number;
  /** Height as fraction of image height (0-1) */
  height: number;
}

/** Configuration for the RegionZoom component */
export interface RegionZoomProps {
  /** Array of images to compare. All should be the same dimensions. */
  images: ComparisonImage[];
  /** Magnification factor for the zoomed view. Default: 4 */
  zoomLevel?: number;
  /** Initial selection region size in pixels (relative to displayed overview). Default: 150 */
  regionSize?: number;
  /** Layout orientation for the magnified panels. Default: 'horizontal' */
  layout?: 'horizontal' | 'vertical';
  /** Optional callback when the zoom region changes */
  onRegionChange?: (region: NormalizedRegion) => void;
  /** Optional className for the outer container */
  className?: string;
}

/** Internal state tracked by the useSyncedZoom hook */
export interface SyncedZoomState {
  /** Current region in normalized coordinates */
  region: NormalizedRegion;
  /** Whether the user is currently dragging the selection */
  isDragging: boolean;
  /** Update the region position */
  setRegion: (region: NormalizedRegion) => void;
  /** Begin a drag operation */
  startDrag: (clientX: number, clientY: number, containerRect: DOMRect) => void;
  /** Continue a drag operation */
  updateDrag: (clientX: number, clientY: number, containerRect: DOMRect) => void;
  /** End a drag operation */
  endDrag: () => void;
}
