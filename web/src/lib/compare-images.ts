// ═══════════════════════════════════════════════════════════════
// COMPARE PAGE — IMAGE RESOLUTION & TYPES
// Maps (scene + renderers) to image paths for comparison components.
// Phase 28 will replace placeholder logic with real benchmark data.
// ═══════════════════════════════════════════════════════════════

import type { SceneData } from "@/types/scene";
import type { RendererData } from "@/types/renderer";
import type { ComparisonImage } from "@/types/image-compare";

// ── Mode Types ───────────────────────────────────────────────

export const COMPARE_MODES = [
  "slider",
  "diff",
  "heatmap",
  "toggle",
  "zoom",
] as const;

export type CompareMode = (typeof COMPARE_MODES)[number];

/** Modes that compare exactly two images (need a pair picker when >2 renderers) */
export const PAIR_MODES: readonly CompareMode[] = [
  "slider",
  "diff",
  "heatmap",
];

/** Modes that show all selected renderers simultaneously */
export const MULTI_MODES: readonly CompareMode[] = ["toggle", "zoom"];

export function isPairMode(mode: CompareMode): boolean {
  return (PAIR_MODES as readonly string[]).includes(mode);
}

// ── Mode Metadata ────────────────────────────────────────────

export interface CompareModeInfo {
  id: CompareMode;
  label: string;
  description: string;
}

export const COMPARE_MODE_INFO: readonly CompareModeInfo[] = [
  {
    id: "slider",
    label: "Slider",
    description: "Drag to reveal — slide between two renders",
  },
  {
    id: "diff",
    label: "Diff",
    description: "Pixel difference — see exact differences amplified",
  },
  {
    id: "heatmap",
    label: "Heatmap",
    description: "SSIM heatmap — structural similarity visualization",
  },
  {
    id: "toggle",
    label: "Toggle",
    description: "A/B flip — rapidly switch between renders",
  },
  {
    id: "zoom",
    label: "Zoom",
    description: "Region zoom — magnify a selected area across all renders",
  },
];

// ── Render Image Metadata ────────────────────────────────────

export interface RenderImageMeta {
  rendererId: string;
  rendererName: string;
  sceneId: string;
  src: string;
  isPlaceholder: boolean;
  settings: {
    resolution: [number, number];
    samplesPerPixel: number;
    integrator?: string;
  };
  renderTimeSeconds: number;
}

// ── Placeholder Configuration ────────────────────────────────

/**
 * Placeholder SVG paths keyed by scene ID.
 * Each scene has a unique gradient/color-themed placeholder.
 */
const SCENE_PLACEHOLDERS: Record<string, string> = {
  "cornell-box": "/images/placeholders/placeholder-render-1.svg",
  sponza: "/images/placeholders/placeholder-render-2.svg",
  "stanford-bunny": "/images/placeholders/placeholder-render-3.svg",
  classroom: "/images/placeholders/renders/placeholder-render-4.svg",
  bmw: "/images/placeholders/renders/placeholder-render-5.svg",
  "san-miguel": "/images/placeholders/renders/placeholder-render-6.svg",
  "veach-mis": "/images/placeholders/renders/placeholder-render-7.svg",
};

/** Fallback placeholder when scene ID doesn't match */
const DEFAULT_PLACEHOLDER = "/images/placeholders/placeholder-render-1.svg";

/**
 * Raster images used for diff/heatmap modes when all images are placeholders.
 * SVGs can't be pixel-analyzed, so we substitute real PNGs.
 */
const RASTER_PLACEHOLDER_A = "/test-images/reference.png";
const RASTER_PLACEHOLDER_B = "/test-images/test.png";

/**
 * Placeholder render settings for each renderer.
 * Uses a simple hash to generate plausible-looking settings.
 */
function makePlaceholderSettings(
  rendererId: string,
  sceneId: string
): { resolution: [number, number]; samplesPerPixel: number; renderTimeSeconds: number } {
  // Simple hash for deterministic but varied numbers
  let hash = 0;
  const key = `${sceneId}:${rendererId}`;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  const positiveHash = Math.abs(hash);

  const sppOptions = [256, 512, 1024, 2048, 4096];
  const spp = sppOptions[positiveHash % sppOptions.length]!;

  // Render time between 5s and 120s
  const renderTime = 5 + (positiveHash % 115) + (positiveHash % 10) / 10;

  return {
    resolution: [1920, 1080],
    samplesPerPixel: spp,
    renderTimeSeconds: Math.round(renderTime * 10) / 10,
  };
}

// ── Image Resolution ─────────────────────────────────────────

export interface ResolvedRenderImages {
  images: RenderImageMeta[];
  isPlaceholder: boolean;
}

/**
 * Resolve render images for a scene + set of renderers.
 *
 * Checks `scene.renders` for real data. Falls back to placeholder
 * SVGs when real renders don't exist. The components consuming this
 * data don't know or care whether images are placeholders.
 *
 * @returns images array (one per renderer) and isPlaceholder flag
 */
export function resolveRenderImages(
  scene: SceneData,
  renderers: RendererData[]
): ResolvedRenderImages {
  let hasAnyPlaceholder = false;

  const images = renderers.map((renderer): RenderImageMeta => {
    // Check for real render data in scene
    const realRender = scene.renders?.find(
      (r) => r.renderer_id === renderer.id
    );

    if (realRender?.image_web) {
      return {
        rendererId: renderer.id,
        rendererName: renderer.name,
        sceneId: scene.id,
        src: realRender.image_web,
        isPlaceholder: false,
        settings: {
          resolution: scene.resolution ?? [1920, 1080],
          samplesPerPixel: realRender.samples_per_pixel ?? 1024,
          integrator: realRender.integrator ?? undefined,
        },
        renderTimeSeconds: realRender.render_time_seconds ?? 0,
      };
    }

    // Fall back to placeholder
    hasAnyPlaceholder = true;
    const placeholderSrc =
      SCENE_PLACEHOLDERS[scene.id] ?? DEFAULT_PLACEHOLDER;
    const placeholderSettings = makePlaceholderSettings(
      renderer.id,
      scene.id
    );

    return {
      rendererId: renderer.id,
      rendererName: renderer.name,
      sceneId: scene.id,
      src: placeholderSrc,
      isPlaceholder: true,
      settings: {
        resolution: placeholderSettings.resolution,
        samplesPerPixel: placeholderSettings.samplesPerPixel,
      },
      renderTimeSeconds: placeholderSettings.renderTimeSeconds,
    };
  });

  return { images, isPlaceholder: hasAnyPlaceholder };
}

/**
 * For pair modes (diff/heatmap), if both images are placeholder SVGs,
 * substitute raster PNGs so pixel-level analysis produces real output.
 */
export function getPairImagesForAnalysis(
  pair: [RenderImageMeta, RenderImageMeta]
): [RenderImageMeta, RenderImageMeta] {
  if (pair[0].isPlaceholder && pair[1].isPlaceholder) {
    return [
      { ...pair[0], src: RASTER_PLACEHOLDER_A },
      { ...pair[1], src: RASTER_PLACEHOLDER_B },
    ];
  }
  return pair;
}

// ── Conversion Helpers ───────────────────────────────────────

/** Convert a RenderImageMeta to the ComparisonImage format used by Phase 10 components */
export function toComparisonImage(meta: RenderImageMeta): ComparisonImage {
  return {
    src: meta.src,
    label: meta.rendererName,
    metadata: {
      "Render Time": `${meta.renderTimeSeconds.toFixed(1)}s`,
      Resolution: `${meta.settings.resolution[0]}×${meta.settings.resolution[1]}`,
      Samples: `${meta.settings.samplesPerPixel} spp`,
      ...(meta.settings.integrator
        ? { Integrator: meta.settings.integrator }
        : {}),
    },
  };
}
