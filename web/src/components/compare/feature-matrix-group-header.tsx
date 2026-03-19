"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { announceToScreenReader } from "@/lib/a11y-utils";
import type { FeatureCategory } from "@/lib/features";

interface FeatureMatrixGroupHeaderProps {
  category: FeatureCategory;
  isCollapsed: boolean;
  onToggle: () => void;
  columnCount: number;
}

/**
 * A clickable header row that toggles collapsing its child feature rows.
 *
 * Renders as a `<tr>` with a single `<td>` spanning all columns.
 * The chevron rotates to indicate collapsed/expanded state.
 */
export function FeatureMatrixGroupHeader({
  category,
  isCollapsed,
  onToggle,
  columnCount,
}: FeatureMatrixGroupHeaderProps) {
  const groupId = `feature-group-${category.label.toLowerCase().replace(/\s+/g, "-")}`;

  const handleToggle = () => {
    onToggle();
    // Announce will fire after state updates — invert since onToggle will toggle
    const willExpand = isCollapsed;
    announceToScreenReader(
      willExpand
        ? `${category.label} expanded, ${category.features.length} features`
        : `${category.label} collapsed`
    );
  };

  return (
    <tr
      className="cursor-pointer select-none transition-colors duration-150 hover:bg-muted/60"
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
      role="row"
      aria-expanded={!isCollapsed}
      aria-controls={groupId}
      tabIndex={0}
    >
      <td
        colSpan={1 + columnCount}
        className="bg-muted/40 px-3 py-2.5"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              !isCollapsed && "rotate-90"
            )}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
            {category.label}
          </span>
          <span className="text-xs text-muted-foreground">
            ({category.features.length})
          </span>
        </div>
      </td>
    </tr>
  );
}
