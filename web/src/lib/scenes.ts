import fs from "fs";
import path from "path";
import type { SceneData, SceneComplexity } from "@/types/scene";
import type { SampleRender } from "@/types/renderer";

// ═══════════════════════════════════════════════════════════════
// SCENE DATA LOADING — BUILD TIME ONLY
// These functions use Node.js `fs` and run during Next.js build.
// They CANNOT be called from client components.
// ═══════════════════════════════════════════════════════════════

const SCENES_DIR = path.join(process.cwd(), "..", "data", "scenes");

/** Complexity ordering for sort comparisons. */
const COMPLEXITY_ORDER: Record<SceneComplexity, number> = {
  trivial: 0,
  low: 1,
  medium: 2,
  high: 3,
  extreme: 4,
};

/**
 * Load all scene JSON files from /data/scenes/.
 * Sorts by complexity (trivial → extreme) then alphabetically by name.
 */
export function getAllScenes(): SceneData[] {
  if (!fs.existsSync(SCENES_DIR)) {
    console.warn(`Scene data directory not found: ${SCENES_DIR}`);
    return [];
  }

  const files = fs
    .readdirSync(SCENES_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  const scenes: SceneData[] = files
    .map((file) => {
      try {
        const raw = fs.readFileSync(path.join(SCENES_DIR, file), "utf-8");
        return JSON.parse(raw) as SceneData;
      } catch (err) {
        console.error(`Failed to parse scene file ${file}:`, err);
        return null;
      }
    })
    .filter((s): s is SceneData => s !== null);

  return scenes.sort((a, b) => {
    const complexityDiff =
      (COMPLEXITY_ORDER[a.complexity] ?? 2) -
      (COMPLEXITY_ORDER[b.complexity] ?? 2);
    if (complexityDiff !== 0) return complexityDiff;
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });
}

/**
 * Load a single scene by its ID (slug).
 * Returns null if not found.
 */
export function getSceneById(id: string): SceneData | null {
  const filePath = path.join(SCENES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as SceneData;
  } catch {
    return null;
  }
}

/**
 * Return all scene IDs for static path generation (generateStaticParams).
 */
export function getSceneSlugs(): string[] {
  if (!fs.existsSync(SCENES_DIR)) return [];

  return fs
    .readdirSync(SCENES_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => f.replace(".json", ""));
}

/**
 * Get sample render images for a specific renderer across all scenes.
 * Looks at each scene's `renders` array for entries matching this renderer.
 * Returns SampleRender[] suitable for the SampleGallery component.
 */
export function getRendererSampleImages(rendererId: string): SampleRender[] {
  const scenes = getAllScenes();
  const samples: SampleRender[] = [];

  for (const scene of scenes) {
    if (!scene.renders) continue;
    const render = scene.renders.find((r) => r.renderer_id === rendererId);
    if (!render || !render.image_web) continue;

    samples.push({
      src: render.image_web,
      scene: scene.name,
      renderer: rendererId,
      width: scene.resolution?.[0],
      height: scene.resolution?.[1],
      spp: render.samples_per_pixel ?? undefined,
      renderTime: render.render_time_seconds ?? undefined,
      settings: render.integrator ?? undefined,
    });
  }

  return samples;
}

/** A render image for use on the landing page. */
export interface LandingRenderImage {
  src: string;
  renderer: string;
  rendererName: string;
  scene: string;
  technique: string;
}

/**
 * Get a diverse set of render images for the hero grid.
 * Returns up to `count` images from different renderer×scene combinations.
 */
export function getHeroRenderImages(count: number): LandingRenderImage[] {
  const RENDERERS_DIR = path.join(process.cwd(), "..", "data", "renderers");
  const scenes = getAllScenes();
  const images: LandingRenderImage[] = [];
  const seenRenderers = new Set<string>();

  // Build a quick lookup for renderer display names + techniques
  const rendererMeta: Record<string, { name: string; technique: string }> = {};
  if (fs.existsSync(RENDERERS_DIR)) {
    const files = fs
      .readdirSync(RENDERERS_DIR)
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(RENDERERS_DIR, file), "utf-8");
        const data = JSON.parse(raw) as {
          id: string;
          name: string;
          technique: string[];
        };
        rendererMeta[data.id] = {
          name: data.name,
          technique: data.technique[0] ?? "path_tracing",
        };
      } catch {
        // Skip malformed files
      }
    }
  }

  for (const scene of scenes) {
    if (images.length >= count) break;
    if (!scene.renders) continue;

    for (const render of scene.renders) {
      if (images.length >= count) break;
      if (seenRenderers.has(render.renderer_id)) continue;
      if (!render.image_thumb) continue;

      seenRenderers.add(render.renderer_id);
      const meta = rendererMeta[render.renderer_id];
      images.push({
        src: render.image_thumb,
        renderer: render.renderer_id,
        rendererName: meta?.name ?? render.renderer_id,
        scene: scene.name,
        technique: meta?.technique ?? "path_tracing",
      });
    }
  }

  return images;
}

/**
 * Get a pair of render images from different renderers on the same scene
 * for the featured comparison section.
 */
export function getComparisonPair(): {
  left: LandingRenderImage;
  right: LandingRenderImage;
  scene: string;
} | null {
  const scenes = getAllScenes();
  const RENDERERS_DIR = path.join(process.cwd(), "..", "data", "renderers");

  // Build renderer name lookup
  const rendererMeta: Record<string, { name: string; technique: string }> = {};
  if (fs.existsSync(RENDERERS_DIR)) {
    const files = fs
      .readdirSync(RENDERERS_DIR)
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(RENDERERS_DIR, file), "utf-8");
        const data = JSON.parse(raw) as {
          id: string;
          name: string;
          technique: string[];
        };
        rendererMeta[data.id] = {
          name: data.name,
          technique: data.technique[0] ?? "path_tracing",
        };
      } catch {
        // Skip malformed files
      }
    }
  }

  // Find a scene with at least 2 renders that have web images
  for (const scene of scenes) {
    if (!scene.renders || scene.renders.length < 2) continue;
    const withImages = scene.renders.filter((r) => r.image_web);
    if (withImages.length < 2) continue;

    const a = withImages[0]!;
    const b = withImages[1]!;

    const metaA = rendererMeta[a.renderer_id];
    const metaB = rendererMeta[b.renderer_id];

    return {
      left: {
        src: a.image_web!,
        renderer: a.renderer_id,
        rendererName: metaA?.name ?? a.renderer_id,
        scene: scene.name,
        technique: metaA?.technique ?? "path_tracing",
      },
      right: {
        src: b.image_web!,
        renderer: b.renderer_id,
        rendererName: metaB?.name ?? b.renderer_id,
        scene: scene.name,
        technique: metaB?.technique ?? "path_tracing",
      },
      scene: scene.name,
    };
  }

  return null;
}
