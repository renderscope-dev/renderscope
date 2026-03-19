"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info, X as XIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FEATURE_CATEGORIES } from "@/lib/features";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import { FeatureMatrixCell } from "./feature-matrix-cell";
import { FeatureMatrixGroupHeader } from "./feature-matrix-group-header";
import type { RendererData } from "@/types/renderer";

interface FeatureMatrixTableProps {
  renderers: RendererData[];
  collapsedGroups: Set<string>;
  highlightDifferences: boolean;
  onToggleGroup: (groupId: string) => void;
  onRemoveRenderer: (rendererId: string) => void;
  tableRef: React.RefObject<HTMLDivElement>;
}

/**
 * The core scrollable table with sticky header row and sticky first column.
 *
 * Uses a native HTML `<table>` for proper semantics and accessibility.
 * Sticky positioning keeps the first column and header row visible
 * during horizontal/vertical scrolling.
 */
export function FeatureMatrixTable({
  renderers,
  collapsedGroups,
  highlightDifferences,
  onToggleGroup,
  onRemoveRenderer,
  tableRef,
}: FeatureMatrixTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ── Scroll shadow detection ──────────────────────────────

  const updateScrollShadows = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(
      el.scrollLeft < el.scrollWidth - el.clientWidth - 2
    );
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateScrollShadows();
    el.addEventListener("scroll", updateScrollShadows, { passive: true });
    const observer = new ResizeObserver(updateScrollShadows);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollShadows);
      observer.disconnect();
    };
  }, [updateScrollShadows]);

  // ── "All features match" check ───────────────────────────

  const allFeaturesMatchMessage = (() => {
    if (!highlightDifferences) return null;

    const hasDifference = FEATURE_CATEGORIES.some((cat) =>
      cat.features.some((f) => !allSame(renderers, f.key))
    );
    if (!hasDifference) {
      return "All features match \u2014 these renderers have identical feature profiles in our data.";
    }
    return null;
  })();

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={tableRef}>
        {/* "All features match" banner */}
        {allFeaturesMatchMessage && (
          <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-300/80">
            {allFeaturesMatchMessage}
          </div>
        )}

        {/* Scroll container with shadow indicators */}
        <div className="relative">
          {/* Left scroll shadow */}
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-40 w-8",
              "bg-gradient-to-r from-card to-transparent",
              "transition-opacity duration-200",
              canScrollLeft ? "opacity-100" : "opacity-0"
            )}
          />
          {/* Right scroll shadow */}
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-40 w-8",
              "bg-gradient-to-l from-card to-transparent",
              "transition-opacity duration-200",
              canScrollRight ? "opacity-100" : "opacity-0"
            )}
          />

          <div
            ref={scrollContainerRef}
            className="overflow-auto rounded-lg border border-border/50"
            style={{ maxHeight: "70vh" }}
          >
            <table className="w-full border-collapse">
              {/* ── Header row (renderer names) ── */}
              <thead>
                <tr>
                  {/* Corner cell — sticky in both directions */}
                  <th
                    scope="col"
                    className={cn(
                      "sticky left-0 top-0 z-30",
                      "min-w-[200px] max-w-[260px]",
                      "border-b border-r border-border/50",
                      "bg-card px-3 py-3 text-left"
                    )}
                  >
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Feature
                    </span>
                  </th>

                  {/* Renderer column headers */}
                  {renderers.map((renderer) => (
                    <th
                      key={renderer.id}
                      scope="col"
                      className={cn(
                        "sticky top-0 z-20",
                        "min-w-[120px]",
                        "border-b border-border/50",
                        "bg-card px-3 py-3 text-center"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="max-w-[130px] truncate text-sm font-semibold text-foreground">
                                {renderer.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{renderer.name}</p>
                            </TooltipContent>
                          </Tooltip>

                          {/* Remove button */}
                          {renderers.length > 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveRenderer(renderer.id);
                              }}
                              className={cn(
                                "ml-0.5 rounded p-0.5 opacity-0 transition-opacity",
                                "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                "group-hover/header:opacity-100",
                                "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              )}
                              aria-label={`Remove ${renderer.name} from comparison`}
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Technique badges */}
                        <div className="flex flex-wrap justify-center gap-1">
                          {renderer.technique.slice(0, 2).map((t) => (
                            <TechniqueBadge
                              key={t}
                              technique={t}
                              size="sm"
                              className="!text-[9px] !px-1.5 !py-0"
                            />
                          ))}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ── Feature rows, organized by category ── */}
              {FEATURE_CATEGORIES.map((category) => {
                const isCollapsed = collapsedGroups.has(category.id);

                return (
                  <tbody key={category.id}>
                    {/* Group header */}
                    <FeatureMatrixGroupHeader
                      category={category}
                      isCollapsed={isCollapsed}
                      onToggle={() => onToggleGroup(category.id)}
                      columnCount={renderers.length}
                    />

                    {/* Feature rows (hidden when collapsed) */}
                    {!isCollapsed &&
                      category.features.map((feature) => {
                        const isSame = allSame(renderers, feature.key);
                        const isDimmed =
                          highlightDifferences && isSame;

                        return (
                          <tr
                            key={feature.key}
                            className={cn(
                              "transition-opacity duration-300",
                              "group/row hover:bg-muted/30",
                              isDimmed && "opacity-[0.35]"
                            )}
                          >
                            {/* Feature label (sticky first column) */}
                            <th
                              scope="row"
                              className={cn(
                                "sticky left-0 z-10",
                                "min-w-[200px] max-w-[260px]",
                                "border-r border-border/30",
                                "bg-card px-3 py-2 text-left",
                                "group-hover/row:bg-muted/30",
                                "transition-colors duration-150"
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-foreground">
                                  {feature.label}
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="flex-shrink-0 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                                      aria-label={`Info about ${feature.label}`}
                                    >
                                      <Info className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="max-w-[280px]"
                                  >
                                    <p className="text-xs leading-relaxed">
                                      {feature.description}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </th>

                            {/* Feature cells per renderer */}
                            {renderers.map((renderer) => (
                              <FeatureMatrixCell
                                key={renderer.id}
                                value={
                                  renderer.features?.[feature.key] ??
                                  null
                                }
                                rendererName={renderer.name}
                                featureLabel={feature.label}
                              />
                            ))}
                          </tr>
                        );
                      })}
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Check whether all renderers have the same value for a given feature.
 * Used to determine whether a row should be dimmed in "highlight differences" mode.
 */
function allSame(renderers: RendererData[], featureKey: string): boolean {
  if (renderers.length === 0) return true;
  const firstValue = renderers[0]?.features?.[featureKey] ?? null;
  return renderers.every(
    (r) => (r.features?.[featureKey] ?? null) === firstValue
  );
}
