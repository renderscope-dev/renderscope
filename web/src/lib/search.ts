import Fuse, { type IFuseOptions } from "fuse.js";
import type { RendererData } from "@/types/renderer";

// ═══════════════════════════════════════════════════════════════
// FUSE.JS SEARCH CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Fuse.js options tuned for renderer search.
 *
 * - `threshold: 0.35` — moderately fuzzy. Catches typos like "mitsba"
 *   but won't match completely unrelated strings.
 * - `keys` are weighted: name matches are most important (1.0),
 *   followed by tags (0.7), description (0.5), and best_for (0.4).
 * - `ignoreLocation: true` — matches anywhere in the string.
 * - `minMatchCharLength: 2` — don't match single characters.
 */
const FUSE_OPTIONS: IFuseOptions<RendererData> = {
  keys: [
    { name: "name", weight: 1.0 },
    { name: "tags", weight: 0.7 },
    { name: "description", weight: 0.5 },
    { name: "best_for", weight: 0.4 },
    { name: "technique", weight: 0.3 },
    { name: "language", weight: 0.2 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  shouldSort: true,
  findAllMatches: false,
  useExtendedSearch: false,
};

/**
 * Create a Fuse.js search index from renderer data.
 * The index is created once and reused for all searches.
 */
export function createSearchIndex(
  renderers: RendererData[]
): Fuse<RendererData> {
  return new Fuse(renderers, FUSE_OPTIONS);
}

/**
 * Search renderers using the Fuse.js index.
 * Returns all renderers if query is empty.
 */
export function searchRenderers(
  index: Fuse<RendererData>,
  query: string,
  allRenderers: RendererData[]
): RendererData[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return allRenderers;

  const results = index.search(trimmed);
  return results.map((r) => r.item);
}
