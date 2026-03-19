"use client";

import {
  SplitSquareHorizontal,
  Diff,
  Flame,
  ToggleLeft,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { COMPARE_MODE_INFO, type CompareMode } from "@/lib/compare-images";

const MODE_ICONS: Record<CompareMode, LucideIcon> = {
  slider: SplitSquareHorizontal,
  diff: Diff,
  heatmap: Flame,
  toggle: ToggleLeft,
  zoom: ZoomIn,
};

interface ComparisonModeToolbarProps {
  activeMode: CompareMode;
  onModeChange: (mode: CompareMode) => void;
  className?: string;
}

/**
 * Horizontal toolbar for switching between the five comparison modes.
 * Uses shadcn ToggleGroup with tooltips showing mode descriptions.
 * Labels collapse to icon-only on mobile.
 */
export function ComparisonModeToolbar({
  activeMode,
  onModeChange,
  className,
}: ComparisonModeToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <ToggleGroup
        type="single"
        value={activeMode}
        onValueChange={(value) => {
          // ToggleGroup fires empty string when clicking the active item
          if (value) {
            onModeChange(value as CompareMode);
          }
        }}
        className={cn("flex flex-wrap gap-1", className)}
        aria-label="Comparison mode"
      >
        {COMPARE_MODE_INFO.map((mode) => {
          const Icon = MODE_ICONS[mode.id];
          return (
            <Tooltip key={mode.id}>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value={mode.id}
                  aria-label={mode.label}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm",
                    "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{mode.label}</span>
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {mode.description}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </TooltipProvider>
  );
}
