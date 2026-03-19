"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import type { RendererData } from "@/types/renderer";

interface CompareEmptyStateProps {
  /** The single selected renderer (if exactly 1 is selected) */
  selectedRenderer?: RendererData;
  /** All available renderers — used to show suggestions */
  allRenderers: RendererData[];
  /** Callback to add a renderer by ID */
  onAddRenderer: (id: string) => void;
}

/**
 * Shown when fewer than 2 renderers are selected.
 *
 * - 0 renderers: Generic prompt with illustration and link to /explore.
 * - 1 renderer: Shows the selected renderer info and suggests
 *   related renderers (from the `related` field) as quick-add cards.
 */
export function CompareEmptyState({
  selectedRenderer,
  allRenderers,
  onAddRenderer,
}: CompareEmptyStateProps) {
  if (selectedRenderer) {
    return (
      <OneRendererState
        renderer={selectedRenderer}
        allRenderers={allRenderers}
        onAddRenderer={onAddRenderer}
      />
    );
  }
  return <ZeroRendererState />;
}

// ── Zero renderers selected ──────────────────────────────────

function ZeroRendererState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center py-16 text-center"
    >
      {/* Simple SVG illustration: two overlapping rectangles */}
      <div className="relative mb-6 h-20 w-28">
        <div className="absolute left-0 top-1 h-16 w-20 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/20" />
        <div className="absolute bottom-1 right-0 h-16 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
          vs
        </div>
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        Compare Renderers Side by Side
      </h2>

      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Select 2 to 5 renderers above to compare their features, visual output,
        and performance.
      </p>

      <Link
        href="/explore"
        className={cn(
          "mt-6 inline-flex items-center gap-1.5 text-sm font-medium",
          "text-muted-foreground transition-colors hover:text-foreground"
        )}
      >
        Not sure where to start? Browse the catalog
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}

// ── One renderer selected ────────────────────────────────────

function OneRendererState({
  renderer,
  allRenderers,
  onAddRenderer,
}: {
  renderer: RendererData;
  allRenderers: RendererData[];
  onAddRenderer: (id: string) => void;
}) {
  // Find suggested renderers from the `related` field
  const suggestions: RendererData[] = (renderer.related ?? [])
    .map((id) => allRenderers.find((r) => r.id === id))
    .filter((r): r is RendererData => r != null)
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center py-12 text-center"
    >
      {/* Selected renderer info */}
      <div className="mb-2 flex flex-wrap justify-center gap-1.5">
        {renderer.technique.map((tech) => (
          <TechniqueBadge key={tech} technique={tech} size="sm" />
        ))}
      </div>

      <h2 className="text-xl font-semibold text-foreground">
        Add One More to Compare
      </h2>

      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        You&apos;ve selected{" "}
        <span className="font-medium text-foreground">{renderer.name}</span>.
        Choose at least one more renderer to start your comparison.
      </p>

      {/* Suggested renderers */}
      {suggestions.length > 0 && (
        <div className="mt-8 w-full max-w-lg">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Suggested
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onAddRenderer(s.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 text-left",
                  "bg-card/30 transition-colors duration-150",
                  "hover:border-border/80 hover:bg-card/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground">
                    {s.name}
                  </span>
                  <div className="mt-1 flex gap-1">
                    {s.technique.slice(0, 2).map((tech) => (
                      <TechniqueBadge key={tech} technique={tech} size="sm" />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
