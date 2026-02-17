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
