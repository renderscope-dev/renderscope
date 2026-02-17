/**
 * Technique categories used for color-coding renderer badges.
 * These colors match the web application's Tailwind theme and the
 * taxonomy.json data file.
 */
export const TECHNIQUE_COLORS = {
  path_tracing: "#4DA6FF",
  rasterization: "#2DD471",
  neural: "#A855F7",
  differentiable: "#EC4899",
  volume: "#F97316",
  blender: "#EAB308",
  educational: "#6B7280",
} as const;

/** All supported rendering technique IDs. */
export type TechniqueId = keyof typeof TECHNIQUE_COLORS;
