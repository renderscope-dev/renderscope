"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { TimelineRenderer } from "@/types/learn";
import { TimelineVisualization } from "./timeline-visualization";
import { cn } from "@/lib/utils";

interface TimelinePageProps {
  renderers: TimelineRenderer[];
}

const LEGEND_ITEMS: { id: string; label: string; color: string }[] = [
  { id: "path_tracing", label: "Path Tracing", color: "bg-blue-400" },
  { id: "rasterization", label: "Rasterization", color: "bg-green-400" },
  { id: "neural", label: "Neural", color: "bg-purple-400" },
  { id: "gaussian_splatting", label: "Gaussian Splatting", color: "bg-pink-400" },
  { id: "differentiable", label: "Differentiable", color: "bg-rose-400" },
  { id: "volume_rendering", label: "Volume", color: "bg-orange-400" },
];

export function TimelinePageClient({ renderers }: TimelinePageProps) {
  const [filters, setFilters] = useState<string[]>([]);

  const toggleFilter = (techId: string) => {
    setFilters((prev) =>
      prev.includes(techId)
        ? prev.filter((f) => f !== techId)
        : [...prev, techId]
    );
  };

  // Determine which techniques are present in the data
  const presentTechniques = useMemo(() => {
    const set = new Set<string>();
    for (const r of renderers) {
      for (const t of r.technique) {
        set.add(t);
      }
    }
    return set;
  }, [renderers]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/learn" className="hover:text-foreground transition-colors">
          Learn
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Timeline</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Renderer Timeline
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          The evolution of open source rendering engines
        </p>
      </header>

      {/* Legend + Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">
          Filter:
        </span>
        {LEGEND_ITEMS.filter((item) => presentTechniques.has(item.id)).map(
          (item) => {
            const isActive = filters.length === 0 || filters.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleFilter(item.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  isActive
                    ? "border-border bg-card/80 text-foreground"
                    : "border-transparent bg-muted/30 text-muted-foreground/50"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    item.color,
                    !isActive && "opacity-30"
                  )}
                />
                {item.label}
              </button>
            );
          }
        )}
        {filters.length > 0 && (
          <button
            onClick={() => setFilters([])}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          {filters.length === 0
            ? `${renderers.length} renderers`
            : `${renderers.filter((r) => r.technique.some((t) => filters.includes(t))).length} of ${renderers.length} renderers`}
        </span>
        {renderers.length > 0 && (
          <span>
            {Math.min(...renderers.map((r) => r.firstReleaseYear))} –{" "}
            {Math.max(...renderers.map((r) => r.firstReleaseYear))}
          </span>
        )}
      </div>

      {/* Timeline */}
      <TimelineVisualization renderers={renderers} filters={filters} />
    </div>
  );
}
