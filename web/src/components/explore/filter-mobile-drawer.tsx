"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlidersHorizontal } from "lucide-react";
import { FilterGroup } from "./filter-group";
import { cn } from "@/lib/utils";
import type { FilterState } from "@/types/renderer";
import type { FilterGroupData } from "@/hooks/use-filter-counts";

interface FilterMobileDrawerProps {
  filterGroups: FilterGroupData[];
  filters: FilterState;
  onToggle: (group: keyof FilterState, value: string) => void;
  onClear: () => void;
  activeCount: number;
  resultCount: number;
}

export function FilterMobileDrawer({
  filterGroups,
  filters,
  onToggle,
  onClear,
  activeCount,
  resultCount,
}: FilterMobileDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="filter-toggle"
          className={cn(
            "h-9 gap-2 border-border/50 bg-muted/50",
            activeCount > 0 && "border-primary/30 bg-primary/5"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[320px] sm:w-[360px] p-0">
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">
              Filters
            </SheetTitle>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all ({activeCount})
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable Filter Groups */}
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="px-4 py-3 space-y-1">
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
        </ScrollArea>

        {/* Footer with result count + close */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-border/50 bg-background">
          <SheetClose asChild>
            <Button className="w-full" size="sm">
              Show {resultCount} renderer{resultCount !== 1 ? "s" : ""}
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
