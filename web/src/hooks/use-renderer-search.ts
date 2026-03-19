"use client";

import { useMemo, useState } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import type { RendererData } from "@/types/renderer";

// ═══════════════════════════════════════════════════════════════
// FUSE.JS SEARCH CONFIGURATION — COMPARE PAGE RENDERER PICKER
// ═══════════════════════════════════════════════════════════════

/**
 * Fuse.js options tuned for the renderer picker search.
 * Weights prioritize name (most important), then description/tags.
 * Slightly higher threshold than explore search to be more forgiving
 * in the picker context (users are browsing, not filtering).
 */
const PICKER_FUSE_OPTIONS: IFuseOptions<RendererData> = {
  keys: [
    { name: "name", weight: 2.0 },
    { name: "description", weight: 1.0 },
    { name: "tags", weight: 1.0 },
    { name: "best_for", weight: 0.8 },
    { name: "technique", weight: 0.7 },
  ],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 1,
  ignoreLocation: true,
  shouldSort: true,
};

interface UseRendererSearchOptions {
  renderers: RendererData[];
  /** Max results to return (default: 12) */
  limit?: number;
}

interface UseRendererSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: RendererData[];
  /** Whether the search is active (query is non-empty) */
  isSearching: boolean;
}

/**
 * Hook wrapping Fuse.js for the renderer picker's search.
 *
 * When the query is empty, returns all renderers sorted by GitHub stars
 * (descending) — a sensible default for the open dropdown.
 * When the query has text, returns fuzzy-matched results capped at `limit`.
 */
export function useRendererSearch({
  renderers,
  limit = 12,
}: UseRendererSearchOptions): UseRendererSearchReturn {
  const [query, setQuery] = useState("");

  // Memoize the Fuse index — only rebuilds when the renderer list changes
  const fuseIndex = useMemo(
    () => new Fuse(renderers, PICKER_FUSE_OPTIONS),
    [renderers]
  );

  // Memoize a stars-sorted default list
  const defaultSorted = useMemo(
    () =>
      [...renderers].sort(
        (a, b) => (b.github_stars ?? 0) - (a.github_stars ?? 0)
      ),
    [renderers]
  );

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  const results = useMemo(() => {
    if (!isSearching) {
      return defaultSorted.slice(0, limit);
    }
    return fuseIndex
      .search(trimmed)
      .slice(0, limit)
      .map((r) => r.item);
  }, [isSearching, trimmed, fuseIndex, defaultSorted, limit]);

  return { query, setQuery, results, isSearching };
}
