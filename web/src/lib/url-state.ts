import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  createSearchParamsCache,
} from "nuqs/server";

// ═══════════════════════════════════════════════════════════════
// URL PARAMETER PARSERS
// Each parser defines how a query param is read/written to the URL.
// ═══════════════════════════════════════════════════════════════

/** Search query — ?q=gaussian */
export const queryParser = parseAsString.withDefault("");

/** Sort order — ?sort=stars-desc */
export const sortParser = parseAsStringLiteral([
  "name-asc",
  "name-desc",
  "stars-desc",
  "stars-asc",
  "newest",
  "oldest",
] as const).withDefault("stars-desc");

/** View mode — ?view=grid */
export const viewParser = parseAsStringLiteral([
  "grid",
  "list",
  "graph",
] as const).withDefault("grid");

/** Filter: techniques — ?technique=path_tracing,neural */
export const techniqueParser = parseAsArrayOf(parseAsString, ",").withDefault(
  []
);

/** Filter: languages — ?language=C%2B%2B,Python */
export const languageParser = parseAsArrayOf(parseAsString, ",").withDefault(
  []
);

/** Filter: licenses — ?license=MIT,Apache-2.0 */
export const licenseParser = parseAsArrayOf(parseAsString, ",").withDefault([]);

/** Filter: platforms — ?platform=linux,web */
export const platformParser = parseAsArrayOf(parseAsString, ",").withDefault(
  []
);

/** Filter: statuses — ?status=active */
export const statusParser = parseAsArrayOf(parseAsString, ",").withDefault([]);

// ═══════════════════════════════════════════════════════════════
// SERVER-SIDE CACHE (for reading params in Server Components)
// ═══════════════════════════════════════════════════════════════

export const searchParamsCache = createSearchParamsCache({
  q: queryParser,
  sort: sortParser,
  view: viewParser,
  technique: techniqueParser,
  language: languageParser,
  license: licenseParser,
  platform: platformParser,
  status: statusParser,
});
