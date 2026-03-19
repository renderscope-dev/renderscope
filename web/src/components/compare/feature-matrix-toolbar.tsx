"use client";

import { Download, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getTotalFeatureCount } from "@/lib/features";

interface FeatureMatrixToolbarProps {
  highlightDifferences: boolean;
  onToggleHighlight: () => void;
  onExportCSV: () => void;
  onExportPNG: () => void;
  rendererCount: number;
}

/**
 * Control bar above the feature matrix table.
 *
 * Left side: contextual heading.
 * Right side: "Highlight Differences" switch + CSV/PNG export buttons.
 */
export function FeatureMatrixToolbar({
  highlightDifferences,
  onToggleHighlight,
  onExportCSV,
  onExportPNG,
  rendererCount,
}: FeatureMatrixToolbarProps) {
  const totalFeatures = getTotalFeatureCount();
  const switchId = "highlight-differences-switch";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        "rounded-lg border border-border/50 bg-card/50 px-4 py-3"
      )}
    >
      {/* Left: heading */}
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">
          Feature Comparison
        </p>
        <p className="text-xs text-muted-foreground">
          {rendererCount} renderers &middot; {totalFeatures} features
        </p>
      </div>

      {/* Right: controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Highlight Differences toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id={switchId}
            checked={highlightDifferences}
            onCheckedChange={onToggleHighlight}
            aria-label="Highlight differences between renderers"
          />
          <label
            htmlFor={switchId}
            className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Highlight Differences
          </label>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            className="h-8 gap-1.5 text-xs active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPNG}
            className="h-8 gap-1.5 text-xs active:scale-95"
          >
            <Camera className="h-3.5 w-3.5" />
            PNG
          </Button>
        </div>
      </div>
    </div>
  );
}
