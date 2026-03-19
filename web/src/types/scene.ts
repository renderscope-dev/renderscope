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

export interface SceneDownloads {
  [format: string]: string;
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
  downloads?: SceneDownloads;
  camera: SceneCamera;
  resolution?: [number, number];
  thumbnail?: string | null;
  renders?: SceneRender[];
}
