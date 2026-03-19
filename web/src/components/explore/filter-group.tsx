"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { techniqueLabels, techniqueColorMap } from "@/lib/constants";
import type { FilterOption, FilterState } from "@/types/renderer";

interface FilterGroupProps {
  id: keyof FilterState;
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (group: keyof FilterState, value: string) => void;
  defaultExpanded?: boolean;
}

export function FilterGroup({
  id,
  label,
  options,
  selectedValues,
  onToggle,
  defaultExpanded = false,
}: FilterGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const selectedCount = selectedValues.length;

  // Don't render groups with no options
  if (options.length === 0) return null;

  // Determine if we need a scroll area (more than 8 options)
  const needsScroll = options.length > 8;

  const optionsList = (
    <div className="flex flex-col gap-0.5 pt-2">
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.value);
        const isDisabled = option.count === 0 && !isSelected;

        return (
          <label
            key={option.value}
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-md",
              "transition-colors duration-150",
              isDisabled
                ? "opacity-40 cursor-not-allowed"
                : "cursor-pointer hover:bg-muted/50",
              isSelected && "bg-muted/30"
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => {
                if (!isDisabled) onToggle(id, option.value);
              }}
              disabled={isDisabled}
              className="h-4 w-4 border-border/70 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              aria-label={`Filter by ${option.label}`}
            />

            {/* Label — use colored text for technique group */}
            <span className="flex-1 text-sm text-foreground/90 leading-none truncate">
              {id === "techniques" ? (
                <span
                  style={{
                    color: `hsl(var(--${techniqueColorMap[option.value] ?? "technique-path-tracing"}))`,
                  }}
                >
                  {techniqueLabels[option.value] ?? option.label}
                </span>
              ) : (
                option.label
              )}
            </span>

            {/* Count */}
            <span
              className={cn(
                "text-xs tabular-nums shrink-0",
                isSelected
                  ? "text-foreground/70 font-medium"
                  : "text-muted-foreground/60"
              )}
            >
              {option.count}
            </span>
          </label>
        );
      })}
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full group py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground/90">
            {label}
          </span>
          {selectedCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-primary tabular-nums">
              {selectedCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        {needsScroll ? (
          <ScrollArea className="h-[260px]">{optionsList}</ScrollArea>
        ) : (
          optionsList
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
