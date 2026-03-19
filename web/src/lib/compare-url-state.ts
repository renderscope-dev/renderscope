import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

// ═══════════════════════════════════════════════════════════════
// COMPARE PAGE URL PARAMETERS
// ═══════════════════════════════════════════════════════════════

/**
 * Selected renderer IDs — ?r=pbrt,mitsuba3,blender-cycles
 *
 * Contains an array of renderer `id` strings (matching the `id` field
 * in renderer JSON files), separated by commas in the URL.
 *
 * Default: empty array (no renderers selected — shows empty state)
 */
export const compareRenderersParser = parseAsArrayOf(
  parseAsString,
  ","
).withDefault([]);

/**
 * Active comparison tab — ?tab=features
 *
 * Which comparison tab is currently visible.
 * Default: "features" (the first tab)
 */
export const COMPARE_TABS = ["features", "images", "performance"] as const;

export type CompareTab = (typeof COMPARE_TABS)[number];

export const compareTabParser = parseAsStringLiteral(
  COMPARE_TABS
).withDefault("features");

/** Maximum number of renderers that can be compared simultaneously */
export const MAX_COMPARE_RENDERERS = 5;

/** Minimum number of renderers required to start a comparison */
export const MIN_COMPARE_RENDERERS = 2;

// ═══════════════════════════════════════════════════════════════
// IMAGES TAB URL PARAMETERS (Session 11.3)
// ═══════════════════════════════════════════════════════════════

import { COMPARE_MODES } from "@/lib/compare-images";

/**
 * Selected scene — ?scene=cornell-box
 *
 * The scene ID whose renders are being compared.
 * Default: "" (auto-selects the first available scene)
 */
export const compareSceneParser = parseAsString.withDefault("");

/**
 * Comparison mode — ?mode=slider
 *
 * Which visual comparison component is active.
 * Default: "slider"
 */
export const compareModeParser = parseAsStringLiteral(
  COMPARE_MODES
).withDefault("slider");

/**
 * Renderer pair for pairwise modes — ?pair=pbrt,mitsuba3
 *
 * Two comma-separated renderer IDs selecting which pair to compare
 * in Slider, Diff, and Heatmap modes. Only relevant when >2
 * renderers are selected.
 * Default: empty array (auto-selects the first two renderers)
 */
export const comparePairParser = parseAsArrayOf(
  parseAsString,
  ","
).withDefault([]);
