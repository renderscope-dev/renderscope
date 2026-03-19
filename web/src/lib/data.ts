import fs from "fs";
import path from "path";
import type { RendererData } from "@/types/renderer";

// ═══════════════════════════════════════════════════════════════
// DATA LOADING — BUILD TIME ONLY
// These functions use Node.js `fs` and run during Next.js build.
// They CANNOT be called from client components.
// ═══════════════════════════════════════════════════════════════

const DATA_DIR = path.join(process.cwd(), "..", "data", "renderers");

/**
 * Load all renderer JSON files from /data/renderers/.
 * Skips files starting with _ (templates) and non-.json files.
 * Sorts by name alphabetically by default.
 */
export function getAllRenderers(): RendererData[] {
  if (!fs.existsSync(DATA_DIR)) {
    console.warn(`Data directory not found: ${DATA_DIR}`);
    return [];
  }

  const files = fs.readdirSync(DATA_DIR).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_")
  );

  const renderers: RendererData[] = files
    .map((file) => {
      try {
        const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
        return JSON.parse(raw) as RendererData;
      } catch (err) {
        console.error(`Failed to parse ${file}:`, err);
        return null;
      }
    })
    .filter((r): r is RendererData => r !== null);

  return renderers.sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  );
}

/**
 * Load a single renderer by its ID (slug).
 * Returns null if not found.
 */
export function getRendererById(id: string): RendererData | null {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as RendererData;
  } catch {
    return null;
  }
}

/**
 * Get all unique renderer IDs (for static path generation).
 */
export function getAllRendererIds(): string[] {
  if (!fs.existsSync(DATA_DIR)) return [];

  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => f.replace(".json", ""));
}

/**
 * Load multiple renderers by their IDs.
 * Silently skips any IDs that don't exist as JSON files.
 */
export function getRenderersByIds(ids: string[]): RendererData[] {
  return ids
    .map((id) => getRendererById(id))
    .filter((r): r is RendererData => r !== null);
}

/** Alias for getRendererById — used by profile pages. */
export const getRendererBySlug = getRendererById;

/** Alias for getAllRendererIds — used by generateStaticParams(). */
export const getAllRendererSlugs = getAllRendererIds;

/**
 * Compute catalog statistics for display.
 */
export function getCatalogStats(renderers: RendererData[]) {
  const techniques = new Set<string>();
  const languages = new Set<string>();
  const licenses = new Set<string>();

  for (const r of renderers) {
    for (const t of r.technique) {
      techniques.add(t);
    }
    languages.add(r.language);
    licenses.add(r.license);
  }

  return {
    total: renderers.length,
    techniques: techniques.size,
    languages: languages.size,
    licenses: licenses.size,
    activeCount: renderers.filter((r) => r.status === "active").length,
  };
}

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE DATA — BUILD TIME ONLY
// ═══════════════════════════════════════════════════════════════

/** OSI-approved licenses (common SPDX identifiers). */
const OSI_LICENSES = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause",
  "GPL-2.0", "GPL-2.0+", "GPL-2.0-only", "GPL-2.0-or-later",
  "GPL-3.0", "GPL-3.0-only", "GPL-3.0-or-later",
  "LGPL-2.1", "LGPL-3.0", "MPL-2.0", "ISC", "Unlicense",
  "zlib", "CC0-1.0", "AGPL-3.0", "AGPL-3.0-only",
  "BSD-style",
]);

export interface LandingPageStats {
  totalRenderers: number;
  totalTechniques: number;
  totalLanguages: number;
  totalOpenSource: number;
}

/**
 * Compute aggregate statistics for the landing page.
 * Reads all renderer JSON files and returns counts baked into static HTML.
 */
export function getLandingPageStats(): LandingPageStats {
  const renderers = getAllRenderers();

  const techniques = new Set<string>();
  const languages = new Set<string>();
  let openSourceCount = 0;

  for (const r of renderers) {
    for (const t of r.technique) {
      techniques.add(t);
    }
    languages.add(r.language);
    if (OSI_LICENSES.has(r.license)) {
      openSourceCount++;
    }
  }

  return {
    totalRenderers: renderers.length,
    totalTechniques: techniques.size,
    totalLanguages: languages.size,
    totalOpenSource: openSourceCount,
  };
}

/**
 * Featured renderer IDs — a curated, diverse set guaranteed to produce
 * compelling content in the "Recent Updates" section regardless of date data.
 */
const FEATURED_RENDERER_IDS = [
  "pbrt",
  "mitsuba3",
  "nerfstudio",
  "3d-gaussian-splatting",
  "filament",
  "blender-cycles",
  "ospray",
  "pytorch3d",
];

/**
 * Return the N most recently released renderers, sorted by latest_release
 * date descending. Falls back to a curated diverse list if date data is
 * insufficient.
 */
export function getRecentRenderers(count: number): RendererData[] {
  const all = getAllRenderers();

  // Try sorting by latest_release date
  const withDates = all.filter(
    (r) => r.latest_release && !isNaN(new Date(r.latest_release).getTime())
  );

  if (withDates.length >= count) {
    return withDates
      .sort((a, b) => {
        const aDate = new Date(a.latest_release!).getTime();
        const bDate = new Date(b.latest_release!).getTime();
        return bDate - aDate;
      })
      .slice(0, count);
  }

  // Fallback: curated diverse selection
  const curated: RendererData[] = [];
  for (const id of FEATURED_RENDERER_IDS) {
    if (curated.length >= count) break;
    const r = all.find((renderer) => renderer.id === id);
    if (r) curated.push(r);
  }

  // If we still don't have enough, pad with the first available renderers
  if (curated.length < count) {
    for (const r of all) {
      if (curated.length >= count) break;
      if (!curated.some((c) => c.id === r.id)) {
        curated.push(r);
      }
    }
  }

  return curated.slice(0, count);
}
