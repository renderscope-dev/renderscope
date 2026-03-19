/**
 * Taxonomy graph types for the TaxonomyGraph component.
 *
 * Public types (exported from package API):
 *   TaxonomyNode, TaxonomyEdge, TaxonomyData,
 *   TaxonomyNodeType, TaxonomyEdgeType, ColorByMode
 *
 * Internal types (used within the component only):
 *   GraphNode, GraphEdge
 */

import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";

// ═══════════════════════════════════════════════════════════════
// PUBLIC API TYPES — what consumers provide
// ═══════════════════════════════════════════════════════════════

/** Node type discriminator. */
export type TaxonomyNodeType = "category" | "renderer";

/** Edge relationship types between taxonomy nodes. */
export type TaxonomyEdgeType =
  | "belongs_to"
  | "also_belongs_to"
  | "uses_backend"
  | "forked_from"
  | "inspired_by"
  | "shared_format"
  | "same_ecosystem";

/** A node in the taxonomy data. */
export interface TaxonomyNode {
  id: string;
  type: TaxonomyNodeType;
  label: string;
  description?: string;
  /** Only for renderer nodes — links to external renderer data. */
  renderer_id?: string;
  /** Primary rendering technique (e.g., "path_tracing") — used for color coding. */
  technique?: string;
  /** GitHub star count — used for node sizing. */
  stars?: number;
  /** URL slug for navigation callback. */
  slug?: string;
}

/** An edge connecting two nodes. */
export interface TaxonomyEdge {
  source: string;
  target: string;
  type: TaxonomyEdgeType;
  label?: string;
}

/** Complete taxonomy data — the main prop consumers pass to TaxonomyGraph. */
export interface TaxonomyData {
  nodes: TaxonomyNode[];
  edges: TaxonomyEdge[];
}

/** Determines what property drives node coloring. */
export type ColorByMode = "technique" | "language" | "status";

// ═══════════════════════════════════════════════════════════════
// INTERNAL TYPES — used within the component, NOT exported
// ═══════════════════════════════════════════════════════════════

/** Internal node with D3 simulation fields and computed visual properties. */
export interface GraphNode extends SimulationNodeDatum {
  id: string;
  type: TaxonomyNodeType;
  label: string;
  description?: string;
  renderer_id?: string;
  technique?: string;
  stars?: number;
  slug?: string;
  /** Computed fill color based on colorBy mode. */
  color: string;
  /** Computed radius in pixels (logarithmic scaling from stars). */
  radius: number;
}

/** Internal edge with D3 simulation fields. */
export interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: TaxonomyEdgeType;
  label?: string;
}
