import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  parseAsInteger,
} from "nuqs/server";

// ═══════════════════════════════════════════════════════════════
// BENCHMARK PAGE URL PARAMETERS
// ═══════════════════════════════════════════════════════════════

/**
 * Selected renderers to filter by — ?renderer=pbrt,mitsuba3
 * Empty = show all renderers (no filter applied)
 */
export const benchRendererParser = parseAsArrayOf(
  parseAsString,
  ","
).withDefault([]);

/**
 * Selected scenes to filter by — ?scene=cornell_box,sponza
 * Empty = show all scenes
 */
export const benchSceneParser = parseAsArrayOf(
  parseAsString,
  ","
).withDefault([]);

/**
 * Selected hardware profiles to filter by — ?hw=hw1
 * Empty = show all hardware profiles
 */
export const benchHardwareParser = parseAsArrayOf(
  parseAsString,
  ","
).withDefault([]);

/**
 * Sort column — ?sort=renderTime
 */
export const BENCH_SORT_FIELDS = [
  "renderer",
  "scene",
  "renderTime",
  "peakMemory",
  "psnr",
  "ssim",
  "hardwareLabel",
] as const;

export const benchSortParser = parseAsStringLiteral(
  BENCH_SORT_FIELDS
).withDefault("renderTime");

/**
 * Sort direction — ?dir=asc
 */
export const BENCH_SORT_DIRS = ["asc", "desc"] as const;

export const benchSortDirParser = parseAsStringLiteral(
  BENCH_SORT_DIRS
).withDefault("asc");

/**
 * Current page — ?page=1
 */
export const benchPageParser = parseAsInteger.withDefault(1);

/** Number of rows per page in the benchmark table */
export const BENCH_PAGE_SIZE = 15;
