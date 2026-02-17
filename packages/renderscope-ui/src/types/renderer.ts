/**
 * TypeScript types for renderer metadata.
 * These types match the JSON schema defined in /schemas/renderer.schema.json.
 */

/** Primary rendering technique categories. */
export type RenderingTechnique =
  | "path_tracing"
  | "ray_tracing"
  | "rasterization"
  | "neural"
  | "differentiable"
  | "volume"
  | "educational"
  | "hybrid";

/** Renderer project status. */
export type RendererStatus =
  | "active"
  | "maintenance"
  | "inactive"
  | "archived"
  | "deprecated";

/** Supported platforms. */
export type Platform =
  | "linux"
  | "macos"
  | "windows"
  | "web"
  | "android"
  | "ios";

/** GPU API identifiers. */
export type GpuApi =
  | "cuda"
  | "optix"
  | "opencl"
  | "vulkan"
  | "metal"
  | "hip"
  | "oneapi"
  | "sycl"
  | "webgl"
  | "webgpu"
  | "directx";

/** Scene file formats. */
export type SceneFormat =
  | "pbrt"
  | "mitsuba_xml"
  | "gltf"
  | "glb"
  | "obj"
  | "fbx"
  | "usd"
  | "usda"
  | "usdz"
  | "blend"
  | "abc"
  | "ply"
  | "stl"
  | "colmap"
  | "nerfstudio"
  | "custom";

/** Image output formats. */
export type OutputFormat =
  | "exr"
  | "hdr"
  | "png"
  | "jpg"
  | "tiff"
  | "webp"
  | "bmp"
  | "ppm";

/** Boolean feature flags for the renderer feature matrix. */
export interface RendererFeatures {
  global_illumination?: boolean;
  path_tracing?: boolean;
  bidirectional_pt?: boolean;
  metropolis_lt?: boolean;
  photon_mapping?: boolean;
  volumetric?: boolean;
  subsurface_scattering?: boolean;
  motion_blur?: boolean;
  depth_of_field?: boolean;
  caustics?: boolean;
  spectral_rendering?: boolean;
  polarization?: boolean;
  differentiable?: boolean;
  denoiser_builtin?: boolean;
  gpu_rendering?: boolean;
  real_time_preview?: boolean;
  adaptive_sampling?: boolean;
  hardware_raytracing?: boolean;
  out_of_core?: boolean;
  network_rendering?: boolean;
  instancing?: boolean;
  animation?: boolean;
  pbr_materials?: boolean;
  open_shading_language?: boolean;
  materialx?: boolean;
  hdri_environment?: boolean;
  python_api?: boolean;
  c_cpp_api?: boolean;
  rust_api?: boolean;
  javascript_api?: boolean;
  scene_editor_gui?: boolean;
  plugin_system?: boolean;
  lod_support?: boolean;
  texture_streaming?: boolean;
}

/** Links associated with a renderer. */
export interface RendererLinks {
  homepage?: string;
  repository?: string;
  documentation?: string;
  paper?: string;
  paper_doi?: string;
}

/** GitHub activity and community metrics. */
export interface RendererGithub {
  stars?: number;
  stars_trend?: number[];
  forks?: number;
  open_issues?: number;
  contributors?: number;
  commit_activity_52w?: number[];
  latest_release_version?: string;
  latest_release_date?: string;
}

/** Editorial content written by humans. */
export interface RendererEditorial {
  strengths?: string[];
  limitations?: string[];
  best_for?: string;
  not_ideal_for?: string;
  history?: string;
}

/** Integration with other tools. */
export interface RendererIntegration {
  name: string;
  type: "plugin" | "addon" | "binding" | "native" | "wrapper";
  url?: string;
}

/** Community links. */
export interface RendererCommunity {
  discord?: string;
  forum?: string;
  mailing_list?: string;
  slack?: string;
  matrix?: string;
}

/** Citation information. */
export interface RendererCitation {
  bibtex?: string;
  doi?: string;
  title?: string;
  authors?: string[];
  year?: number;
  venue?: string;
}

/** Complete renderer metadata — the full data profile for a single renderer. */
export interface RendererData {
  /** Unique identifier slug (e.g., "mitsuba3", "pbrt"). */
  id: string;

  /** Human-readable display name (e.g., "Mitsuba 3", "PBRT v4"). */
  name: string;

  /** Current version string. */
  version?: string;

  /** One-line description. */
  description: string;

  /** Detailed description (2-3 paragraphs). */
  long_description?: string;

  /** Primary rendering technique(s). */
  technique: RenderingTechnique[];

  /** Primary implementation language (e.g., "C++", "Python/CUDA"). */
  language: string;

  /** SPDX license identifier (e.g., "MIT", "Apache-2.0"). */
  license: string;

  /** Supported operating systems. */
  platforms: Platform[];

  /** Whether GPU rendering is supported. */
  gpu_support: boolean;

  /** Whether CPU rendering is supported. */
  cpu_support: boolean;

  /** Supported GPU APIs. */
  gpu_apis?: GpuApi[];

  /** Supported input scene formats. */
  scene_formats: SceneFormat[];

  /** Supported output image formats. */
  output_formats: OutputFormat[];

  /** Boolean feature flags for comparison matrix. */
  features: RendererFeatures;

  /** External links. */
  links: RendererLinks;

  /** GitHub and community metrics. */
  github?: RendererGithub;

  /** Human-written editorial content. */
  editorial?: RendererEditorial;

  /** First public release date (ISO 8601). */
  first_release?: string;

  /** Most recent release date (ISO 8601). */
  latest_release?: string;

  /** Current project status. */
  status: RendererStatus;

  /** Searchable tags. */
  tags?: string[];

  /** IDs of related renderers. */
  related?: string[];

  /** Integrations with other tools. */
  integrations?: RendererIntegration[];

  /** Community links. */
  community?: RendererCommunity;

  /** Academic citations. */
  citations?: RendererCitation[];

  /** Tutorials and learning resources. */
  tutorials?: Array<{ title: string; url: string; type?: string }>;
}
