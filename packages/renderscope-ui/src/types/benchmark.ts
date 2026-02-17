/**
 * TypeScript types for benchmark results.
 * These types match the JSON schema defined in /schemas/benchmark.schema.json.
 */

/** Hardware specifications for benchmark reproducibility. */
export interface HardwareInfo {
  cpu: string;
  cpu_cores?: number;
  cpu_threads?: number;
  gpu?: string;
  gpu_vram_gb?: number;
  ram_gb: number;
  os: string;
  os_version?: string;
  driver_version?: string;
}

/** Settings used for a benchmark render. */
export interface RenderSettings {
  resolution: [width: number, height: number];
  samples_per_pixel?: number;
  time_budget_seconds?: number;
  integrator?: string;
  max_bounces?: number;
  threads?: number;
  gpu_enabled?: boolean;
  denoiser?: string;
  extra?: Record<string, unknown>;
}

/** Quality metrics comparing rendered output to a reference. */
export interface QualityMetrics {
  reference_renderer?: string;
  reference_samples?: number;
  psnr?: number;
  ssim?: number;
  mse?: number;
  lpips?: number;
}

/** A single convergence data point (quality at a specific sample count / time). */
export interface ConvergenceDataPoint {
  samples: number;
  time_seconds: number;
  psnr?: number;
  ssim?: number;
}

/** Results from a single benchmark run. */
export interface BenchmarkResults {
  render_time_seconds: number;
  peak_memory_mb: number;
  output_image?: string;
}

/** A complete benchmark entry for one renderer on one scene. */
export interface BenchmarkEntry {
  /** Unique identifier (e.g., "cornell-box-pbrt-2024-12-01"). */
  id: string;

  /** Renderer slug (e.g., "pbrt"). */
  renderer: string;

  /** Renderer version used. */
  renderer_version?: string;

  /** Scene identifier (e.g., "cornell_box"). */
  scene: string;

  /** ISO 8601 timestamp of when the benchmark was run. */
  timestamp: string;

  /** Hardware the benchmark was run on. */
  hardware: HardwareInfo;

  /** Render settings used. */
  settings: RenderSettings;

  /** Timing and memory results. */
  results: BenchmarkResults;

  /** Quality comparison against a reference image. */
  quality?: QualityMetrics;

  /** Convergence data (quality at multiple sample counts). */
  convergence?: ConvergenceDataPoint[];

  /** Additional renderer-specific metadata. */
  metadata?: Record<string, unknown>;
}

/** Aggregated benchmark data for chart display. */
export interface BenchmarkComparison {
  scene: string;
  entries: BenchmarkEntry[];
}
