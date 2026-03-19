"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { GraphNode } from "@/types/taxonomy";
import { techniqueLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TaxonomyLegendProps {
  nodes: GraphNode[];
  className?: string;
}

/**
 * Floating legend showing technique-to-color mapping.
 * Collapsible on mobile, expanded by default on desktop.
 * Only shows categories that have renderer nodes in the graph.
 */
export function TaxonomyLegend({ nodes, className }: TaxonomyLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Collect unique categories that actually appear as nodes
  const categories = nodes.filter((n) => n.type === "category");

  // Count renderers per category using belongs_to edges (already done via primaryTechnique)
  const renderersByTechnique = new Map<string, number>();
  for (const node of nodes) {
    if (node.type === "renderer") {
      const count = renderersByTechnique.get(node.primaryTechnique) ?? 0;
      renderersByTechnique.set(node.primaryTechnique, count + 1);
    }
  }

  // Only show categories that have at least one renderer
  const activeCategories = categories.filter(
    (c) => (renderersByTechnique.get(c.id) ?? 0) > 0
  );

  if (activeCategories.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute bottom-4 left-4 z-40",
        "rounded-lg border bg-card/90 backdrop-blur-sm shadow-lg",
        "transition-all duration-200",
        className
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse legend" : "Expand legend"}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-foreground"
      >
        <span>Legend</span>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-1 px-3 pb-2.5">
          {activeCategories.map((cat) => {
            const count = renderersByTechnique.get(cat.id) ?? 0;
            const label = techniqueLabels[cat.id] ?? cat.label;
            return (
              <div key={cat.id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[11px] text-muted-foreground">
                  {label}
                </span>
                <span className="text-[10px] text-muted-foreground/50 ml-auto tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
