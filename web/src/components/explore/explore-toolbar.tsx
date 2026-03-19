"use client";

import { ViewToggle } from "./view-toggle";
import { FilterMobileDrawer } from "./filter-mobile-drawer";
import type { ViewMode, SortOption, FilterState } from "@/types/renderer";
import { sortOptions } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterGroupData } from "@/hooks/use-filter-counts";

interface ExploreToolbarProps {
  filteredCount: number;
  totalCount: number;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  // Mobile filter props
  filterGroups: FilterGroupData[];
  filters: FilterState;
  onFilterToggle: (group: keyof FilterState, value: string) => void;
  onFilterClear: () => void;
  activeFilterCount: number;
}

export function ExploreToolbar({
  filteredCount,
  totalCount,
  sort,
  onSortChange,
  view,
  onViewChange,
  filterGroups,
  filters,
  onFilterToggle,
  onFilterClear,
  activeFilterCount,
}: ExploreToolbarProps) {
  const isFiltered = filteredCount !== totalCount;
  const isGraphView = view === "graph";

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      {/* Left: Result count or graph message */}
      <div className="flex items-center gap-3">
        {/* Mobile filter button (hidden on desktop & in graph view) */}
        {!isGraphView && (
          <div className="lg:hidden">
            <FilterMobileDrawer
              filterGroups={filterGroups}
              filters={filters}
              onToggle={onFilterToggle}
              onClear={onFilterClear}
              activeCount={activeFilterCount}
              resultCount={filteredCount}
            />
          </div>
        )}

        {isGraphView ? (
          <p className="text-sm text-muted-foreground">
            Showing all{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {totalCount}
            </span>{" "}
            renderers in the taxonomy graph
          </p>
        ) : (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isFiltered ? (
              <>
                <span className="font-semibold text-foreground tabular-nums">
                  {filteredCount}
                </span>
                <span className="text-muted-foreground/60">
                  {" "}
                  / {totalCount}
                </span>{" "}
                renderers
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground tabular-nums">
                  {totalCount}
                </span>{" "}
                renderers
              </>
            )}
          </p>
        )}
      </div>

      {/* Right: Sort + View */}
      <div className="flex items-center gap-3">
        {!isGraphView && (
          <Select
            value={sort}
            onValueChange={(val) => onSortChange(val as SortOption)}
          >
            <SelectTrigger className="w-[160px] h-9 text-sm bg-muted/50 border-0" aria-label="Sort renderers">
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
        )}

        <ViewToggle view={view} onChange={onViewChange} />
      </div>
    </div>
  );
}
