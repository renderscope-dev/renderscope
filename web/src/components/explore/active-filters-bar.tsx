"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { techniqueLabels, statusConfig, platformLabels } from "@/lib/constants";
import type { FilterState } from "@/types/renderer";

interface ActiveFiltersBarProps {
  filters: FilterState;
  query: string;
  onToggle: (group: keyof FilterState, value: string) => void;
  onClearQuery: () => void;
  onClearAll: () => void;
}

function getFilterLabel(group: keyof FilterState, value: string): string {
  switch (group) {
    case "techniques":
      return techniqueLabels[value] ?? value;
    case "platforms":
      return platformLabels[value] ?? value;
    case "statuses":
      return statusConfig[value]?.label ?? value;
    default:
      return value;
  }
}

function getGroupLabel(group: keyof FilterState): string {
  const labels: Record<keyof FilterState, string> = {
    techniques: "Technique",
    languages: "Language",
    licenses: "License",
    platforms: "Platform",
    statuses: "Status",
  };
  return labels[group];
}

export function ActiveFiltersBar({
  filters,
  query,
  onToggle,
  onClearQuery,
  onClearAll,
}: ActiveFiltersBarProps) {
  // Collect all active filters into a flat list of chips
  const chips: { group: keyof FilterState; value: string; label: string }[] =
    [];

  (Object.keys(filters) as (keyof FilterState)[]).forEach((group) => {
    filters[group].forEach((value) => {
      chips.push({
        group,
        value,
        label: getFilterLabel(group, value),
      });
    });
  });

  const hasQuery = query.trim().length > 0;
  const totalActive = chips.length + (hasQuery ? 1 : 0);

  if (totalActive === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap" role="status" aria-live="polite">
      <span className="text-xs text-muted-foreground shrink-0">
        Active filters:
      </span>

      {/* Search query chip */}
      {hasQuery && (
        <Badge
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-0.5 h-6 bg-muted/50 hover:bg-muted text-foreground/80 font-normal cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={onClearQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClearQuery();
            }
          }}
          aria-label={`Remove search: ${query}`}
        >
          <span className="text-xs">
            Search: &ldquo;{query}&rdquo;
          </span>
          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
        </Badge>
      )}

      {/* Filter chips */}
      {chips.map((chip) => (
        <Badge
          key={`${chip.group}-${chip.value}`}
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-0.5 h-6 bg-muted/50 hover:bg-muted text-foreground/80 font-normal cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => onToggle(chip.group, chip.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle(chip.group, chip.value);
            }
          }}
          aria-label={`${getGroupLabel(chip.group)}: ${chip.label}, press to remove`}
        >
          <span className="text-xs">
            <span className="text-muted-foreground">
              {getGroupLabel(chip.group)}:
            </span>{" "}
            {chip.label}
          </span>
          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" aria-hidden="true" />
        </Badge>
      ))}

      {/* Clear all */}
      {totalActive > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
