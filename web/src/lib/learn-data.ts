import fs from "fs";
import path from "path";
import type {
  Technique,
  GlossaryTerm,
  TimelineRenderer,
  RendererCardData,
} from "@/types/learn";

// ── Data directories ──────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "..", "data");
const RENDERERS_DIR = path.join(DATA_DIR, "renderers");

// ── Technique data ────────────────────────────────────────────────────────

let _techniquesCache: Technique[] | null = null;

export function getAllTechniques(): Technique[] {
  if (_techniquesCache) return _techniquesCache;

  const filePath = path.join(DATA_DIR, "techniques.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const techniques = JSON.parse(raw) as Technique[];

  _techniquesCache = techniques.sort((a, b) => a.order - b.order);
  return _techniquesCache;
}

export function getTechniqueBySlug(slug: string): Technique | null {
  return getAllTechniques().find((t) => t.id === slug) ?? null;
}

export function getAllTechniqueSlugs(): string[] {
  return getAllTechniques().map((t) => t.id);
}

// ── Glossary data ─────────────────────────────────────────────────────────

let _glossaryCache: GlossaryTerm[] | null = null;

export function getAllGlossaryTerms(): GlossaryTerm[] {
  if (_glossaryCache) return _glossaryCache;

  const filePath = path.join(DATA_DIR, "glossary.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const terms = JSON.parse(raw) as GlossaryTerm[];

  _glossaryCache = terms.sort((a, b) =>
    a.term.localeCompare(b.term, "en", { sensitivity: "base" })
  );
  return _glossaryCache;
}

// ── Renderer data ─────────────────────────────────────────────────────────

interface RawRendererJson {
  id: string;
  name: string;
  technique: string[];
  language: string;
  status: string;
  first_release?: string;
  [key: string]: unknown;
}

let _renderersCache: RawRendererJson[] | null = null;

function loadAllRenderers(): RawRendererJson[] {
  if (_renderersCache) return _renderersCache;

  const files = fs.readdirSync(RENDERERS_DIR).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_")
  );

  _renderersCache = files.map((file) => {
    const raw = fs.readFileSync(path.join(RENDERERS_DIR, file), "utf-8");
    return JSON.parse(raw) as RawRendererJson;
  });

  return _renderersCache;
}

/**
 * Get renderers that match a given technique slug.
 * Maps between route slug format ("path-tracing") and
 * renderer data format ("path_tracing") transparently.
 */
export function getRenderersByTechnique(
  techniqueSlug: string
): RendererCardData[] {
  const technique = getTechniqueBySlug(techniqueSlug);
  if (!technique) return [];

  const rendererTechId = technique.rendererTechniqueId ?? techniqueSlug.replace(/-/g, "_");
  const renderers = loadAllRenderers();

  return renderers
    .filter((r) => r.technique.includes(rendererTechId))
    .map((r) => ({
      id: r.id,
      name: r.name,
      language: r.language,
      status: r.status,
      technique: r.technique,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load all renderers with valid first_release for the timeline.
 * Returns as TimelineRenderer objects sorted by year.
 */
export function getTimelineRenderers(): TimelineRenderer[] {
  const renderers = loadAllRenderers();

  return renderers
    .filter((r) => r.first_release)
    .map((r) => {
      const year = new Date(r.first_release!).getFullYear();
      return {
        id: r.id,
        name: r.name,
        technique: r.technique,
        firstReleaseYear: year,
        status: r.status,
      };
    })
    .filter((r) => !isNaN(r.firstReleaseYear) && r.firstReleaseYear > 1970)
    .sort((a, b) => a.firstReleaseYear - b.firstReleaseYear);
}
