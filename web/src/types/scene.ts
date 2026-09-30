// ═══════════════════════════════════════════════════════════════
// SCENE TYPE DEFINITIONS
// Mirrors /schemas/scene.schema.json — keep in sync.
// ═══════════════════════════════════════════════════════════════

export type SceneComplexity = "trivial" | "low" | "medium" | "high" | "extreme";

export interface SceneCamera {
  position: [number, number, number];
  look_at: [number, number, number];
  up?: [number, number, number];
  fov: number;
}

/**
 * How one format of a scene is obtained.
 *
 * Mirrors the `sources` block of the scene schema. Its keys are the single
 * source of truth for which formats exist: `available_formats` lists the same
 * set, and `scripts/validate_scenes.py` fails CI if the two disagree.
 */
export interface SceneSource {
  /** Entry file path relative to this format's directory, as the archive lays it out. */
  path: string;
  /** Where the archive or loose file is downloaded from. Absent means manual acquisition. */
  url?: string;
  /** Archive name relative to a configured scene mirror. */
  archive?: string;
  /** Expected SHA-256 of the downloaded bytes, lowercase hex. */
  sha256?: string;
  /** Download size in megabytes, measured from the source. */
  size_mb?: number;
  /** Name to save the download as when the source is a single loose file. */
  filename?: string;
  /** Anything a reader needs to know about this source. */
  note?: string;
}

/** The ground-truth render this scene's quality metrics are measured against. */
export interface SceneReference {
  renderer: string;
  samples: number;
  /** Reference image path relative to the scene's directory. */
  image: string;
  url?: string;
  sha256?: string;
}

export interface SceneRender {
  renderer_id: string;
  image_web: string | null;
  image_thumb: string | null;
  render_time_seconds: number | null;
  samples_per_pixel: number | null;
  integrator: string | null;
}

export interface SceneData {
  id: string;
  name: string;
  description: string;
  tests: string[];
  complexity: SceneComplexity;
  vertices: number;
  faces: number;
  lights: number;
  light_types: string[];
  textures: number;
  source: string;
  source_url: string;
  license?: string;
  available_formats: string[];
  sources: Record<string, SceneSource>;
  reference?: SceneReference;
  camera: SceneCamera;
  resolution?: [number, number];
  thumbnail?: string | null;
  renders?: SceneRender[];
}
