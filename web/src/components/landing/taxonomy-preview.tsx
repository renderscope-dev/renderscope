"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { landingContent } from "@/lib/constants";
import { SectionWrapper } from "./section-wrapper";

const { taxonomy } = landingContent;

/**
 * Constellation node data.
 * Each node has a position (% based), size, and technique color.
 * The positions create a pleasing scattered arrangement.
 */
const nodes: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  animDelay: string;
  animDuration: string;
  dx: number;
  dy: number;
}[] = [
  { cx: 15, cy: 25, r: 6, color: "hsl(210,100%,65%)", animDelay: "0s", animDuration: "8s", dx: 3, dy: 2 },
  { cx: 35, cy: 15, r: 8, color: "hsl(280,85%,65%)", animDelay: "0.5s", animDuration: "10s", dx: -2, dy: 3 },
  { cx: 55, cy: 30, r: 5, color: "hsl(142,70%,50%)", animDelay: "1s", animDuration: "9s", dx: 2, dy: -2 },
  { cx: 75, cy: 20, r: 7, color: "hsl(25,95%,55%)", animDelay: "0.3s", animDuration: "11s", dx: -3, dy: 2 },
  { cx: 90, cy: 35, r: 4, color: "hsl(330,85%,60%)", animDelay: "1.5s", animDuration: "7s", dx: 2, dy: -3 },
  { cx: 25, cy: 50, r: 9, color: "hsl(210,100%,65%)", animDelay: "0.8s", animDuration: "12s", dx: -2, dy: -2 },
  { cx: 45, cy: 55, r: 6, color: "hsl(260,80%,70%)", animDelay: "0.2s", animDuration: "9s", dx: 3, dy: 2 },
  { cx: 65, cy: 45, r: 7, color: "hsl(185,80%,55%)", animDelay: "1.2s", animDuration: "10s", dx: -2, dy: 3 },
  { cx: 85, cy: 55, r: 5, color: "hsl(142,70%,50%)", animDelay: "0.6s", animDuration: "8s", dx: 2, dy: -2 },
  { cx: 20, cy: 75, r: 5, color: "hsl(45,95%,55%)", animDelay: "1.1s", animDuration: "11s", dx: -3, dy: -2 },
  { cx: 40, cy: 80, r: 7, color: "hsl(330,85%,60%)", animDelay: "0.4s", animDuration: "9s", dx: 2, dy: 2 },
  { cx: 60, cy: 70, r: 8, color: "hsl(210,100%,65%)", animDelay: "0.9s", animDuration: "10s", dx: -2, dy: -3 },
  { cx: 80, cy: 75, r: 4, color: "hsl(280,85%,65%)", animDelay: "1.4s", animDuration: "8s", dx: 3, dy: 2 },
  { cx: 50, cy: 42, r: 10, color: "hsl(217,92%,60%)", animDelay: "0s", animDuration: "13s", dx: -2, dy: 2 },
  { cx: 30, cy: 38, r: 4, color: "hsl(25,95%,55%)", animDelay: "0.7s", animDuration: "9s", dx: 2, dy: -2 },
  { cx: 70, cy: 60, r: 5, color: "hsl(260,80%,70%)", animDelay: "1.3s", animDuration: "10s", dx: -3, dy: 3 },
  { cx: 10, cy: 55, r: 3, color: "hsl(185,80%,55%)", animDelay: "0.5s", animDuration: "7s", dx: 2, dy: -2 },
  { cx: 92, cy: 65, r: 3, color: "hsl(45,95%,55%)", animDelay: "1s", animDuration: "8s", dx: -2, dy: 2 },
];

/**
 * Connections between node indices — thin lines representing relationships.
 */
const edges: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [6, 13], [13, 7], [14, 5], [14, 6],
  [2, 13], [13, 15], [15, 11],
  [16, 5], [8, 17], [1, 14],
];

export function TaxonomyPreview() {
  return (
    <SectionWrapper id="taxonomy" data-testid="taxonomy-preview">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Text content — left side */}
        <div>
          <h2 className="text-display-sm text-foreground">
            {taxonomy.heading}
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            {taxonomy.subtitle}
          </p>
          <Link
            href={taxonomy.cta.href}
            className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {taxonomy.cta.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* SVG constellation — right side */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl">
            {/* Edge fade overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, hsl(var(--background)) 100%)",
              }}
            />

            <svg
              viewBox="0 0 100 100"
              className="h-full w-full"
              aria-hidden="true"
            >
              {/* Edges */}
              {edges.map(([a, b], i) => {
                const na = nodes[a]!;
                const nb = nodes[b]!;
                return (
                  <line
                    key={`edge-${i}`}
                    x1={na.cx}
                    y1={na.cy}
                    x2={nb.cx}
                    y2={nb.cy}
                    stroke="hsl(var(--muted-foreground) / 0.15)"
                    strokeWidth="0.2"
                  />
                );
              })}

              {/* Nodes with gentle floating animation via CSS */}
              {nodes.map((node, i) => (
                <circle
                  key={`node-${i}`}
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r}
                  fill={node.color}
                  opacity="0.6"
                  className="taxonomy-node"
                  style={{
                    filter: `blur(${node.r > 6 ? 0.8 : 0.4}px)`,
                    animationDelay: node.animDelay,
                    animationDuration: node.animDuration,
                    // Custom properties for the CSS animation
                    "--dx": `${node.dx}px`,
                    "--dy": `${node.dy}px`,
                  } as React.CSSProperties}
                >
                  <animate
                    attributeName="cx"
                    values={`${node.cx};${node.cx + node.dx};${node.cx - node.dx * 0.5};${node.cx}`}
                    dur={node.animDuration}
                    repeatCount="indefinite"
                    calcMode="spline"
                    keySplines="0.42 0 0.58 1; 0.42 0 0.58 1; 0.42 0 0.58 1"
                  />
                  <animate
                    attributeName="cy"
                    values={`${node.cy};${node.cy + node.dy};${node.cy - node.dy * 0.5};${node.cy}`}
                    dur={node.animDuration}
                    repeatCount="indefinite"
                    calcMode="spline"
                    keySplines="0.42 0 0.58 1; 0.42 0 0.58 1; 0.42 0 0.58 1"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.5;0.8;0.5"
                    dur={node.animDuration}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
