// ═══════════════════════════════════════════════════════════════
// RENDERER TYPE DEFINITIONS
// Mirrors /schemas/renderer.schema.json — keep in sync.
// ═══════════════════════════════════════════════════════════════

export type RenderingTechnique =
  | "path_tracing"
  | "ray_tracing"
  | "rasterization"
  | "neural"
  | "gaussian_splatting"
  | "differentiable"
  | "volume_rendering"
  | "hybrid";

export type RendererStatus =
  | "active"
  | "maintenance"
  | "inactive"
  | "archived"
  | "deprecated";

export type Platform =
  | "linux"
  | "macos"
  | "windows"
  | "web"
  | "android"
  | "ios";

export type GpuApi =
  | "cuda"
  | "optix"
  | "opencl"
  | "vulkan"
  | "metal"
  | "directx"
  | "hip"
  | "oneapi"
  | "webgl"
  | "webgpu";

export interface RendererFeatures {
  global_illumination?: boolean | null;
  path_tracing?: boolean | null;
  bidirectional_pt?: boolean | null;
  metropolis_lt?: boolean | null;
  photon_mapping?: boolean | null;
  volumetric?: boolean | null;
  subsurface_scattering?: boolean | null;
  motion_blur?: boolean | null;
  depth_of_field?: boolean | null;
  spectral_rendering?: boolean | null;
  polarization?: boolean | null;
  caustics?: boolean | null;
  instancing?: boolean | null;
  out_of_core?: boolean | null;
  adaptive_sampling?: boolean | null;
  denoiser_builtin?: boolean | null;
  gpu_rendering?: boolean | null;
  multi_gpu?: boolean | null;
  network_rendering?: boolean | null;
  hardware_ray_tracing?: boolean | null;
  differentiable?: boolean | null;
  inverse_rendering?: boolean | null;
  neural_acceleration?: boolean | null;
  real_time_preview?: boolean | null;
  pbr_materials?: boolean | null;
  hdri_environment?: boolean | null;
  shadow_mapping?: boolean | null;
  screen_space_effects?: boolean | null;
  lod_system?: boolean | null;
  animation_support?: boolean | null;
  python_api?: boolean | null;
  c_cpp_api?: boolean | null;
  rust_api?: boolean | null;
  javascript_api?: boolean | null;
  scene_editor_gui?: boolean | null;
  plugin_system?: boolean | null;
  open_shading_language?: boolean | null;
  materialx?: boolean | null;
  [key: string]: boolean | null | undefined;
}

export interface CommunityLinks {
  forum?: string;
  discord?: string;
  mailing_list?: string;
  [key: string]: string | undefined;
}

export interface Citation {
  title: string;
  url: string;
  year: number;
}

export interface Tutorial {
  title: string;
  url: string;
  type: string;
}

export interface RendererData {
  // ── Identity ──
  id: string;
  name: string;
  version: string;
  description: string;
  long_description: string;

  // ── Classification ──
  technique: RenderingTechnique[];
  language: string;
  license: string;
  platforms: Platform[];
  status: RendererStatus;
  tags: string[];

  // ── Capabilities ──
  gpu_support: boolean;
  gpu_apis?: GpuApi[];
  cpu_support: boolean;
  real_time?: boolean;
  scene_formats: string[];
  output_formats: string[];
  features: RendererFeatures;

  // ── Links ──
  homepage?: string;
  repository: string;
  documentation?: string;
  paper?: string;
  paper_bibtex?: string;

  // ── Dates ──
  first_release: string;
  latest_release?: string;
  latest_release_version?: string;

  // ── Community (dynamic, updated by CI) ──
  github_stars?: number;
  github_stars_trend?: number[];
  commit_activity_52w?: number[];
  contributor_count?: number;
  open_issues?: number;
  fork_count?: number;

  // ── Editorial (human-written) ──
  strengths: string[];
  limitations: string[];
  best_for: string;
  not_ideal_for?: string;
  related?: string[];

  // ── Media ──
  thumbnail?: string;
  logo?: string;
  sample_renders?: string[];

  // ── Additional Metadata ──
  integrations?: string[];
  install_command?: string;
  community_links?: CommunityLinks;
  citations?: Citation[];
  tutorials?: Tutorial[];
}

/** Minimal renderer data needed by card components */
export type RendererCardData = Pick<
  RendererData,
  | "id"
  | "name"
  | "description"
  | "technique"
  | "language"
  | "license"
  | "github_stars"
  | "status"
  | "thumbnail"
  | "gpu_support"
  | "cpu_support"
  | "platforms"
  | "tags"
  | "best_for"
>;

export type ViewMode = "grid" | "list";

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "stars-desc"
  | "stars-asc"
  | "newest"
  | "oldest";
