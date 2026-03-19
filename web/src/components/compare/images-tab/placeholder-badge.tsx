"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlaceholderBadgeProps {
  className?: string;
}

/**
 * Semi-transparent floating badge indicating that the displayed
 * images are sample placeholders, not real benchmark renders.
 */
export function PlaceholderBadge({ className }: PlaceholderBadgeProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full",
              "border border-amber-500/30 bg-amber-500/10 px-3 py-1",
              "text-xs font-medium text-amber-400",
              "backdrop-blur-sm transition-colors hover:bg-amber-500/15",
              className
            )}
          >
            <Info className="h-3.5 w-3.5" />
            <span>Sample Images</span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-[260px] text-center text-xs"
        >
          These are sample images for demonstration. Real benchmark renders will
          replace them when available.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
