"use client";

import { LayoutGrid, List, Network } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ViewMode } from "@/types/renderer";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(val) => {
        if (val) onChange(val as ViewMode);
      }}
      data-testid="view-toggle"
      className={cn("bg-muted/50 rounded-lg p-0.5", className)}
    >
      <ToggleGroupItem
        value="grid"
        aria-label="Grid view"
        className={cn(
          "rounded-md px-2.5 py-1.5 transition-all duration-200",
          "data-[state=on]:bg-background data-[state=on]:shadow-sm"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="list"
        aria-label="List view"
        className={cn(
          "rounded-md px-2.5 py-1.5 transition-all duration-200",
          "data-[state=on]:bg-background data-[state=on]:shadow-sm"
        )}
      >
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="graph"
        aria-label="Graph view"
        className={cn(
          "rounded-md px-2.5 py-1.5 transition-all duration-200",
          "data-[state=on]:bg-background data-[state=on]:shadow-sm"
        )}
      >
        <Network className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
