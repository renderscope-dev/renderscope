"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import type {
  GraphNode,
  GraphEdge,
  ProcessedGraphData,
  TaxonomyEdgeType,
} from "@/types/taxonomy";
import { TaxonomyTooltip } from "./taxonomy-tooltip";
import { TaxonomyLegend } from "./taxonomy-legend";
import { TaxonomyControls } from "./taxonomy-controls";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { announceToScreenReader } from "@/lib/a11y-utils";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Edge visual encoding per relationship type */
const EDGE_STYLES: Record<
  TaxonomyEdgeType,
  {
    strokeWidth: number;
    opacity: number;
    highlightOpacity: number;
    dashArray: string;
    marker: boolean;
  }
> = {
  belongs_to: {
    strokeWidth: 1,
    opacity: 0.15,
    highlightOpacity: 0.8,
    dashArray: "",
    marker: false,
  },
  also_belongs_to: {
    strokeWidth: 1,
    opacity: 0.15,
    highlightOpacity: 0.8,
    dashArray: "4,4",
    marker: false,
  },
  uses_backend: {
    strokeWidth: 1.5,
    opacity: 0.25,
    highlightOpacity: 0.9,
    dashArray: "",
    marker: true,
  },
  forked_from: {
    strokeWidth: 1.5,
    opacity: 0.3,
    highlightOpacity: 1.0,
    dashArray: "",
    marker: true,
  },
  inspired_by: {
    strokeWidth: 1.5,
    opacity: 0.25,
    highlightOpacity: 0.9,
    dashArray: "6,3",
    marker: true,
  },
  shared_format: {
    strokeWidth: 1,
    opacity: 0.15,
    highlightOpacity: 0.7,
    dashArray: "2,3",
    marker: false,
  },
  same_ecosystem: {
    strokeWidth: 2,
    opacity: 0.35,
    highlightOpacity: 1.0,
    dashArray: "",
    marker: false,
  },
};

/** Force simulation tuning — see spec §7.4 */
const LINK_DISTANCE_BY_EDGE: Partial<Record<TaxonomyEdgeType, number>> = {
  belongs_to: 90,
  also_belongs_to: 100,
  uses_backend: 160,
  forked_from: 160,
  inspired_by: 170,
  shared_format: 180,
  same_ecosystem: 150,
};

const ZOOM_EXTENT: [number, number] = [0.3, 5];
const ZOOM_STEP = 1.5;

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

interface TaxonomyGraphProps {
  data: ProcessedGraphData;
  className?: string;
}

export function TaxonomyGraph({ data, className }: TaxonomyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(
    null
  );
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);
  const hasSettledRef = useRef(false);

  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // Tooltip state
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  // Keyboard focus state — index into the renderers-only list
  const [focusedNodeIndex, setFocusedNodeIndex] = useState<number>(-1);

  // Empty state
  const rendererCount = data.nodes.filter((n) => n.type === "renderer").length;
  if (rendererCount === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center min-h-[600px] md:min-h-[400px]",
          "text-muted-foreground text-sm",
          className
        )}
      >
        No renderers in taxonomy. Data will appear as renderers are added.
      </div>
    );
  }

  return (
    <TaxonomyGraphInner
      data={data}
      className={className}
      containerRef={containerRef}
      svgRef={svgRef}
      simulationRef={simulationRef}
      zoomBehaviorRef={zoomBehaviorRef}
      hasSettledRef={hasSettledRef}
      router={router}
      hoveredNode={hoveredNode}
      setHoveredNode={setHoveredNode}
      tooltipPos={tooltipPos}
      setTooltipPos={setTooltipPos}
      containerRect={containerRect}
      setContainerRect={setContainerRect}
      focusedNodeIndex={focusedNodeIndex}
      setFocusedNodeIndex={setFocusedNodeIndex}
      prefersReducedMotion={prefersReducedMotion}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// INNER COMPONENT (with hooks that depend on refs)
// ═══════════════════════════════════════════════════════════════

interface TaxonomyGraphInnerProps {
  data: ProcessedGraphData;
  className?: string;
  containerRef: RefObject<HTMLDivElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  simulationRef: React.MutableRefObject<d3.Simulation<
    GraphNode,
    GraphEdge
  > | null>;
  zoomBehaviorRef: React.MutableRefObject<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>;
  hasSettledRef: React.MutableRefObject<boolean>;
  router: ReturnType<typeof useRouter>;
  hoveredNode: GraphNode | null;
  setHoveredNode: (n: GraphNode | null) => void;
  tooltipPos: { x: number; y: number };
  setTooltipPos: (p: { x: number; y: number }) => void;
  containerRect: DOMRect | null;
  setContainerRect: (r: DOMRect | null) => void;
  focusedNodeIndex: number;
  setFocusedNodeIndex: (i: number) => void;
  prefersReducedMotion: boolean;
}

function TaxonomyGraphInner({
  data,
  className,
  containerRef,
  svgRef,
  simulationRef,
  zoomBehaviorRef,
  hasSettledRef,
  router,
  hoveredNode,
  setHoveredNode,
  tooltipPos,
  setTooltipPos,
  containerRect,
  setContainerRect,
  focusedNodeIndex,
  setFocusedNodeIndex,
  prefersReducedMotion,
}: TaxonomyGraphInnerProps) {
  // ── Zoom control callbacks ──

  const handleZoomIn = useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomBehaviorRef.current;
    if (!svg || !zoom) return;
    const sel = d3.select(svg);
    sel.transition().duration(300).call(zoom.scaleBy, ZOOM_STEP);
  }, [svgRef, zoomBehaviorRef]);

  const handleZoomOut = useCallback(() => {
    const svg = svgRef.current;
    const zoom = zoomBehaviorRef.current;
    if (!svg || !zoom) return;
    const sel = d3.select(svg);
    sel.transition().duration(300).call(zoom.scaleBy, 1 / ZOOM_STEP);
  }, [svgRef, zoomBehaviorRef]);

  const handleFitToView = useCallback(() => {
    fitGraphToView(svgRef, zoomBehaviorRef, data.nodes);
  }, [svgRef, zoomBehaviorRef, data.nodes]);

  // ── Renderer nodes for keyboard navigation ──
  // Sorted alphabetically for consistent arrow-key order.
  const rendererNodes = data.nodes
    .filter((n) => n.type === "renderer")
    .sort((a, b) => a.label.localeCompare(b.label));

  // ── Build screen reader description ──
  const graphDescription = buildGraphDescription(data);

  // ── Keyboard handler for graph container ──
  const handleGraphKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (rendererNodes.length === 0) return;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown": {
          e.preventDefault();
          const next =
            focusedNodeIndex < 0 ? 0 : (focusedNodeIndex + 1) % rendererNodes.length;
          setFocusedNodeIndex(next);
          const node = rendererNodes[next];
          if (node) {
            announceToScreenReader(`${node.label} renderer`);
          }
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          const prev =
            focusedNodeIndex <= 0
              ? rendererNodes.length - 1
              : focusedNodeIndex - 1;
          setFocusedNodeIndex(prev);
          const node = rendererNodes[prev];
          if (node) {
            announceToScreenReader(`${node.label} renderer`);
          }
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          const node = rendererNodes[focusedNodeIndex];
          if (node?.slug) {
            router.push(`/renderer/${node.slug}`);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setFocusedNodeIndex(-1);
          containerRef.current?.blur();
          break;
        }
        case "Home": {
          e.preventDefault();
          setFocusedNodeIndex(0);
          const node = rendererNodes[0];
          if (node) {
            announceToScreenReader(`${node.label} renderer`);
          }
          break;
        }
        case "End": {
          e.preventDefault();
          const last = rendererNodes.length - 1;
          setFocusedNodeIndex(last);
          const node = rendererNodes[last];
          if (node) {
            announceToScreenReader(`${node.label} renderer`);
          }
          break;
        }
      }
    },
    [rendererNodes, focusedNodeIndex, setFocusedNodeIndex, router, containerRef]
  );

  // ── Update SVG focus ring when focusedNodeIndex changes ──
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    // Remove all existing focus rings
    svg.selectAll(".keyboard-focus-ring").remove();

    if (focusedNodeIndex < 0 || focusedNodeIndex >= rendererNodes.length) return;

    const focusedNode = rendererNodes[focusedNodeIndex];
    if (!focusedNode) return;

    // Find the matching <g.node> and add a focus ring
    svg.selectAll<SVGGElement, GraphNode>("g.node").each(function (d) {
      if (d.id === focusedNode.id) {
        d3.select(this)
          .append("circle")
          .attr("class", "keyboard-focus-ring")
          .attr("r", d.radius + 4)
          .attr("fill", "none")
          .attr("stroke", "hsl(217, 91%, 60%)")
          .attr("stroke-width", 2.5)
          .attr("stroke-dasharray", "4,2")
          .style("pointer-events", "none");
      }
    });
  }, [focusedNodeIndex, rendererNodes, svgRef]);

  // ── Main D3 setup effect ──

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl) return;

    hasSettledRef.current = false;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Update container rect for tooltip positioning
    setContainerRect(container.getBoundingClientRect());

    // Deep-clone data so D3 can mutate in-place without affecting React props
    const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
    const edges: GraphEdge[] = data.edges.map((e) => ({ ...e }));

    // ── SVG Setup ──
    const svg = d3
      .select(svgEl)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Clear previous content
    svg.selectAll("*").remove();

    // ── Defs: arrowhead marker ──
    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L10,0L0,4")
      .attr("fill", "hsl(240, 5%, 55%)");

    // ── Zoom container ──
    const zoomContainer = svg
      .append("g")
      .attr("class", "zoom-container");

    // ── Edge group ──
    const edgeGroup = zoomContainer
      .append("g")
      .attr("class", "edges");

    // ── Node group ──
    const nodeGroup = zoomContainer
      .append("g")
      .attr("class", "nodes");

    // Precompute node color lookup for O(1) edge coloring
    const nodeColorMap = new Map<string, string>();
    for (const n of nodes) {
      nodeColorMap.set(n.id, n.color);
    }

    const NEUTRAL_EDGE_COLOR = "hsl(240, 5%, 55%)";

    // ── Draw Edges ──
    const edgeSelection = edgeGroup
      .selectAll<SVGLineElement, GraphEdge>("line")
      .data(edges)
      .join("line")
      .attr("stroke", (d) => {
        if (d.type === "same_ecosystem") {
          const sourceId =
            typeof d.source === "string" ? d.source : d.source.id;
          return nodeColorMap.get(sourceId) ?? NEUTRAL_EDGE_COLOR;
        }
        return NEUTRAL_EDGE_COLOR;
      })
      .attr("stroke-width", (d) => EDGE_STYLES[d.type].strokeWidth)
      .attr("stroke-opacity", (d) => EDGE_STYLES[d.type].opacity)
      .attr("stroke-dasharray", (d) => EDGE_STYLES[d.type].dashArray)
      .attr("marker-end", (d) =>
        EDGE_STYLES[d.type].marker ? "url(#arrowhead)" : null
      )
      .style("transition", "stroke-opacity 200ms ease");

    // ── Draw Nodes ──
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, GraphNode>("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("role", (d) => (d.type === "renderer" ? "button" : null))
      .attr("aria-label", (d) =>
        d.type === "renderer"
          ? `${d.label}, click to view details`
          : d.label
      )
      .style("cursor", (d) => (d.type === "renderer" ? "pointer" : "default"));

    // Node circles
    nodeSelection
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => {
        if (d.type === "category") {
          // Semi-transparent fill for category nodes (ring style)
          const c = d3.color(d.color);
          if (c) {
            c.opacity = 0.15;
            return c.formatRgb();
          }
          return "transparent";
        }
        return d.color;
      })
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => (d.type === "category" ? 2.5 : 1))
      .style("transition", "filter 200ms ease, transform 200ms ease");

    // Node labels
    nodeSelection
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 14)
      .attr("fill", "hsl(0, 0%, 95%)")
      .attr("font-size", (d) => (d.type === "category" ? "13px" : "11px"))
      .attr("font-weight", (d) => (d.type === "category" ? "600" : "400"))
      .attr("font-family", "system-ui, -apple-system, sans-serif")
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.8)")
      .style("pointer-events", "none")
      .attr("class", "node-label");

    // ── Interactivity: Hover ──
    nodeSelection
      .on("mouseenter", function (event: MouseEvent, d: GraphNode) {
        const rect = container.getBoundingClientRect();
        setContainerRect(rect);
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        setHoveredNode(d);

        // Highlight connected edges, dim the rest
        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(d.id);

        edgeSelection.each(function (e) {
          const sourceId =
            typeof e.source === "string" ? e.source : e.source.id;
          const targetId =
            typeof e.target === "string" ? e.target : e.target.id;

          if (sourceId === d.id || targetId === d.id) {
            connectedNodeIds.add(sourceId);
            connectedNodeIds.add(targetId);
          }
        });

        edgeSelection
          .attr("stroke-opacity", (e) => {
            const sourceId =
              typeof e.source === "string" ? e.source : e.source.id;
            const targetId =
              typeof e.target === "string" ? e.target : e.target.id;
            if (sourceId === d.id || targetId === d.id) {
              return EDGE_STYLES[e.type].highlightOpacity;
            }
            return 0.03;
          });

        nodeSelection.select("circle").attr("opacity", (n) =>
          connectedNodeIds.has(n.id) ? 1 : 0.2
        );
        nodeSelection.select("text").attr("opacity", (n) =>
          connectedNodeIds.has(n.id) ? 1 : 0.15
        );

        // Scale up hovered node
        d3.select(this)
          .select("circle")
          .attr("filter", "brightness(1.3)")
          .transition()
          .duration(150)
          .attr("r", d.radius * 1.1);
      })
      .on("mousemove", function (event: MouseEvent) {
        const rect = container.getBoundingClientRect();
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      })
      .on("mouseleave", function (_event: MouseEvent, d: GraphNode) {
        setHoveredNode(null);

        // Restore all opacities
        edgeSelection.attr(
          "stroke-opacity",
          (e) => EDGE_STYLES[e.type].opacity
        );
        nodeSelection.select("circle").attr("opacity", 1);
        nodeSelection.select("text").attr("opacity", 1);

        // Restore node size
        d3.select(this)
          .select("circle")
          .attr("filter", null)
          .transition()
          .duration(150)
          .attr("r", d.radius);
      });

    // ── Interactivity: Click ──
    nodeSelection
      .on("click", (_event: MouseEvent, d: GraphNode) => {
        if (d.type === "renderer" && d.slug) {
          router.push(`/renderer/${d.slug}`);
        }
      })
      // Prevent node double-clicks from triggering the SVG's fit-to-view
      .on("dblclick", (event: MouseEvent) => {
        event.stopPropagation();
      });

    // ── Interactivity: Drag ──
    const dragBehavior = d3
      .drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeSelection.call(dragBehavior);

    // ── Zoom/Pan ──
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent(ZOOM_EXTENT)
      .on("zoom", (event) => {
        zoomContainer.attr("transform", event.transform);

        // Adaptive label visibility based on zoom level
        const scale = event.transform.k;
        nodeSelection.select(".node-label").attr("opacity", (d) => {
          if (scale > 0.8) return 1;
          if (scale > 0.5) return d.radius > 10 ? 1 : 0;
          return d.type === "category" ? 1 : 0;
        });
      });

    svg.call(zoom);
    // Disable double-click zoom (we use it for fit-to-view instead)
    svg.on("dblclick.zoom", null);
    svg.on("dblclick", () => {
      fitGraphToView(svgRef, zoomBehaviorRef, nodes);
    });

    zoomBehaviorRef.current = zoom;

    // ── Force Simulation ──
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.id)
          .distance((d) => LINK_DISTANCE_BY_EDGE[d.type] ?? 120)
          .strength(0.4)
      )
      .force(
        "charge",
        d3.forceManyBody<GraphNode>().strength((d) =>
          d.type === "category" ? -600 : -200 - d.radius * 5
        )
      )
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.04))
      .force(
        "collide",
        d3
          .forceCollide<GraphNode>()
          .radius((d) => d.radius + 4)
          .strength(0.8)
      )
      .alpha(1)
      .alphaDecay(0.02)
      .alphaMin(0.001)
      .velocityDecay(0.35);

    simulationRef.current = simulation;

    // ── Tick: update SVG positions ──
    simulation.on("tick", () => {
      edgeSelection
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      nodeSelection.attr(
        "transform",
        (d) => `translate(${d.x ?? 0},${d.y ?? 0})`
      );

      // Fit to view once after simulation mostly settles
      if (!hasSettledRef.current && simulation.alpha() < 0.1) {
        hasSettledRef.current = true;
        fitGraphToView(svgRef, zoomBehaviorRef, nodes, prefersReducedMotion ? 0 : 600);
      }
    });

    // ── Resize Observer ──
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        svg.attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`);

        // Re-center force
        simulation.force(
          "center",
          d3.forceCenter(w / 2, h / 2).strength(0.04)
        );
        simulation.alpha(0.15).restart();

        setContainerRect(container.getBoundingClientRect());
      }
    });
    resizeObserver.observe(container);

    // ── Cleanup ──
    return () => {
      simulation.stop();
      simulationRef.current = null;
      resizeObserver.disconnect();
    };
    // Re-run only when graph data or motion preference changes; refs and state setters are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, prefersReducedMotion]);

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      className={cn(
        "relative w-full min-h-[600px] max-md:min-h-[400px] overflow-hidden rounded-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      role="group"
      aria-label={`Taxonomy graph: ${rendererNodes.length} rendering engines. Use arrow keys to navigate nodes, Enter to view details, Escape to exit.`}
      aria-describedby="taxonomy-graph-description"
      tabIndex={0}
      onKeyDown={handleGraphKeyDown}
      onFocus={() => {
        if (focusedNodeIndex < 0 && rendererNodes.length > 0) {
          setFocusedNodeIndex(0);
          const node = rendererNodes[0];
          if (node) {
            announceToScreenReader(`${node.label} renderer. Use arrow keys to navigate.`);
          }
        }
      }}
      onBlur={() => setFocusedNodeIndex(-1)}
    >
      {/* Screen reader description of graph content */}
      <div id="taxonomy-graph-description" className="sr-only">
        {graphDescription}
      </div>

      <svg
        ref={svgRef as RefObject<SVGSVGElement>}
        aria-hidden="true"
        className="w-full h-full"
        style={{ minHeight: "inherit" }}
      />

      <TaxonomyTooltip
        node={hoveredNode}
        position={tooltipPos}
        containerRect={containerRect}
      />

      <TaxonomyLegend nodes={data.nodes} />

      <TaxonomyControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToView={handleFitToView}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Build a textual description of the graph for screen readers.
 * Groups renderers by their category (technique).
 */
function buildGraphDescription(data: ProcessedGraphData): string {
  const categories = data.nodes.filter((n) => n.type === "category");
  const renderers = data.nodes.filter((n) => n.type === "renderer");

  if (renderers.length === 0) return "Empty taxonomy graph.";

  // Build category-to-renderers map from edges
  const categoryRenderers = new Map<string, string[]>();
  for (const cat of categories) {
    categoryRenderers.set(cat.id, []);
  }

  for (const edge of data.edges) {
    if (edge.type === "belongs_to" || edge.type === "also_belongs_to") {
      const sourceId = typeof edge.source === "string" ? edge.source : edge.source.id;
      const targetId = typeof edge.target === "string" ? edge.target : edge.target.id;
      const sourceNode = data.nodes.find((n) => n.id === sourceId);
      const targetNode = data.nodes.find((n) => n.id === targetId);

      if (sourceNode?.type === "renderer" && targetNode?.type === "category") {
        const list = categoryRenderers.get(targetId);
        if (list && !list.includes(sourceNode.label)) {
          list.push(sourceNode.label);
        }
      }
    }
  }

  const parts: string[] = [
    `Taxonomy graph with ${renderers.length} renderers in ${categories.length} categories.`,
  ];

  for (const cat of categories) {
    const catRenderers = categoryRenderers.get(cat.id);
    if (catRenderers && catRenderers.length > 0) {
      parts.push(`${cat.label}: ${catRenderers.join(", ")}.`);
    }
  }

  return parts.join(" ");
}

/**
 * Compute a zoom transform that fits all nodes within the SVG
 * with padding, then apply it with a smooth transition.
 */
function fitGraphToView(
  svgRef: RefObject<SVGSVGElement | null>,
  zoomRef: React.MutableRefObject<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>,
  nodes: GraphNode[],
  duration = 500
) {
  const svgEl = svgRef.current;
  const zoom = zoomRef.current;
  if (!svgEl || !zoom || nodes.length === 0) return;

  const width = svgEl.clientWidth;
  const height = svgEl.clientHeight;
  if (width === 0 || height === 0) return;

  // Compute bounding box of all nodes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    const r = n.radius;
    if (x - r < minX) minX = x - r;
    if (y - r < minY) minY = y - r;
    if (x + r > maxX) maxX = x + r;
    if (y + r > maxY) maxY = y + r;
  }

  const padding = 60;
  const graphWidth = maxX - minX + padding * 2;
  const graphHeight = maxY - minY + padding * 2;

  const scale = Math.min(
    width / graphWidth,
    height / graphHeight,
    2 // Don't zoom in excessively for small graphs
  );

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(scale)
    .translate(-centerX, -centerY);

  const svg = d3.select(svgEl);
  svg.transition().duration(duration).call(zoom.transform, transform);
}
