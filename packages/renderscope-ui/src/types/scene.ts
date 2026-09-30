/**
 * TypeScript types for scene metadata.
 * These types match the JSON schema defined in /schemas/scene.schema.json.
 */

/** Scene geometric and lighting complexity rating. */
export type SceneComplexity =
  | "trivial"
  | "low"
  | "medium"
  | "high"
  | "extreme";

/** Types of lights present in a scene. */
export type LightType =
  | "area"
  | "point"
  | "directional"
  | "spot"
  | "environment"
  | "ies"
  | "mesh";

/** Rendering features that a scene is designed to test. */
export type SceneTestCategory =
  | "global_illumination"
  | "color_bleeding"
  | "soft_shadows"
  | "hard_shadows"
  | "indirect_light"
  | "caustics"
  | "volumetric"
  | "subsurface"
  | "motion_blur"
  | "depth_of_field"
  | "textures"
  | "reflections"
  | "refractions"
  | "transparency"
  | "emissive"
  | "displacement"
  | "hair_fur"
  | "participating_media";

/** How one format of a scene is obtained. */
export interface SceneSource {
  /** Entry file path relative to this format's directory. */
  path: string;
  /** Where the archive or loose file is downloaded from. */
  url?: string;
  /** Archive name relative to a configured scene mirror. */
  archive?: string;
  /** Expected SHA-256 of the downloaded bytes, lowercase hex. */
  sha256?: string;
  /** Download size in megabytes. */
  size_mb?: number;
  /** Name to save the download as when the source is a single loose file. */
  filename?: string;
  /** Anything a reader needs to know about this source. */
  note?: string;
}

/** The ground-truth render a scene's quality metrics are measured against. */
export interface SceneReference {
  renderer: string;
  samples: number;
  /** Reference image path relative to the scene's directory. */
  image: string;
  url?: string;
  sha256?: string;
}

/** Camera position for a standard benchmark view. */
export interface CameraPosition {
  position: [x: number, y: number, z: number];
  look_at: [x: number, y: number, z: number];
  up?: [x: number, y: number, z: number];
  fov?: number;
}

/** Complete scene metadata. */
export interface SceneData {
  /** Unique identifier slug (e.g., "cornell_box"). */
  id: string;

  /** Human-readable name (e.g., "Cornell Box"). */
  name: string;

  /** Description of what the scene tests. */
  description: string;

  /** Rendering features this scene is designed to test. */
  tests: SceneTestCategory[];

  /** Overall geometric and lighting complexity. */
  complexity: SceneComplexity;

  /** Number of vertices in the scene. */
  vertices?: number;

  /** Number of faces / triangles. */
  faces?: number;

  /** Number of light sources. */
  lights?: number;

  /** Types of lights in the scene. */
  light_types?: LightType[];

  /** Number of texture maps. */
  textures?: number;

  /** Original source / attribution. */
  source?: string;

  /** URL to the original source. */
  source_url?: string;

  /** Scene file formats available. Mirrors the keys of `sources`. */
  available_formats: string[];

  /** How each format is obtained, keyed by format id. */
  sources?: Record<string, SceneSource>;

  /** The ground-truth render this scene's quality metrics are measured against. */
  reference?: SceneReference;

  /** Path to a thumbnail image. */
  thumbnail?: string;

  /** Standard camera position for benchmarking. */
  camera?: CameraPosition;

  /** Download URL for the scene files. */
  download_url?: string;

  /** File size in bytes (total, all formats). */
  file_size_bytes?: number;
}
