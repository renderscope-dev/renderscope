"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRendererSearch } from "@/hooks/use-renderer-search";
import { MAX_COMPARE_RENDERERS } from "@/lib/compare-url-state";
import { Command } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RendererChip } from "./renderer-chip";
import { RendererPickerDropdown } from "./renderer-picker-dropdown";
import type { RendererData } from "@/types/renderer";

interface RendererPickerProps {
  /** All available renderers (passed from server at build time) */
  allRenderers: RendererData[];
  /** Currently selected renderer IDs */
  selectedIds: string[];
  /** Callback to update selected renderer IDs */
  onSelectionChange: (ids: string[]) => void;
  /** Maximum number of renderers that can be selected */
  maxSelection?: number;
}

/**
 * Multi-select search component for picking renderers to compare.
 *
 * Uses a Popover + Command (cmdk) combination for the searchable dropdown,
 * and AnimatePresence chips below the input for the selected renderers.
 * Supports keyboard navigation: arrow keys, Enter, Escape, Backspace.
 */
export function RendererPicker({
  allRenderers,
  selectedIds,
  onSelectionChange,
  maxSelection = MAX_COMPARE_RENDERERS,
}: RendererPickerProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAtMax = selectedIds.length >= maxSelection;

  const { query, setQuery, results } = useRendererSearch({
    renderers: allRenderers,
    limit: 15,
  });

  // Resolve selected IDs to full renderer objects
  const selectedRenderers = selectedIds
    .map((id) => allRenderers.find((r) => r.id === id))
    .filter((r): r is RendererData => r !== null);

  // Toggle a renderer in/out of the selection
  const handleSelect = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        // Remove
        onSelectionChange(selectedIds.filter((sid) => sid !== id));
      } else if (!isAtMax) {
        // Add
        onSelectionChange([...selectedIds, id]);
        setQuery("");
      }
    },
    [selectedIds, onSelectionChange, isAtMax, setQuery]
  );

  // Remove a renderer from the selection
  const handleRemove = useCallback(
    (id: string) => {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    },
    [selectedIds, onSelectionChange]
  );

  // Backspace on empty input removes the last chip
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        e.key === "Backspace" &&
        query === "" &&
        selectedIds.length > 0
      ) {
        const lastId = selectedIds[selectedIds.length - 1];
        if (lastId) {
          onSelectionChange(selectedIds.slice(0, -1));
        }
      }
    },
    [query, selectedIds, onSelectionChange]
  );

  // Return focus to input after selection
  useEffect(() => {
    if (open) {
      // Small delay to let popover render
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open, selectedIds.length]);

  return (
    <div data-testid="renderer-picker" className="rounded-xl border border-border/60 bg-card/50 p-4 sm:p-5">
      {/* Search input + dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={open}
                  aria-controls="renderer-picker-list"
                  aria-label="Search renderers to compare"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5",
                    "border border-border/40 bg-background/50 text-left",
                    "transition-colors duration-150",
                    "hover:border-border/80 hover:bg-background/80",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isAtMax && "cursor-not-allowed opacity-60"
                  )}
                  disabled={isAtMax}
                >
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">
                    {isAtMax
                      ? `Maximum ${maxSelection} renderers selected`
                      : "Search renderers to compare\u2026"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              {isAtMax && (
                <TooltipContent>
                  <p>Remove a renderer to add a different one</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => {
            // Prevent default auto-focus behavior so cmdk input gets focus
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Command
            onKeyDown={handleKeyDown}
            shouldFilter={false}
            className="rounded-lg"
          >
            {/* Search input inside the popover */}
            <div className="flex items-center border-b border-border/40 px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search\u2026"
                className={cn(
                  "flex h-10 w-full bg-transparent py-3 text-sm outline-none",
                  "placeholder:text-muted-foreground"
                )}
                aria-label="Search renderers"
              />
            </div>

            <RendererPickerDropdown
              results={results}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              query={query}
            />
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected renderer chips */}
      {selectedRenderers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Selected renderers">
          <AnimatePresence mode="popLayout">
            {selectedRenderers.map((renderer) => (
              <motion.div key={renderer.id} layout role="listitem">
                <RendererChip
                  renderer={renderer}
                  onRemove={() => handleRemove(renderer.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Selection count indicator (screen reader accessible) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedIds.length} of {maxSelection} renderers selected
      </div>
    </div>
  );
}
