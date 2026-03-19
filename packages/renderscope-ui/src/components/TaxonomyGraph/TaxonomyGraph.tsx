/**
 * TaxonomyGraph — Public-facing standalone D3 force-directed graph component.
 *
 * Renders an interactive taxonomy graph showing relationships between
 * rendering engines. Supports zoom, pan, hover tooltips, click events,
 * node dragging, and multiple color-coding modes.
 *
 * Usage:
 *   import { TaxonomyGraph } from 'renderscope-ui';
 *   <TaxonomyGraph data={taxonomyData} onNodeClick={(id) => navigate(id)} />
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type {
  TaxonomyData,
  TaxonomyNode,
  ColorByMode,
  GraphNode,
} from "../../types/taxonomy";
import { processGraphData } from "./graph-utils";
import { ForceGraph, type ForceGraphHandle } from "./ForceGraph";
import { GraphTooltip } from "./GraphTooltip";
import { GraphLegend } from "./GraphLegend";
import { GraphControls } from "./GraphControls";
import { cx } from "../../utils/classnames";
import "./graph-styles.css";

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface TaxonomyGraphProps {
  /** Node and edge data to visualize. */
  data: TaxonomyData;

  /** Enable zoom, pan, hover, and drag interactions (default: true). */
  interactive?: boolean;

  /** Array of node IDs to visually highlight (brighter, pulsing ring). */
  highlightedNodes?: string[];

  /** Callback fired when a renderer node is clicked. Receives the node ID (or slug if available). */
  onNodeClick?: (nodeId: string, node: TaxonomyNode) => void;

  /** Which data dimension drives node coloring (default: "technique"). */
  colorBy?: ColorByMode;

  /** Custom color map overriding the built-in technique colors. Keys are values of the colorBy field, values are CSS color strings. */
  colorMap?: Record<string, string>;

  /** Additional CSS class name for the outermost container. */
  className?: string;

  /** Minimum height in pixels (default: 600). */
  minHeight?: number;

  /** Whether to show the color legend overlay (default: true). */
  showLegend?: boolean;

  /** Whether to show zoom/fit controls overlay (default: true). */
  showControls?: boolean;

  /** Whether to show the tooltip on hover (default: true). */
  showTooltip?: boolean;

  /** Custom render function for tooltip content. If not provided, uses built-in tooltip. */
  renderTooltip?: (node: TaxonomyNode) => React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function TaxonomyGraph({
  data,
  interactive = true,
  highlightedNodes,
  onNodeClick,
  colorBy = "technique",
  colorMap,
  className,
  minHeight = 600,
  showLegend = true,
  showControls = true,
  showTooltip = true,
  renderTooltip,
}: TaxonomyGraphProps) {
  // SSR safety: render placeholder until mounted
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ForceGraph imperative handle
  const forceGraphRef = useRef<ForceGraphHandle>(null);

  // Container dimensions for tooltip positioning
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update container size on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setContainerSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Tooltip state
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Process data through the graph utilities
  const graphData = useMemo(
    () => processGraphData(data, colorBy, colorMap),
    [data, colorBy, colorMap]
  );

  // Handle node hover from ForceGraph
  const handleNodeHover = useCallback(
    (node: GraphNode | null, event: MouseEvent | null) => {
      if (!showTooltip) return;

      setHoveredNode(node);
      if (node && event) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      }
    },
    [showTooltip]
  );

  // Zoom control callbacks
  const handleZoomIn = useCallback(() => {
    forceGraphRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    forceGraphRef.current?.zoomOut();
  }, []);

  const handleFitToView = useCallback(() => {
    forceGraphRef.current?.fitToView();
  }, []);

  // Empty data state
  if (data.nodes.length === 0) {
    return (
      <div
        className={cx("rs-taxonomy-empty", className)}
        style={{ minHeight }}
      >
        No data to display.
      </div>
    );
  }

  // SSR placeholder
  if (!isMounted) {
    return (
      <div
        className={cx("rs-taxonomy-ssr-placeholder", className)}
        style={{ minHeight }}
      >
        Loading graph...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cx("rs-taxonomy-container", className)}
      style={{ minHeight }}
    >
      <ForceGraph
        ref={forceGraphRef}
        nodes={graphData.nodes}
        edges={graphData.edges}
        interactive={interactive}
        highlightedNodes={highlightedNodes}
        onNodeClick={onNodeClick}
        onNodeHover={handleNodeHover}
      />

      {showTooltip && (
        <GraphTooltip
          node={hoveredNode}
          position={tooltipPos}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          hasClickHandler={!!onNodeClick}
          renderTooltip={renderTooltip}
        />
      )}

      {showLegend && <GraphLegend nodes={graphData.nodes} />}

      {showControls && interactive && (
        <GraphControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToView={handleFitToView}
        />
      )}
    </div>
  );
}
