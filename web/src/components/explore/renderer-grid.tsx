"use client";

import { cn } from "@/lib/utils";
import { RendererCard } from "./renderer-card";
import { RendererCardList } from "./renderer-card-list";
import { NoResults } from "./no-results";
import type { RendererCardData, ViewMode } from "@/types/renderer";

interface RendererGridProps {
  renderers: RendererCardData[];
  view: ViewMode;
  className?: string;
}

export function RendererGrid({
  renderers,
  view,
  className,
}: RendererGridProps) {
  const maxStars = Math.max(
    ...renderers.map((r) => r.github_stars ?? 0),
    1
  );

  if (renderers.length === 0) {
    return <NoResults />;
  }

  if (view === "list") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {renderers.map((renderer, i) => (
          <RendererCardList
            key={renderer.id}
            renderer={renderer}
            index={i}
            maxStars={maxStars}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {renderers.map((renderer, i) => (
        <RendererCard
          key={renderer.id}
          renderer={renderer}
          index={i}
          maxStars={maxStars}
        />
      ))}
    </div>
  );
}
