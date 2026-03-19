"use client";

import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStars } from "@/lib/utils";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { RendererData } from "@/types/renderer";

interface RendererPickerDropdownProps {
  results: RendererData[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  query: string;
}

/**
 * The searchable dropdown list of renderers inside the picker popover.
 * Shows each renderer with name, description, technique badges, and stars.
 * Already-selected renderers display a checkmark.
 */
export function RendererPickerDropdown({
  results,
  selectedIds,
  onSelect,
  query,
}: RendererPickerDropdownProps) {
  return (
    <CommandList id="renderer-picker-list" className="max-h-[320px]">
      <CommandEmpty className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No renderers match &ldquo;{query}&rdquo;
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Try a different search term
        </p>
      </CommandEmpty>

      <CommandGroup>
        {results.map((renderer) => {
          const isSelected = selectedIds.includes(renderer.id);
          return (
            <CommandItem
              key={renderer.id}
              value={renderer.id}
              onSelect={() => onSelect(renderer.id)}
              className={cn(
                "flex items-start gap-3 px-3 py-2.5",
                isSelected && "opacity-70"
              )}
            >
              {/* Checkmark for selected items */}
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {isSelected && (
                  <Check className="h-4 w-4 text-emerald-400" />
                )}
              </div>

              {/* Renderer info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {renderer.name}
                  </span>
                  {renderer.github_stars != null &&
                    renderer.github_stars > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/60">
                        <Star className="h-3 w-3" />
                        {formatStars(renderer.github_stars)}
                      </span>
                    )}
                </div>

                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {renderer.description}
                </p>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  {renderer.technique.slice(0, 2).map((tech) => (
                    <TechniqueBadge key={tech} technique={tech} size="sm" />
                  ))}
                </div>
              </div>
            </CommandItem>
          );
        })}
      </CommandGroup>
    </CommandList>
  );
}
