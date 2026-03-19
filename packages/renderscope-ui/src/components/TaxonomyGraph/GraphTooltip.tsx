/**
 * GraphTooltip — Hover tooltip overlay for taxonomy graph nodes.
 *
 * Positioned absolutely relative to the graph container.
 * Flips horizontally/vertically when near container edges.
 * Uses CSS transitions instead of framer-motion.
 *
 * @internal Not part of the public API — used by TaxonomyGraph wrapper.
 */

import type { GraphNode, TaxonomyNode } from "../../types/taxonomy";
import { TECHNIQUE_LABELS, formatStars } from "./graph-utils";
import { StarIcon } from "./icons";
import { cx } from "../../utils/classnames";

interface TooltipPosition {
  x: number;
  y: number;
}

export interface GraphTooltipProps {
  node: GraphNode | null;
  position: TooltipPosition;
  containerWidth: number;
  containerHeight: number;
  hasClickHandler: boolean;
  renderTooltip?: (node: TaxonomyNode) => React.ReactNode;
}

const TOOLTIP_WIDTH = 240;
const TOOLTIP_OFFSET = 14;
const TOOLTIP_APPROX_HEIGHT = 120;

export function GraphTooltip({
  node,
  position,
  containerWidth,
  containerHeight,
  hasClickHandler,
  renderTooltip,
}: GraphTooltipProps) {
  // Calculate position with flip logic
  let left = position.x + TOOLTIP_OFFSET;
  let top = position.y + TOOLTIP_OFFSET;

  // Flip horizontally if overflowing right edge
  if (left + TOOLTIP_WIDTH > containerWidth) {
    left = position.x - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
  }

  // Flip vertically if overflowing bottom
  if (top + TOOLTIP_APPROX_HEIGHT > containerHeight) {
    top = position.y - TOOLTIP_APPROX_HEIGHT - TOOLTIP_OFFSET;
  }

  // Clamp to container bounds
  left = Math.max(4, Math.min(left, containerWidth - TOOLTIP_WIDTH - 4));
  top = Math.max(4, top);

  // Custom render function
  if (node && renderTooltip) {
    const taxonomyNode: TaxonomyNode = {
      id: node.id,
      type: node.type,
      label: node.label,
      description: node.description,
      renderer_id: node.renderer_id,
      technique: node.technique,
      stars: node.stars,
      slug: node.slug,
    };

    return (
      <div
        className={cx(
          "rs-taxonomy-tooltip",
          node ? "rs-taxonomy-tooltip--visible" : undefined
        )}
        role="tooltip"
        aria-label={`Information about ${node.label}`}
        style={{ left, top, borderColor: node.color }}
      >
        {renderTooltip(taxonomyNode)}
      </div>
    );
  }

  return (
    <div
      className={cx(
        "rs-taxonomy-tooltip",
        node ? "rs-taxonomy-tooltip--visible" : undefined
      )}
      role="tooltip"
      aria-label={node ? `Information about ${node.label}` : undefined}
      style={{
        left,
        top,
        borderColor: node?.color,
        // Hide when no node (kept in DOM for smooth transitions)
        visibility: node ? "visible" : "hidden",
      }}
    >
      {node?.type === "renderer" ? (
        <RendererTooltipContent
          node={node}
          hasClickHandler={hasClickHandler}
        />
      ) : node?.type === "category" ? (
        <CategoryTooltipContent node={node} />
      ) : null}
    </div>
  );
}

function RendererTooltipContent({
  node,
  hasClickHandler,
}: {
  node: GraphNode;
  hasClickHandler: boolean;
}) {
  const techniqueLabel = node.technique
    ? (TECHNIQUE_LABELS[node.technique] ?? node.technique)
    : undefined;

  return (
    <>
      <p className="rs-taxonomy-tooltip__name">{node.label}</p>
      {techniqueLabel && (
        <div className="rs-taxonomy-tooltip__row">
          <span
            className="rs-taxonomy-tooltip__dot"
            style={{ backgroundColor: node.color }}
          />
          <span className="rs-taxonomy-tooltip__technique">
            {techniqueLabel}
          </span>
        </div>
      )}
      {node.stars != null && node.stars > 0 && (
        <div className="rs-taxonomy-tooltip__stars">
          <StarIcon />
          <span>{formatStars(node.stars)}</span>
        </div>
      )}
      {hasClickHandler && (
        <p className="rs-taxonomy-tooltip__hint">Click to view &rarr;</p>
      )}
    </>
  );
}

function CategoryTooltipContent({ node }: { node: GraphNode }) {
  return (
    <>
      <p className="rs-taxonomy-tooltip__name">{node.label}</p>
      {node.description && (
        <p className="rs-taxonomy-tooltip__description">{node.description}</p>
      )}
    </>
  );
}
