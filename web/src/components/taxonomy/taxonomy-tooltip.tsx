"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import type { GraphNode } from "@/types/taxonomy";
import { techniqueLabels } from "@/lib/constants";
import { formatStars } from "@/lib/utils";
import { statusConfig } from "@/lib/constants";

interface TooltipPosition {
  x: number;
  y: number;
}

interface TaxonomyTooltipProps {
  node: GraphNode | null;
  position: TooltipPosition;
  containerRect: DOMRect | null;
}

export function TaxonomyTooltip({
  node,
  position,
  containerRect,
}: TaxonomyTooltipProps) {
  if (!containerRect) return null;

  // Calculate position relative to container, with flip logic
  const tooltipWidth = 240;
  const tooltipOffset = 14;

  let left = position.x + tooltipOffset;
  let top = position.y + tooltipOffset;

  // Flip horizontally if overflowing right edge
  if (left + tooltipWidth > containerRect.width) {
    left = position.x - tooltipWidth - tooltipOffset;
  }

  // Flip vertically if overflowing bottom
  if (top + 120 > containerRect.height) {
    top = position.y - 120 - tooltipOffset;
  }

  // Clamp to container bounds
  left = Math.max(4, Math.min(left, containerRect.width - tooltipWidth - 4));
  top = Math.max(4, top);

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          role="tooltip"
          aria-label={`Information about ${node.label}`}
          className="pointer-events-none absolute z-50 w-[240px] rounded-lg border bg-popover p-3 shadow-xl"
          style={{
            left,
            top,
            borderColor: node.color,
          }}
        >
          {node.type === "renderer" ? (
            <RendererTooltip node={node} />
          ) : (
            <CategoryTooltip node={node} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RendererTooltip({ node }: { node: GraphNode }) {
  const techniqueLabel =
    techniqueLabels[node.primaryTechnique] ?? node.primaryTechnique;
  const status = node.status ? statusConfig[node.status] : undefined;

  return (
    <div className="space-y-2">
      <p className="font-semibold text-popover-foreground text-sm leading-tight">
        {node.label}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: node.color }}
        />
        <span className="text-xs text-muted-foreground">{techniqueLabel}</span>
      </div>
      {node.githubStars !== undefined && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{formatStars(node.githubStars)}</span>
        </div>
      )}
      {status && (
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${status.dotColor}`}
          />
          <span className={status.color}>{status.label}</span>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground/60 pt-0.5">
        Click to view profile
      </p>
    </div>
  );
}

function CategoryTooltip({ node }: { node: GraphNode }) {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold text-popover-foreground text-sm leading-tight">
        {node.label}
      </p>
      {node.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {node.description}
        </p>
      )}
    </div>
  );
}
