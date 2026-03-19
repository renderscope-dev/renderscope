/**
 * TypeScript types for the FeatureMatrix component and its sub-components.
 *
 * These types define the data contracts consumers use to pass feature
 * comparison data into the FeatureMatrix. They are exported publicly
 * so consumers get full type safety.
 *
 * @packageDocumentation
 */

/**
 * A single feature within a category.
 * Maps a data key to a human-readable label and description.
 */
export interface FeatureDefinition {
  /** The key used to look up the value in a renderer's features object (e.g., "global_illumination"). */
  key: string;
  /** Human-readable label shown in the table row (e.g., "Global Illumination"). */
  label: string;
  /** Tooltip text explaining what this feature means. Shown on hover over the feature name. */
  description: string;
}

/**
 * A named group of related features.
 * The FeatureMatrix renders one collapsible section per category.
 */
export interface FeatureCategory {
  /** Unique identifier for this category (e.g., "rendering", "gpu_hardware"). */
  id: string;
  /** Display label for the group header (e.g., "Rendering Capabilities"). */
  label: string;
  /** Ordered list of features in this category. Order here = order in the table. */
  features: FeatureDefinition[];
}

/**
 * A single renderer's data as consumed by the FeatureMatrix.
 *
 * This is intentionally a minimal interface — the FeatureMatrix only needs
 * an id, a display name, and the features object. Consumers can pass their
 * full RendererData objects since TypeScript allows extra properties.
 */
export interface FeatureMatrixRenderer {
  /** Unique identifier for the renderer (e.g., "pbrt-v4"). */
  id: string;
  /** Display name shown in the table header (e.g., "PBRT v4"). */
  name: string;
  /**
   * The features object — keys correspond to FeatureDefinition.key values.
   * `true` = supported, `false` = not supported, `null`/`undefined` = not applicable.
   */
  features: Record<string, boolean | null | undefined>;
}

/** Possible values a feature cell can display. */
export type FeatureValue = true | false | null | undefined;

/** Props for the top-level FeatureMatrix component. */
export interface FeatureMatrixProps {
  /** Array of renderers to compare (2–10). Displayed as columns in selection order. */
  renderers: FeatureMatrixRenderer[];
  /**
   * Feature categories and definitions. Defines the rows and row groups.
   * Import `RENDERSCOPE_FEATURE_CATEGORIES` for the default RenderScope feature set,
   * or supply your own for custom comparisons.
   */
  features: FeatureCategory[];
  /** Whether to show CSV/PNG export buttons in the toolbar. Default: true. */
  exportable?: boolean;
  /** Whether category groups are collapsible. Default: true. */
  collapsible?: boolean;
  /** Whether the header row sticks to the top on vertical scroll. Default: true. */
  stickyHeader?: boolean;
  /** Additional CSS class name(s) applied to the outermost wrapper. */
  className?: string;
  /** Callback fired when a renderer column header is clicked. */
  onRendererClick?: (rendererId: string) => void;
  /** Callback fired when a renderer's remove button is clicked. */
  onRendererRemove?: (rendererId: string) => void;
}

/** Props for the FeatureCell sub-component. */
export interface FeatureCellProps {
  /** The feature value to display. */
  value: FeatureValue;
  /** Whether this cell is in a row with differing values (used for highlight-differences mode). */
  isDifferent?: boolean;
}

/** Props for the FeatureGroupHeader sub-component. */
export interface FeatureGroupHeaderProps {
  /** The category this header represents. */
  category: FeatureCategory;
  /** Whether this group is currently collapsed. */
  isCollapsed: boolean;
  /** Handler called when the header is clicked to toggle collapse state. */
  onToggle: () => void;
  /** Number of renderer columns — used to calculate colSpan. */
  columnCount: number;
  /** Whether collapsing is enabled. When false, the chevron is hidden and clicking does nothing. */
  collapsible: boolean;
}
