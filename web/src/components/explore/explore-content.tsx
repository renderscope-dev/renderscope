"use client";

import { useState, useMemo } from "react";
import { RendererGrid } from "./renderer-grid";
import { ViewToggle } from "./view-toggle";
import type { RendererCardData, ViewMode, SortOption } from "@/types/renderer";
import { sortRenderers } from "@/lib/utils";
import { sortOptions } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExploreContentProps {
  renderers: RendererCardData[];
}

export function ExploreContent({ renderers }: ExploreContentProps) {
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortOption>("stars-desc");

  const sortedRenderers = useMemo(
    () => sortRenderers(renderers, sort),
    [renderers, sort]
  );

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {renderers.length}
          </span>{" "}
          renderers
        </p>

        <div className="flex items-center gap-3">
          <Select
            value={sort}
            onValueChange={(val) => setSort(val as SortOption)}
          >
            <SelectTrigger className="w-[160px] h-9 text-sm bg-muted/50 border-0">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <RendererGrid renderers={sortedRenderers} view={view} />
    </div>
  );
}
