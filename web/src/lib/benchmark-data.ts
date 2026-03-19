import fs from "fs";
import path from "path";
import type {
  BenchmarkEntry,
  BenchmarkTableRow,
  HardwareProfile,
  BenchmarkOverviewData,
} from "@/types/benchmark";

// ═══════════════════════════════════════════════════════════════
// BENCHMARK DATA LOADING — BUILD TIME ONLY
// These functions use Node.js `fs` and run during Next.js build.
// They CANNOT be called from client components.
// ═══════════════════════════════════════════════════════════════

const BENCHMARKS_DIR = path.join(process.cwd(), "..", "data", "benchmarks");
const SCENES_DIR = path.join(process.cwd(), "..", "data", "scenes");
const RENDERERS_DIR = path.join(process.cwd(), "..", "data", "renderers");

/**
 * Load all benchmark entries from /data/benchmarks/*.json.
 * Called at build time in the Server Component (page.tsx).
 */
export function getAllBenchmarks(): BenchmarkEntry[] {
  if (!fs.existsSync(BENCHMARKS_DIR)) {
    console.warn(`Benchmarks directory not found: ${BENCHMARKS_DIR}`);
    return [];
  }

  const files = fs
    .readdirSync(BENCHMARKS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  const benchmarks: BenchmarkEntry[] = files
    .map((file) => {
      try {
        const raw = fs.readFileSync(path.join(BENCHMARKS_DIR, file), "utf-8");
        return JSON.parse(raw) as BenchmarkEntry;
      } catch (err) {
        console.error(`Failed to parse benchmark file ${file}:`, err);
        return null;
      }
    })
    .filter((b): b is BenchmarkEntry => b !== null);

  return benchmarks.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Extract unique hardware profiles from all benchmark entries.
 */
export function getHardwareProfiles(
  benchmarks: BenchmarkEntry[]
): HardwareProfile[] {
  const seen = new Map<string, HardwareProfile>();

  for (const b of benchmarks) {
    if (!seen.has(b.hardware.id)) {
      seen.set(b.hardware.id, b.hardware);
    }
  }

  return Array.from(seen.values());
}

/**
 * Build a renderer name lookup map from /data/renderers/*.json.
 * Used to show human-friendly names in the table.
 */
export function getRendererNameMap(): Record<
  string,
  { name: string; technique: string[] }
> {
  if (!fs.existsSync(RENDERERS_DIR)) return {};

  const files = fs
    .readdirSync(RENDERERS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  const map: Record<string, { name: string; technique: string[] }> = {};

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(RENDERERS_DIR, file), "utf-8");
      const data = JSON.parse(raw) as {
        id: string;
        name: string;
        technique: string[];
      };
      map[data.id] = { name: data.name, technique: data.technique };
    } catch {
      // Skip malformed files
    }
  }

  return map;
}

/**
 * Build a scene name lookup map from /data/scenes/*.json.
 */
export function getSceneNameMap(): Record<string, { name: string }> {
  if (!fs.existsSync(SCENES_DIR)) return {};

  const files = fs
    .readdirSync(SCENES_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  const map: Record<string, { name: string }> = {};

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(SCENES_DIR, file), "utf-8");
      const data = JSON.parse(raw) as { id: string; name: string };
      map[data.id] = { name: data.name };
    } catch {
      // Skip malformed files
    }
  }

  return map;
}

/**
 * Transform BenchmarkEntry[] into BenchmarkTableRow[] for the data table.
 * Flattens nested data and enriches with human-readable names.
 */
export function toBenchmarkTableRows(
  benchmarks: BenchmarkEntry[],
  rendererNames: Record<string, { name: string; technique: string[] }>,
  sceneNames: Record<string, { name: string }>
): BenchmarkTableRow[] {
  return benchmarks.map((b) => {
    const [w, h] = b.settings.resolution;
    return {
      id: b.id,
      renderer: b.renderer,
      rendererName: rendererNames[b.renderer]?.name ?? b.renderer,
      rendererTechnique: rendererNames[b.renderer]?.technique ?? [],
      scene: b.scene,
      sceneName: sceneNames[b.scene]?.name ?? b.scene,
      renderTime: b.results.render_time_seconds,
      peakMemory: b.results.peak_memory_mb,
      psnr: b.quality_vs_reference.psnr,
      ssim: b.quality_vs_reference.ssim,
      hardwareId: b.hardware.id,
      hardwareLabel: b.hardware.label,
      spp: b.settings.samples_per_pixel,
      resolution: `${w}×${h}`,
      timestamp: b.timestamp,
    };
  });
}

/**
 * Get all benchmarks for a specific renderer ID.
 * Returns entries sorted by scene name.
 */
export function getBenchmarksForRenderer(
  rendererId: string
): BenchmarkEntry[] {
  const all = getAllBenchmarks();
  return all
    .filter((b) => b.renderer === rendererId)
    .sort((a, b) => a.scene.localeCompare(b.scene));
}

/**
 * Compute overview statistics from benchmark data.
 */
export function getBenchmarkOverview(
  benchmarks: BenchmarkEntry[]
): BenchmarkOverviewData {
  const renderers = new Set<string>();
  const scenes = new Set<string>();
  const hardware = new Set<string>();

  for (const b of benchmarks) {
    renderers.add(b.renderer);
    scenes.add(b.scene);
    hardware.add(b.hardware.id);
  }

  return {
    totalBenchmarks: benchmarks.length,
    renderersCount: renderers.size,
    scenesCount: scenes.size,
    hardwareProfilesCount: hardware.size,
  };
}
