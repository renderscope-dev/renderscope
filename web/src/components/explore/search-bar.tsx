"use client";

import { useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
}

export function SearchBar({
  query,
  onQueryChange,
  className,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Keyboard Shortcut: Cmd+K / Ctrl+K ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      // Escape clears and blurs
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onQueryChange("");
        inputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onQueryChange]);

  // ── Debounced Input Handler ──
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onQueryChange(value);
      }, 300);
    },
    [onQueryChange]
  );

  // ── Clear Button ──
  const handleClear = useCallback(() => {
    onQueryChange("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [onQueryChange]);

  // Sync input value with external query state (for URL restoration)
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== query) {
      inputRef.current.value = query;
    }
  }, [query]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Search Icon */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

      {/* Input */}
      <Input
        ref={inputRef}
        type="search"
        placeholder="Search renderers..."
        defaultValue={query}
        onChange={handleChange}
        className={cn(
          "h-10 pl-10 pr-20 w-full",
          "bg-muted/50 border-border/50",
          "placeholder:text-muted-foreground/60",
          "focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-border",
          "transition-colors duration-200"
        )}
        aria-label="Search renderers"
        aria-describedby="search-hint"
      />

      {/* Right side: Clear button + Keyboard shortcut hint */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {/* Clear button (only when query is non-empty) */}
        {query && (
          <button
            onClick={handleClear}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Keyboard shortcut hint (hidden on mobile) */}
        <kbd
          id="search-hint"
          className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none"
        >
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
    </div>
  );
}
