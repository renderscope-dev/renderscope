"use client";

import { FilterGroup } from "./filter-group";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterState } from "@/types/renderer";
import type { FilterGroupData } from "@/hooks/use-filter-counts";

interface FilterSidebarProps {
  filterGroups: FilterGroupData[];
  filters: FilterState;
  onToggle: (group: keyof FilterState, value: string) => void;
  onClear: () => void;
  activeCount: number;
  className?: string;
}

export function FilterSidebar({
  filterGroups,
  filters,
  onToggle,
  onClear,
  activeCount,
  className,
}: FilterSidebarProps) {
  return (
    <aside
      data-testid="filter-sidebar"
      className={cn("w-64 shrink-0 space-y-1", className)}
      aria-label="Filter renderers"
    >
      {/* Header + Clear */}
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" aria-hidden="true" />
            Clear all ({activeCount})
          </Button>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Filter Groups */}
      <div className="space-y-1 pt-1">
        {filterGroups.map((group, index) => (
          <div key={group.id}>
            <FilterGroup
              id={group.id}
              label={group.label}
              options={group.options}
              selectedValues={filters[group.id]}
              onToggle={onToggle}
              defaultExpanded={group.defaultExpanded}
            />
            {index < filterGroups.length - 1 && (
              <Separator className="opacity-30 my-1" />
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
