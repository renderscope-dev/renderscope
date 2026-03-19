import fs from "fs";
import path from "path";
import type { RendererData } from "@/types/renderer";
import type {
  RawTaxonomyData,
  GraphNode,
  GraphEdge,
  ProcessedGraphData,
} from "@/types/taxonomy";
import { techniqueColorMap } from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════
// TAXONOMY DATA LOADING — BUILD TIME ONLY
// ═══════════════════════════════════════════════════════════════

const TAXONOMY_PATH = path.join(process.cwd(), "..", "data", "taxonomy.json");

/**
 * Load raw taxonomy data from /data/taxonomy.json at build time.
 * Returns null if the file doesn't exist.
 */
export function getTaxonomyData(): RawTaxonomyData | null {
  if (!fs.existsSync(TAXONOMY_PATH)) {
    console.warn(`Taxonomy data not found: ${TAXONOMY_PATH}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(TAXONOMY_PATH, "utf-8");
    return JSON.parse(raw) as RawTaxonomyData;
  } catch (err) {
    console.error("Failed to parse taxonomy.json:", err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// NODE SIZING
// ═══════════════════════════════════════════════════════════════

const MIN_RADIUS = 6;
const MAX_RADIUS = 22;
const CATEGORY_RADIUS = 22;

/**
 * Compute node radius on a logarithmic scale relative to the
 * most-starred renderer in the dataset.
 */
function computeRadius(stars: number, maxStars: number): number {
  if (maxStars <= 0) return MIN_RADIUS;
  const normalized = Math.log(stars + 1) / Math.log(maxStars + 1);
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * normalized;
}

// ═══════════════════════════════════════════════════════════════
// COLOR RESOLUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Hard-coded HSL values matching the CSS custom properties in globals.css.
 * We resolve them here because D3 (SVG) cannot read CSS custom properties
 * at build time — these are the same values defined in :root.
 */
const TECHNIQUE_HSL: Record<string, string> = {
  "technique-path-tracing": "hsl(210, 100%, 65%)",
  "technique-ray-tracing": "hsl(195, 100%, 60%)",
  "technique-rasterization": "hsl(142, 70%, 50%)",
  "technique-neural": "hsl(280, 85%, 65%)",
  "technique-gaussian-splatting": "hsl(260, 80%, 70%)",
  "technique-differentiable": "hsl(330, 85%, 60%)",
  "technique-volume": "hsl(25, 95%, 55%)",
  "technique-ray-marching": "hsl(185, 80%, 55%)",
  "technique-educational": "hsl(45, 95%, 55%)",
};

const FALLBACK_COLOR = "hsl(240, 5%, 55%)";

/**
 * Resolve a technique slug to an HSL color string for D3.
 * Uses the same mapping as TechniqueBadge → CSS custom properties.
 */
function resolveColor(techniqueSlug: string): string {
  const cssVar = techniqueColorMap[techniqueSlug];
  if (cssVar && TECHNIQUE_HSL[cssVar]) {
    return TECHNIQUE_HSL[cssVar];
  }
  return FALLBACK_COLOR;
}

// ═══════════════════════════════════════════════════════════════
// GRAPH DATA PROCESSING
// ═══════════════════════════════════════════════════════════════

/**
 * Transform raw taxonomy + renderer data into the processed
 * graph data structure that D3 consumes.
 *
 * - Enriches renderer nodes with colors, radii, and star counts.
 * - Filters out orphan renderer nodes with no matching renderer data.
 * - Filters out edges referencing non-existent nodes.
 */
export function processGraphData(
  raw: RawTaxonomyData,
  renderers: RendererData[]
): ProcessedGraphData {
  // Build lookup map for O(1) renderer access
  const rendererMap = new Map<string, RendererData>();
  for (const r of renderers) {
    rendererMap.set(r.id, r);
  }

  // Find the maximum star count for logarithmic scaling
  let maxStars = 0;
  for (const r of renderers) {
    if (r.github_stars && r.github_stars > maxStars) {
      maxStars = r.github_stars;
    }
  }

  // ── Transform Nodes ──
  const nodes: GraphNode[] = [];
  const validNodeIds = new Set<string>();

  for (const rawNode of raw.nodes) {
    if (rawNode.type === "category") {
      const color = resolveColor(rawNode.id);
      nodes.push({
        id: rawNode.id,
        type: "category",
        label: rawNode.label,
        description: rawNode.description,
        color,
        radius: CATEGORY_RADIUS,
        primaryTechnique: rawNode.id,
      });
      validNodeIds.add(rawNode.id);
    } else if (rawNode.type === "renderer" && rawNode.renderer_id) {
      const renderer = rendererMap.get(rawNode.renderer_id);
      if (!renderer) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `Taxonomy: skipping node "${rawNode.id}" — no renderer data for "${rawNode.renderer_id}"`
          );
        }
        continue;
      }

      const primaryTechnique = renderer.technique[0] ?? "path_tracing";
      const stars = renderer.github_stars ?? 0;

      nodes.push({
        id: rawNode.id,
        type: "renderer",
        label: rawNode.label,
        renderer_id: rawNode.renderer_id,
        color: resolveColor(primaryTechnique),
        radius: computeRadius(stars, maxStars),
        primaryTechnique,
        githubStars: stars,
        slug: rawNode.renderer_id,
        status: renderer.status,
      });
      validNodeIds.add(rawNode.id);
    }
  }

  // ── Transform Edges (filter out broken references) ──
  const edges: GraphEdge[] = [];
  for (const rawEdge of raw.edges) {
    if (validNodeIds.has(rawEdge.source) && validNodeIds.has(rawEdge.target)) {
      edges.push({
        source: rawEdge.source,
        target: rawEdge.target,
        type: rawEdge.type,
        label: rawEdge.label,
      });
    } else if (process.env.NODE_ENV === "development") {
      console.warn(
        `Taxonomy: skipping edge "${rawEdge.source}" → "${rawEdge.target}" — missing node(s)`
      );
    }
  }

  return { nodes, edges };
}
