import type { SimulationNodeDatum, SimulationLinkDatum } from "d3";

// ═══════════════════════════════════════════════════════════════
// RAW TAXONOMY DATA — matches /data/taxonomy.json structure
// ═══════════════════════════════════════════════════════════════

export type TaxonomyNodeType = "category" | "renderer";

export type TaxonomyEdgeType =
  | "belongs_to"
  | "also_belongs_to"
  | "uses_backend"
  | "forked_from"
  | "inspired_by"
  | "shared_format"
  | "same_ecosystem";

export interface RawTaxonomyNode {
  id: string;
  type: TaxonomyNodeType;
  label: string;
  description?: string;
  renderer_id?: string;
}

export interface RawTaxonomyEdge {
  source: string;
  target: string;
  type: TaxonomyEdgeType;
  label?: string | null;
}

export interface RawTaxonomyData {
  version: string;
  last_updated: string;
  nodes: RawTaxonomyNode[];
  edges: RawTaxonomyEdge[];
}

// ═══════════════════════════════════════════════════════════════
// PROCESSED GRAPH TYPES — enriched for D3 consumption
// ═══════════════════════════════════════════════════════════════

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  type: TaxonomyNodeType;
  label: string;
  description?: string;
  renderer_id?: string;

  // Visual properties (computed during data transformation)
  color: string;
  radius: number;
  primaryTechnique: string;
  githubStars?: number;
  slug?: string;
  status?: string;
}

export interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: TaxonomyEdgeType;
  label?: string | null;
}

export interface ProcessedGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
