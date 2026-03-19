/**
 * Data processing utilities for the TaxonomyGraph component.
 *
 * Pure functions for transforming consumer-provided TaxonomyData
 * into D3-ready internal graph data.
 *
 * @internal Not part of the public API.
 */

import type {
  TaxonomyData,
  TaxonomyNode,
  TaxonomyEdge,
  GraphNode,
  GraphEdge,
  ColorByMode,
} from "../../types/taxonomy";

// ═══════════════════════════════════════════════════════════════
// NODE SIZING CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MIN_RADIUS = 6;
const MAX_RADIUS = 22;
const CATEGORY_RADIUS = 22;

// ═══════════════════════════════════════════════════════════════
// DEFAULT COLOR MAP — technique-based coloring
// ═══════════════════════════════════════════════════════════════

/**
 * Comprehensive technique-to-color map matching the RenderScope
 * design system. Covers all technique slugs used in taxonomy data.
 */
const DEFAULT_TECHNIQUE_COLORS: Record<string, string> = {
  path_tracing: "#4DA6FF",
  ray_tracing: "#33CCFF",
  rasterization: "#2DD471",
  neural: "#A855F7",
  gaussian_splatting: "#A78BFA",
  differentiable: "#EC4899",
  volume_rendering: "#F97316",
  volume: "#F97316",
  ray_marching: "#22D3EE",
  hybrid: "#4DA6FF",
  blender: "#EAB308",
  educational: "#6B7280",
};

const FALLBACK_COLOR = "#6B7280";

/**
 * Built-in palette for non-technique color modes (language, status)
 * when the consumer doesn't provide a colorMap.
 */
const AUTO_PALETTE = [
  "#4DA6FF",
  "#2DD471",
  "#A855F7",
  "#EC4899",
  "#F97316",
  "#22D3EE",
  "#EAB308",
  "#F43F5E",
  "#10B981",
  "#8B5CF6",
  "#06B6D4",
  "#D946EF",
];

// ═══════════════════════════════════════════════════════════════
// RADIUS CALCULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Compute node radius on a logarithmic scale relative to the
 * most-starred renderer in the dataset.
 *
 * radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * (log(stars+1) / log(maxStars+1))
 */
export function calculateRadius(stars: number, maxStars: number): number {
  if (maxStars <= 0) return MIN_RADIUS;
  const normalized = Math.log(stars + 1) / Math.log(maxStars + 1);
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * normalized;
}

// ═══════════════════════════════════════════════════════════════
// COLOR RESOLUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve a node's color based on the colorBy mode and available maps.
 */
export function resolveColor(
  node: TaxonomyNode,
  colorBy: ColorByMode,
  colorMap: Record<string, string> | undefined,
  autoColorMap: Map<string, string>
): string {
  // Determine the key based on colorBy mode
  let key: string | undefined;
  if (colorBy === "technique") {
    key = node.technique;
  } else {
    // For "language" and "status", the consumer is expected to include
    // these as the technique field or via a custom colorMap.
    // Fall back to technique if not available.
    key = node.technique;
  }

  if (!key) return FALLBACK_COLOR;

  // Consumer-provided colorMap takes priority
  const customColor = colorMap?.[key];
  if (customColor) return customColor;

  // For technique mode, use built-in colors
  if (colorBy === "technique") {
    return DEFAULT_TECHNIQUE_COLORS[key] ?? FALLBACK_COLOR;
  }

  // For other modes, use auto-assigned colors
  return autoColorMap.get(key) ?? FALLBACK_COLOR;
}

/**
 * Build an auto-color map for unique values not covered by a consumer colorMap.
 */
function buildAutoColorMap(
  nodes: TaxonomyNode[],
  colorMap: Record<string, string> | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  const seenValues = new Set<string>();

  for (const node of nodes) {
    if (node.technique && !colorMap?.[node.technique]) {
      seenValues.add(node.technique);
    }
  }

  let paletteIdx = 0;
  for (const value of seenValues) {
    map.set(value, AUTO_PALETTE[paletteIdx % AUTO_PALETTE.length]!);
    paletteIdx++;
  }

  return map;
}

// ═══════════════════════════════════════════════════════════════
// EDGE FILTERING
// ═══════════════════════════════════════════════════════════════

/**
 * Remove edges that reference source/target node IDs not present
 * in the nodes array. Logs a warning in development mode.
 */
function filterEdges(
  edges: TaxonomyEdge[],
  validNodeIds: Set<string>
): GraphEdge[] {
  const result: GraphEdge[] = [];

  for (const edge of edges) {
    if (validNodeIds.has(edge.source) && validNodeIds.has(edge.target)) {
      result.push({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label,
      });
    } else if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
      console.warn(
        `[TaxonomyGraph] Skipping edge "${edge.source}" → "${edge.target}" — missing node(s)`
      );
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PROCESSING FUNCTION
// ═══════════════════════════════════════════════════════════════

export interface ProcessedGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Transform consumer-provided TaxonomyData into D3-ready graph data.
 *
 * - Assigns colors based on the colorBy mode and colorMap.
 * - Computes radii from star counts using logarithmic scaling.
 * - Filters out orphan edges referencing missing nodes.
 */
export function processGraphData(
  data: TaxonomyData,
  colorBy: ColorByMode = "technique",
  colorMap?: Record<string, string>
): ProcessedGraphData {
  const autoColorMap = buildAutoColorMap(data.nodes, colorMap);

  // Find the maximum star count for logarithmic radius scaling
  let maxStars = 0;
  for (const node of data.nodes) {
    if (node.type === "renderer" && node.stars != null && node.stars > maxStars) {
      maxStars = node.stars;
    }
  }

  // Transform nodes
  const nodes: GraphNode[] = [];
  const validNodeIds = new Set<string>();

  for (const rawNode of data.nodes) {
    const color = resolveColor(rawNode, colorBy, colorMap, autoColorMap);

    if (rawNode.type === "category") {
      nodes.push({
        id: rawNode.id,
        type: "category",
        label: rawNode.label,
        description: rawNode.description,
        technique: rawNode.technique,
        color,
        radius: CATEGORY_RADIUS,
      });
    } else {
      const stars = rawNode.stars ?? 0;
      nodes.push({
        id: rawNode.id,
        type: "renderer",
        label: rawNode.label,
        description: rawNode.description,
        renderer_id: rawNode.renderer_id,
        technique: rawNode.technique,
        stars,
        slug: rawNode.slug ?? rawNode.renderer_id,
        color,
        radius: calculateRadius(stars, maxStars),
      });
    }

    validNodeIds.add(rawNode.id);
  }

  // Filter edges
  const edges = filterEdges(data.edges, validNodeIds);

  return { nodes, edges };
}

// ═══════════════════════════════════════════════════════════════
// TECHNIQUE LABEL MAP (for legend display)
// ═══════════════════════════════════════════════════════════════

/** Human-readable labels for technique slugs. */
export const TECHNIQUE_LABELS: Record<string, string> = {
  path_tracing: "Path Tracing",
  ray_tracing: "Ray Tracing",
  rasterization: "Rasterization",
  neural: "Neural",
  gaussian_splatting: "Gaussian Splatting",
  differentiable: "Differentiable",
  volume_rendering: "Volume",
  volume: "Volume",
  ray_marching: "Ray Marching",
  hybrid: "Hybrid",
  blender: "Blender",
  educational: "Educational",
};

/**
 * Format a star count for display (e.g., 12500 → "12.5k").
 */
export function formatStars(stars: number): string {
  if (stars >= 1000) {
    const k = stars / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(stars);
}
