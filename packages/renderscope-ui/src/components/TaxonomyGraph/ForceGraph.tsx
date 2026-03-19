/**
 * ForceGraph — Core D3 force-directed graph engine.
 *
 * React owns the component lifecycle; D3 owns the SVG rendering and
 * force simulation via a ref'd SVG container. On mount, D3 sets up
 * the simulation, binds to the SVG, and renders all nodes/edges.
 * On unmount, the simulation is stopped and all event listeners removed.
 *
 * @internal Not part of the public API — used by TaxonomyGraph wrapper.
 */

import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";
import { select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { drag as d3Drag } from "d3-drag";
import { color as d3Color } from "d3-color";
import "d3-transition"; // side-effect import for .transition() on selections

import type { GraphNode, GraphEdge, TaxonomyNode, TaxonomyEdgeType } from "../../types/taxonomy";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Edge visual encoding per relationship type. */
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

/** Force simulation link distances per edge type. */
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
const NEUTRAL_EDGE_COLOR = "#6B7280";

// ═══════════════════════════════════════════════════════════════
// PUBLIC HANDLE — imperative methods for parent component
// ═══════════════════════════════════════════════════════════════

export interface ForceGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToView: () => void;
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface ForceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  interactive: boolean;
  highlightedNodes?: string[];
  onNodeClick?: (nodeId: string, node: TaxonomyNode) => void;
  onNodeHover?: (node: GraphNode | null, event: MouseEvent | null) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(
  function ForceGraph(
    { nodes, edges, interactive, highlightedNodes, onNodeClick, onNodeHover },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const simulationRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);
    const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const hasSettledRef = useRef(false);
    const nodesRef = useRef<GraphNode[]>([]);

    // Expose imperative zoom methods to parent
    const zoomIn = useCallback(() => {
      const svg = svgRef.current;
      const zoomBehavior = zoomBehaviorRef.current;
      if (!svg || !zoomBehavior) return;
      const sel = select(svg);
      sel.transition().duration(300).call(zoomBehavior.scaleBy, ZOOM_STEP);
    }, []);

    const zoomOut = useCallback(() => {
      const svg = svgRef.current;
      const zoomBehavior = zoomBehaviorRef.current;
      if (!svg || !zoomBehavior) return;
      const sel = select(svg);
      sel.transition().duration(300).call(zoomBehavior.scaleBy, 1 / ZOOM_STEP);
    }, []);

    const fitToView = useCallback(() => {
      fitGraphToView(svgRef.current, zoomBehaviorRef.current, nodesRef.current);
    }, []);

    useImperativeHandle(ref, () => ({ zoomIn, zoomOut, fitToView }), [
      zoomIn,
      zoomOut,
      fitToView,
    ]);

    // ── Main D3 setup effect ──
    useEffect(() => {
      const container = containerRef.current;
      const svgEl = svgRef.current;
      if (!container || !svgEl) return;

      hasSettledRef.current = false;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // Deep-clone data so D3 can mutate in-place without affecting React props
      const simNodes: GraphNode[] = nodes.map((n) => ({ ...n }));
      const simEdges: GraphEdge[] = edges.map((e) => ({ ...e }));
      nodesRef.current = simNodes;

      // Build highlighted node set
      const highlightedSet = new Set(highlightedNodes ?? []);

      // ── SVG Setup ──
      const svg = select(svgEl)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

      // Clear previous content
      svg.selectAll("*").remove();

      // ── Defs: arrowhead marker ──
      const defs = svg.append("defs");

      // Unique marker ID to avoid collisions with multiple instances
      const markerId = `rs-arrowhead-${Math.random().toString(36).slice(2, 8)}`;

      defs
        .append("marker")
        .attr("id", markerId)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L10,0L0,4")
        .attr("fill", NEUTRAL_EDGE_COLOR);

      // ── Zoom container ──
      const zoomContainer = svg
        .append("g")
        .attr("class", "rs-zoom-container");

      // ── Edge group ──
      const edgeGroup = zoomContainer
        .append("g")
        .attr("class", "rs-edges");

      // ── Node group ──
      const nodeGroup = zoomContainer
        .append("g")
        .attr("class", "rs-nodes");

      // Precompute node color lookup for O(1) edge coloring
      const nodeColorMap = new Map<string, string>();
      for (const n of simNodes) {
        nodeColorMap.set(n.id, n.color);
      }

      // ── Draw Edges ──
      const edgeSelection = edgeGroup
        .selectAll<SVGLineElement, GraphEdge>("line")
        .data(simEdges)
        .join("line")
        .attr("class", "rs-taxonomy-edge")
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
          EDGE_STYLES[d.type].marker ? `url(#${markerId})` : null
        );

      // ── Draw Nodes ──
      const nodeSelection = nodeGroup
        .selectAll<SVGGElement, GraphNode>("g")
        .data(simNodes)
        .join("g")
        .attr("class", (d) => {
          let cls = "rs-taxonomy-node";
          if (d.type === "renderer") cls += " rs-taxonomy-node--renderer";
          if (d.type === "category") cls += " rs-taxonomy-node--category";
          if (highlightedSet.has(d.id)) cls += " rs-taxonomy-node--highlighted";
          return cls;
        })
        .attr("role", (d) => (d.type === "renderer" ? "button" : null))
        .attr("aria-label", (d) =>
          d.type === "renderer"
            ? `${d.label}, click to view details`
            : d.label
        );

      // Node circles
      nodeSelection
        .append("circle")
        .attr("r", (d) => {
          // Highlighted nodes get a slightly larger ring
          if (highlightedSet.has(d.id)) return d.radius + 3;
          return d.radius;
        })
        .attr("fill", (d) => {
          if (d.type === "category") {
            // Semi-transparent fill for category nodes (ring style)
            const c = d3Color(d.color);
            if (c) {
              c.opacity = 0.15;
              return c.formatRgb();
            }
            return "transparent";
          }
          return d.color;
        })
        .attr("stroke", (d) => d.color)
        .attr("stroke-width", (d) => {
          if (highlightedSet.has(d.id)) return 3;
          return d.type === "category" ? 2.5 : 1;
        });

      // Node labels
      nodeSelection
        .append("text")
        .text((d) => d.label)
        .attr("class", "rs-taxonomy-label")
        .attr("text-anchor", "middle")
        .attr("dy", (d) => d.radius + 14)
        .attr("fill", "var(--rs-text, #f2f2f2)")
        .attr("font-size", (d) => (d.type === "category" ? "13px" : "11px"))
        .attr("font-weight", (d) => (d.type === "category" ? "600" : "400"))
        .attr("font-family", "var(--rs-font-sans, system-ui, -apple-system, sans-serif)")
        .style("text-shadow", "0 1px 3px rgba(0,0,0,0.8)")
        // Highlighted nodes always show their label
        .attr("opacity", (d) => (highlightedSet.has(d.id) ? 1 : 1));

      // ── Interactivity (when enabled) ──
      if (interactive) {
        // Hover
        nodeSelection
          .on("mouseenter", function (event: MouseEvent, d: GraphNode) {
            onNodeHover?.(d, event);

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

            edgeSelection.attr("stroke-opacity", (e) => {
              const sourceId =
                typeof e.source === "string" ? e.source : e.source.id;
              const targetId =
                typeof e.target === "string" ? e.target : e.target.id;
              if (sourceId === d.id || targetId === d.id) {
                return EDGE_STYLES[e.type].highlightOpacity;
              }
              return 0.03;
            });

            nodeSelection
              .select("circle")
              .attr("opacity", (n) =>
                connectedNodeIds.has(n.id) ? 1 : 0.2
              );
            nodeSelection
              .select("text")
              .attr("opacity", (n) =>
                connectedNodeIds.has(n.id) ? 1 : 0.15
              );

            // Scale up hovered node
            select(this)
              .select("circle")
              .style("filter", "brightness(1.3)")
              .transition()
              .duration(150)
              .attr("r", d.radius * 1.1);
          })
          .on("mousemove", function (event: MouseEvent, d: GraphNode) {
            onNodeHover?.(d, event);
          })
          .on("mouseleave", function (_event: MouseEvent, d: GraphNode) {
            onNodeHover?.(null, null);

            // Restore all opacities
            edgeSelection.attr(
              "stroke-opacity",
              (e) => EDGE_STYLES[e.type].opacity
            );
            nodeSelection.select("circle").attr("opacity", 1);
            nodeSelection.select("text").attr("opacity", 1);

            // Restore node size
            select(this)
              .select("circle")
              .style("filter", null)
              .transition()
              .duration(150)
              .attr("r", highlightedSet.has(d.id) ? d.radius + 3 : d.radius);
          });

        // Click
        nodeSelection.on("click", (_event: MouseEvent, d: GraphNode) => {
          if (d.type === "renderer") {
            const nodeId = d.slug ?? d.id;
            onNodeClick?.(nodeId, {
              id: d.id,
              type: d.type,
              label: d.label,
              description: d.description,
              renderer_id: d.renderer_id,
              technique: d.technique,
              stars: d.stars,
              slug: d.slug,
            });
          }
        });

        // Prevent node double-clicks from triggering SVG's fit-to-view
        nodeSelection.on("dblclick", (event: MouseEvent) => {
          event.stopPropagation();
        });

        // Drag
        const dragBehavior = d3Drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) {
              simulationRef.current?.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) {
              simulationRef.current?.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
          });

        nodeSelection.call(dragBehavior);

        // ── Zoom/Pan ──
        const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
          .scaleExtent(ZOOM_EXTENT)
          .on("zoom", (event) => {
            zoomContainer.attr("transform", event.transform);

            // Adaptive label visibility based on zoom level
            const scale: number = event.transform.k;
            nodeSelection.select(".rs-taxonomy-label").attr("opacity", (d) => {
              // Highlighted nodes always show labels
              if (highlightedSet.has(d.id)) return 1;
              if (scale > 0.8) return 1;
              if (scale > 0.5) return d.radius > 10 ? 1 : 0;
              return d.type === "category" ? 1 : 0;
            });
          });

        svg.call(zoomBehavior);
        // Disable default double-click zoom, use custom fit-to-view
        svg.on("dblclick.zoom", null);
        svg.on("dblclick", () => {
          fitGraphToView(svgEl, zoomBehavior, simNodes);
        });

        zoomBehaviorRef.current = zoomBehavior;
      }

      // ── Force Simulation ──
      const simulation = forceSimulation<GraphNode>(simNodes)
        .force(
          "link",
          forceLink<GraphNode, GraphEdge>(simEdges)
            .id((d) => d.id)
            .distance((d) => LINK_DISTANCE_BY_EDGE[d.type] ?? 120)
            .strength(0.4)
        )
        .force(
          "charge",
          forceManyBody<GraphNode>().strength((d) =>
            d.type === "category" ? -600 : -200 - d.radius * 5
          )
        )
        .force("center", forceCenter(width / 2, height / 2).strength(0.04))
        .force(
          "collide",
          forceCollide<GraphNode>()
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
          fitGraphToView(svgEl, zoomBehaviorRef.current, simNodes, 600);
        }
      });

      // ── Resize Observer ──
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: w, height: h } = entry.contentRect;
          if (w === 0 || h === 0) continue;
          svg
            .attr("width", w)
            .attr("height", h)
            .attr("viewBox", `0 0 ${w} ${h}`);

          // Re-center force
          simulation.force(
            "center",
            forceCenter(w / 2, h / 2).strength(0.04)
          );
          simulation.alpha(0.15).restart();
        }
      });
      resizeObserver.observe(container);

      // ── Cleanup ──
      return () => {
        simulation.stop();
        simulationRef.current = null;
        zoomBehaviorRef.current = null;
        resizeObserver.disconnect();
      };
      // Re-run only when graph data or interactive mode changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, interactive, highlightedNodes, onNodeClick, onNodeHover]);

    return (
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", minHeight: "inherit" }}
      >
        <svg
          ref={svgRef}
          className="rs-taxonomy-svg"
          role="img"
          aria-label={`Interactive taxonomy graph showing relationships between ${
            nodes.filter((n) => n.type === "renderer").length
          } rendering engines`}
          style={{ minHeight: "inherit" }}
        />
      </div>
    );
  }
);
ForceGraph.displayName = "ForceGraph";

// ═══════════════════════════════════════════════════════════════
// HELPER: Fit-to-View
// ═══════════════════════════════════════════════════════════════

/**
 * Compute a zoom transform that fits all nodes within the SVG
 * with padding, then apply it with a smooth transition.
 */
function fitGraphToView(
  svgEl: SVGSVGElement | null,
  zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null,
  nodes: GraphNode[],
  duration = 500
) {
  if (!svgEl || !zoomBehavior || nodes.length === 0) return;

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

  const transform = zoomIdentity
    .translate(width / 2, height / 2)
    .scale(scale)
    .translate(-centerX, -centerY);

  const svg = select(svgEl);
  svg.transition().duration(duration).call(zoomBehavior.transform, transform);
}
