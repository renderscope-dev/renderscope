/**
 * RenderScope UI — Reusable React components for rendering engine comparison.
 *
 * @packageDocumentation
 */

/** Semantic version of the renderscope-ui package. */
export const VERSION = "0.1.0";

/**
 * Technique categories used for color-coding renderer badges.
 * These colors match the web application's Tailwind theme.
 */
export const TECHNIQUE_COLORS = {
  path_tracing: "#3B82F6",
  realtime: "#22C55E",
  neural: "#A855F7",
  differentiable: "#EC4899",
  volume: "#F97316",
  blender: "#EAB308",
  educational: "#6B7280",
} as const;

/** All supported rendering technique IDs. */
export type TechniqueId = keyof typeof TECHNIQUE_COLORS;
