"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import type {
  GraphNode,
  GraphEdge,
  ProcessedGraphData,
} from "@/types/taxonomy";
import { TaxonomyTooltip } from "./taxonomy-tooltip";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Preview-specific node sizing: tighter range than full graph */
const PREVIEW_MIN_RADIUS = 4;
const PREVIEW_MAX_RADIUS = 14;
const PREVIEW_CATEGORY_RADIUS = 20;

/**
 * How many renderer nodes are required for the preview to render.
 * Below this, the visualization looks sparse and unimpressive.
 */
const MIN_RENDERER_COUNT = 5;

/**
 * On mobile, only show the top N renderers by GitHub stars
 * to keep the visualization legible in a small viewport.
 */
const MOBILE_NODE_LIMIT = 25;

/** Animation frame rate target: ~30fps for ambient motion */
const FRAME_SKIP = 2;

/** Ambient drift interval in milliseconds */
const DRIFT_INTERVAL_MS = 3500;

/** Ambient drift alpha reheat value */
const DRIFT_ALPHA = 0.03;

// ═══════════════════════════════════════════════════════════════
// DATA PREPARATION
// ═══════════════════════════════════════════════════════════════

/**
 * Rescale node radii for the preview's tighter range.
 * The full graph uses 6–22px; the preview uses 4–14px.
 */
function rescaleForPreview(node: GraphNode): GraphNode {
  if (node.type === "category") {
    return { ...node, radius: PREVIEW_CATEGORY_RADIUS };
  }

  // Linear remap: map the original [6, 22] range to [4, 14]
  const originalMin = 6;
  const originalMax = 22;
  const clamped = Math.max(originalMin, Math.min(originalMax, node.radius));
  const t = (clamped - originalMin) / (originalMax - originalMin || 1);
  const newRadius =
    PREVIEW_MIN_RADIUS + t * (PREVIEW_MAX_RADIUS - PREVIEW_MIN_RADIUS);

  return { ...node, radius: newRadius };
}

/**
 * Filter data for preview: only `belongs_to` and `also_belongs_to` edges
 * (renderer→category), rescale nodes, and optionally limit node count.
 */
function preparePreviewData(
  data: ProcessedGraphData,
  limitNodes: boolean
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  let rendererNodes = data.nodes.filter((n) => n.type === "renderer");
  const categoryNodes = data.nodes.filter((n) => n.type === "category");

  // On mobile, keep only the top N by stars
  if (limitNodes && rendererNodes.length > MOBILE_NODE_LIMIT) {
    rendererNodes = [...rendererNodes]
      .sort((a, b) => (b.githubStars ?? 0) - (a.githubStars ?? 0))
      .slice(0, MOBILE_NODE_LIMIT);
  }

  const allNodes = [...categoryNodes, ...rendererNodes].map(rescaleForPreview);
  const validIds = new Set(allNodes.map((n) => n.id));

  // Only keep belongs_to / also_belongs_to edges (renderer → category clustering)
  const edges = data.edges.filter(
    (e) =>
      (e.type === "belongs_to" || e.type === "also_belongs_to") &&
      validIds.has(typeof e.source === "string" ? e.source : e.source.id) &&
      validIds.has(typeof e.target === "string" ? e.target : e.target.id)
  );

  return { nodes: allNodes, edges };
}

/**
 * Determine which renderer labels to show by default (top N% by stars).
 * Returns a set of node IDs whose labels should be visible.
 */
function computeVisibleLabels(
  nodes: GraphNode[],
  topPercent: number
): Set<string> {
  const renderers = nodes.filter((n) => n.type === "renderer");
  const sorted = [...renderers].sort(
    (a, b) => (b.githubStars ?? 0) - (a.githubStars ?? 0)
  );
  const count = Math.max(1, Math.ceil(sorted.length * topPercent));
  const ids = new Set<string>();
  for (let i = 0; i < count && i < sorted.length; i++) {
    ids.add(sorted[i]!.id);
  }
  return ids;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

interface TaxonomyPreviewProps {
  /** Taxonomy data (nodes and edges) — loaded at build time by the page */
  data: ProcessedGraphData;
  /** Maximum height of the preview container. Default: 400 */
  maxHeight?: number;
  /** CSS class for the outer wrapper */
  className?: string;
}

export function TaxonomyPreview({
  data,
  maxHeight = 400,
  className,
}: TaxonomyPreviewProps) {
  const rendererCount = data.nodes.filter((n) => n.type === "renderer").length;

  // Don't render if there aren't enough nodes for a meaningful visualization
  if (rendererCount < MIN_RENDERER_COUNT) {
    return null;
  }

  return (
    <TaxonomyPreviewInner
      data={data}
      maxHeight={maxHeight}
      className={className}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// INNER COMPONENT — contains hooks
// ═══════════════════════════════════════════════════════════════

function TaxonomyPreviewInner({
  data,
  maxHeight,
  className,
}: Required<Pick<TaxonomyPreviewProps, "data" | "maxHeight">> & {
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(
    null
  );
  const isVisibleRef = useRef(false);
  const frameCountRef = useRef(0);
  const driftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const hasInitializedRef = useRef(false);
  const isTouchDeviceRef = useRef(false);
  const tappedNodeRef = useRef<string | null>(null);

  const router = useRouter();

  // Tooltip state
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Detect mobile for node limiting
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Click handler ──
  const handleNodeClick = useCallback(
    (d: GraphNode) => {
      // Touch: first tap shows tooltip, second tap navigates
      if (isTouchDeviceRef.current) {
        if (tappedNodeRef.current === d.id) {
          // Second tap on same node → navigate
          if (d.type === "renderer" && d.slug) {
            router.push(`/renderer/${d.slug}`);
          } else if (d.type === "category") {
            router.push(`/explore?technique=${d.primaryTechnique}&view=graph`);
          }
          tappedNodeRef.current = null;
          return;
        }
        // First tap → show tooltip, remember the node
        tappedNodeRef.current = d.id;
        return;
      }

      // Desktop: single click navigates
      if (d.type === "renderer" && d.slug) {
        router.push(`/renderer/${d.slug}`);
      } else if (d.type === "category") {
        router.push(`/explore?technique=${d.primaryTechnique}&view=graph`);
      }
    },
    [router]
  );

  // ── Main D3 setup ──
  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    setContainerRect(container.getBoundingClientRect());

    // Prepare data (clone for D3 mutation, filter for preview)
    const { nodes, edges } = preparePreviewData(data, isMobile);
    const clonedNodes: GraphNode[] = nodes.map((n) => ({ ...n }));
    const clonedEdges: GraphEdge[] = edges.map((e) => ({ ...e }));

    // Determine which labels to show
    const labelPercent = isMobile ? 0 : width >= 1024 ? 0.3 : 0.2;
    const visibleLabels = computeVisibleLabels(clonedNodes, labelPercent);

    // ── SVG Setup ──
    const svg = d3
      .select(svgEl)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg.selectAll("*").remove();

    // ── Defs: glow filter ──
    const defs = svg.append("defs");

    // Create a glow filter per technique color for efficient reuse
    const uniqueColors = new Set(clonedNodes.map((n) => n.color));
    uniqueColors.forEach((color) => {
      const filterId = `glow-${color.replace(/[^a-z0-9]/gi, "")}`;
      const filter = defs
        .append("filter")
        .attr("id", filterId)
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
      filter
        .append("feGaussianBlur")
        .attr("in", "SourceGraphic")
        .attr("stdDeviation", "3")
        .attr("result", "blur");
      filter
        .append("feColorMatrix")
        .attr("in", "blur")
        .attr("type", "saturate")
        .attr("values", "1.5")
        .attr("result", "colored");
      const merge = filter.append("feMerge");
      merge.append("feMergeNode").attr("in", "colored");
      merge.append("feMergeNode").attr("in", "SourceGraphic");
    });

    // ── Graph group (no zoom/pan — fixed viewport) ──
    const graphGroup = svg.append("g").attr("class", "preview-graph");

    // ── Edges ──
    const edgeGroup = graphGroup.append("g").attr("class", "edges");
    const edgeSelection = edgeGroup
      .selectAll<SVGLineElement, GraphEdge>("line")
      .data(clonedEdges)
      .join("line")
      .attr("stroke", "white")
      .attr("stroke-width", (d) => (d.type === "belongs_to" ? 0.8 : 0.6))
      .attr("stroke-opacity", (d) =>
        d.type === "belongs_to" ? 0.1 : 0.06
      )
      .attr("stroke-dasharray", (d) =>
        d.type === "also_belongs_to" ? "3,3" : ""
      )
      .style("transition", "stroke-opacity 250ms ease");

    // ── Nodes ──
    const nodeGroup = graphGroup.append("g").attr("class", "nodes");
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, GraphNode>("g.node")
      .data(clonedNodes)
      .join("g")
      .attr("class", "node")
      .attr("role", (d) => (d.type === "renderer" ? "button" : null))
      .attr("aria-label", (d) =>
        d.type === "renderer"
          ? `${d.label}, click to view details`
          : d.label
      )
      .style("cursor", (d) =>
        d.type === "renderer" ? "pointer" : "default"
      );

    // Node glow circle (behind the main circle for the bloom effect)
    nodeSelection
      .filter((d) => d.type === "renderer")
      .append("circle")
      .attr("class", "glow-ring")
      .attr("r", (d) => d.radius + 3)
      .attr("fill", (d) => d.color)
      .attr("opacity", 0.12)
      .attr("filter", (d) => {
        const filterId = `glow-${d.color.replace(/[^a-z0-9]/gi, "")}`;
        return `url(#${filterId})`;
      });

    // Main node circle
    nodeSelection
      .append("circle")
      .attr("class", "node-circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => {
        if (d.type === "category") {
          // Semi-transparent fill for categories
          const c = d3.color(d.color);
          if (c) {
            c.opacity = 0.06;
            return c.formatRgb();
          }
          return "transparent";
        }
        return d.color;
      })
      .attr("fill-opacity", (d) => (d.type === "renderer" ? 0.85 : 1))
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => (d.type === "category" ? 1.5 : 0.8))
      .attr("stroke-dasharray", (d) =>
        d.type === "category" ? "4,3" : ""
      )
      .style("transition", "r 200ms ease, opacity 200ms ease");

    // Node labels
    nodeSelection
      .append("text")
      .attr("class", "node-label")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 12)
      .attr("fill", "hsl(0, 0%, 95%)")
      .attr("font-size", (d) => (d.type === "category" ? "10px" : "9px"))
      .attr("font-weight", (d) => (d.type === "category" ? "500" : "400"))
      .attr("font-family", "system-ui, -apple-system, sans-serif")
      .style("text-shadow", "0 1px 4px rgba(0,0,0,0.9)")
      .style("pointer-events", "none")
      .attr("opacity", (d) => {
        if (d.type === "category") return 0.6;
        if (visibleLabels.has(d.id)) return 0.8;
        return 0;
      });

    // ── Hover interactions ──
    nodeSelection
      .on("mouseenter", function (event: MouseEvent, d: GraphNode) {
        isTouchDeviceRef.current = false;
        const rect = container.getBoundingClientRect();
        setContainerRect(rect);
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        setHoveredNode(d);

        // Collect connected node IDs
        const connectedIds = new Set<string>([d.id]);
        clonedEdges.forEach((e) => {
          const sId =
            typeof e.source === "string" ? e.source : e.source.id;
          const tId =
            typeof e.target === "string" ? e.target : e.target.id;
          if (sId === d.id || tId === d.id) {
            connectedIds.add(sId);
            connectedIds.add(tId);
          }
        });

        // Spotlight effect: dim unrelated nodes
        nodeSelection
          .select(".node-circle")
          .attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.25));

        nodeSelection
          .select(".glow-ring")
          .attr("opacity", (n) => (n.id === d.id ? 0.3 : connectedIds.has(n.id) ? 0.12 : 0.03));

        nodeSelection.select(".node-label").attr("opacity", (n) => {
          if (n.id === d.id) return 1;
          if (connectedIds.has(n.id) && n.type === "category") return 0.6;
          return 0;
        });

        edgeSelection.attr("stroke-opacity", (e) => {
          const sId =
            typeof e.source === "string" ? e.source : e.source.id;
          const tId =
            typeof e.target === "string" ? e.target : e.target.id;
          if (sId === d.id || tId === d.id) return 0.5;
          return 0.02;
        });

        // Scale up hovered node
        d3.select(this)
          .select(".node-circle")
          .transition()
          .duration(150)
          .attr("r", d.radius * 1.2);
        d3.select(this)
          .select(".glow-ring")
          .transition()
          .duration(150)
          .attr("r", (d.radius + 3) * 1.3);
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
        nodeSelection.select(".node-circle").attr("opacity", (n) =>
          n.type === "renderer" ? 0.85 : 1
        );
        nodeSelection.select(".glow-ring").attr("opacity", 0.12);
        nodeSelection.select(".node-label").attr("opacity", (n) => {
          if (n.type === "category") return 0.6;
          if (visibleLabels.has(n.id)) return 0.8;
          return 0;
        });
        edgeSelection.attr("stroke-opacity", (e) =>
          e.type === "belongs_to" ? 0.1 : 0.06
        );

        // Restore node size
        d3.select(this)
          .select(".node-circle")
          .transition()
          .duration(150)
          .attr("r", d.radius);
        d3.select(this)
          .select(".glow-ring")
          .transition()
          .duration(150)
          .attr("r", d.radius + 3);
      });

    // ── Touch interactions ──
    nodeSelection.on("touchstart", function (event: TouchEvent, d: GraphNode) {
      isTouchDeviceRef.current = true;
      event.preventDefault();
      const touch = event.touches[0];
      if (!touch) return;

      const rect = container.getBoundingClientRect();
      setContainerRect(rect);
      setTooltipPos({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
      setHoveredNode(d);

      handleNodeClick(d);
    });

    // Dismiss tooltip on background tap (touch)
    svg.on("touchstart", function (event: TouchEvent) {
      const target = event.target as SVGElement;
      if (!target.closest(".node")) {
        setHoveredNode(null);
        tappedNodeRef.current = null;
      }
    });

    // ── Click ──
    nodeSelection.on("click", (_event: MouseEvent, d: GraphNode) => {
      if (!isTouchDeviceRef.current) {
        handleNodeClick(d);
      }
    });

    // ── Force Simulation ──
    const simulation = d3
      .forceSimulation<GraphNode>(clonedNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphEdge>(clonedEdges)
          .id((d) => d.id)
          .distance(60)
          .strength(0.3)
      )
      .force(
        "collide",
        d3
          .forceCollide<GraphNode>()
          .radius((d) => d.radius + 4)
          .strength(0.7)
      )
      .force(
        "center",
        d3.forceCenter(width / 2, height / 2).strength(0.05)
      )
      .force(
        "charge",
        d3
          .forceManyBody<GraphNode>()
          .strength((d) =>
            d.type === "category" ? -300 : -30
          )
          .distanceMax(250)
      )
      .alpha(1)
      .alphaDecay(0.025)
      .alphaMin(0.001)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    // ── Tick handler with frame skipping for ~30fps ──
    simulation.on("tick", () => {
      frameCountRef.current++;
      if (frameCountRef.current % FRAME_SKIP !== 0 && simulation.alpha() < 0.3) {
        return;
      }

      edgeSelection
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      nodeSelection.attr(
        "transform",
        (d) => `translate(${d.x ?? 0},${d.y ?? 0})`
      );

      // Fit to view after initial settling, then reveal
      if (!hasInitializedRef.current && simulation.alpha() < 0.15) {
        hasInitializedRef.current = true;
        fitPreviewToView(graphGroup, clonedNodes, width, height);
        // Smooth fade-in
        setTimeout(() => setIsReady(true), 100);
      }
    });

    // ── Ambient drift (starts after simulation cools) ──
    function startAmbientDrift() {
      if (driftIntervalRef.current) return;

      driftIntervalRef.current = setInterval(() => {
        if (!isVisibleRef.current) return;
        const sim = simulationRef.current;
        if (!sim) return;

        // Nudge ~5% of nodes
        const nudgeCount = Math.max(1, Math.ceil(clonedNodes.length * 0.05));
        for (let i = 0; i < nudgeCount; i++) {
          const idx = Math.floor(Math.random() * clonedNodes.length);
          const node = clonedNodes[idx];
          if (node) {
            node.vx = (node.vx ?? 0) + (Math.random() - 0.5) * 0.3;
            node.vy = (node.vy ?? 0) + (Math.random() - 0.5) * 0.3;
          }
        }

        sim.alpha(DRIFT_ALPHA).restart();
      }, DRIFT_INTERVAL_MS);
    }

    // Start drift after simulation initially settles
    simulation.on("end.drift", () => {
      startAmbientDrift();
    });

    // Also start drift if alpha gets low enough (may not trigger "end" if continuously reheated)
    const driftCheck = setInterval(() => {
      if (simulation.alpha() < 0.01 && !driftIntervalRef.current) {
        startAmbientDrift();
      }
    }, 2000);

    // ── IntersectionObserver: pause/resume when off-screen ──
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisibleRef.current = entry.isIntersecting;

        if (entry.isIntersecting) {
          simulationRef.current?.alpha(DRIFT_ALPHA).restart();
        } else {
          simulationRef.current?.stop();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // ── Cleanup ──
    return () => {
      simulation.stop();
      simulationRef.current = null;
      observer.disconnect();
      if (driftIntervalRef.current) {
        clearInterval(driftIntervalRef.current);
        driftIntervalRef.current = null;
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      clearInterval(driftCheck);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isMobile, handleNodeClick]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-white/5",
        className
      )}
      style={{
        height: isMobile ? 280 : maxHeight,
        background:
          "radial-gradient(ellipse at center, hsl(240 6% 10%) 0%, hsl(240 6% 6%) 70%, transparent 100%)",
      }}
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Taxonomy preview showing relationships between ${
          data.nodes.filter((n) => n.type === "renderer").length
        } rendering engines grouped by technique`}
        className="h-full w-full"
        style={{
          opacity: isReady ? 1 : 0,
          transition: "opacity 600ms ease-in-out",
        }}
      />

      <TaxonomyTooltip
        node={hoveredNode}
        position={tooltipPos}
        containerRect={containerRect}
      />

      {/* Accessible focus target for the entire preview */}
      <div className="sr-only" tabIndex={0} role="link" aria-label="Navigate to full taxonomy graph view">
        Press Enter to explore the full renderer taxonomy
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Compute a transform that fits all nodes within the SVG viewport
 * with padding, and apply it to the graph group.
 */
function fitPreviewToView(
  graphGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: GraphNode[],
  width: number,
  height: number
) {
  if (nodes.length === 0) return;

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

  const padding = 40;
  const graphWidth = maxX - minX + padding * 2;
  const graphHeight = maxY - minY + padding * 2;

  const scale = Math.min(
    width / graphWidth,
    height / graphHeight,
    1.8 // Don't zoom in excessively
  );

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const tx = width / 2 - centerX * scale;
  const ty = height / 2 - centerY * scale;

  graphGroup
    .transition()
    .duration(500)
    .attr("transform", `translate(${tx},${ty}) scale(${scale})`);
}
