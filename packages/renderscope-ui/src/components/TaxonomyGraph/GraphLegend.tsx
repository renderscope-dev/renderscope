/**
 * GraphLegend — Floating color legend overlay for the taxonomy graph.
 *
 * Shows active technique categories (only those present in the data)
 * with colored dots and labels. Collapsible with a toggle button.
 *
 * @internal Not part of the public API — used by TaxonomyGraph wrapper.
 */

import { useState, useEffect, useRef } from "react";
import type { GraphNode } from "../../types/taxonomy";
import { TECHNIQUE_LABELS } from "./graph-utils";
import { ChevronDownIcon, ChevronUpIcon } from "./icons";

export interface GraphLegendProps {
  nodes: GraphNode[];
}

export function GraphLegend({ nodes }: GraphLegendProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Collapse by default on small containers (< 500px)
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (el && el.clientWidth < 500) {
      setIsExpanded(false);
    }
  }, []);

  // Collect categories that appear as nodes
  const categories = nodes.filter((n) => n.type === "category");

  // Count renderers per technique
  const renderersByTechnique = new Map<string, number>();
  for (const node of nodes) {
    if (node.type === "renderer" && node.technique) {
      const count = renderersByTechnique.get(node.technique) ?? 0;
      renderersByTechnique.set(node.technique, count + 1);
    }
  }

  // Only show categories that have at least one renderer
  const activeCategories = categories.filter(
    (c) => (renderersByTechnique.get(c.id) ?? 0) > 0
  );

  if (activeCategories.length === 0) return null;

  return (
    <div ref={containerRef} className="rs-taxonomy-legend">
      <button
        className="rs-taxonomy-legend__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse legend" : "Expand legend"}
      >
        <span>Legend</span>
        {isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
      </button>

      {isExpanded && (
        <div className="rs-taxonomy-legend__items">
          {activeCategories.map((cat) => {
            const count = renderersByTechnique.get(cat.id) ?? 0;
            const label = TECHNIQUE_LABELS[cat.id] ?? cat.label;
            return (
              <div key={cat.id} className="rs-taxonomy-legend__item">
                <span
                  className="rs-taxonomy-legend__item-dot"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="rs-taxonomy-legend__item-label">{label}</span>
                <span className="rs-taxonomy-legend__item-count">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
