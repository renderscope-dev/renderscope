// ═══════════════════════════════════════════════════════════════
// BENCHMARK DATA TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Hardware configuration used for a benchmark run.
 * Each unique combination of CPU+GPU+RAM+OS represents a "hardware profile."
 */
export interface HardwareProfile {
  id: string;
  label: string;
  cpu: string;
  gpu: string;
  ram_gb: number;
  os: string;
  driver?: string;
}

/**
 * Benchmark settings — the renderer configuration used during the test.
 */
export interface BenchmarkSettings {
  resolution: [number, number];
  samples_per_pixel: number;
  integrator?: string;
  max_bounces?: number;
  threads?: number;
  gpu_enabled?: boolean;
}

/**
 * Raw benchmark results — timing and resource usage.
 */
export interface BenchmarkResults {
  render_time_seconds: number;
  peak_memory_mb: number;
  output_image?: string;
}

/**
 * Image quality metrics compared against a reference render.
 */
export interface QualityMetrics {
  reference_renderer: string;
  reference_samples: number;
  psnr: number;
  ssim: number;
  mse?: number;
  lpips?: number;
}

/**
 * A single convergence data point — quality at a specific sample count / time.
 */
export interface ConvergencePoint {
  samples: number;
  time: number;
  psnr: number;
}

/**
 * A complete benchmark entry — one renderer × one scene × one hardware config.
 * This is the top-level type for each JSON file in /data/benchmarks/.
 */
export interface BenchmarkEntry {
  id: string;
  renderer: string;
  renderer_version: string;
  scene: string;
  timestamp: string;
  hardware: HardwareProfile;
  settings: BenchmarkSettings;
  results: BenchmarkResults;
  quality_vs_reference: QualityMetrics;
  convergence: ConvergencePoint[];
}

// ═══════════════════════════════════════════════════════════════
// DERIVED / DISPLAY TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * A flattened row for the data table — combines data from BenchmarkEntry
 * into a single flat structure for easier sorting and display.
 */
export interface BenchmarkTableRow {
  id: string;
  renderer: string;
  rendererName: string;
  rendererTechnique: string[];
  scene: string;
  sceneName: string;
  renderTime: number;
  peakMemory: number;
  psnr: number;
  ssim: number;
  hardwareId: string;
  hardwareLabel: string;
  spp: number;
  resolution: string;
  timestamp: string;
}

/**
 * Sort configuration for the data table.
 */
export type SortField =
  | "renderer"
  | "scene"
  | "renderTime"
  | "peakMemory"
  | "psnr"
  | "ssim"
  | "hardwareLabel";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/**
 * Filter state for the data table.
 */
export interface BenchmarkFilters {
  renderers: string[];
  scenes: string[];
  hardware: string[];
}

/**
 * Overview statistics derived from all benchmark data.
 */
export interface BenchmarkOverviewData {
  totalBenchmarks: number;
  renderersCount: number;
  scenesCount: number;
  hardwareProfilesCount: number;
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE TAB / CHART COMPONENT TYPES
//
// Self-contained types for BenchmarkChart, ConvergencePlot, and
// HardwareContext. Designed to be the public API when these
// components are extracted to the renderscope-ui npm package
// (Phase 23). The mock data module (this session) and the real
// data loader (Phase 28) both produce data in these shapes.
// ═══════════════════════════════════════════════════════════════

/** Hardware configuration displayed in the HardwareContext banner. */
export interface ChartHardware {
  cpu: string;
  cpu_cores?: number;
  gpu?: string;
  gpu_vram_gb?: number;
  ram_gb: number;
  os: string;
}

/** A single convergence data point with both quality metrics. */
export interface ChartConvergencePoint {
  samples: number;
  time_seconds: number;
  psnr?: number;
  ssim?: number;
}

/** A benchmark entry shaped for chart components (one renderer × one scene). */
export interface ChartBenchmarkEntry {
  id: string;
  renderer: string;
  renderer_name: string;
  scene: string;
  scene_name: string;
  render_time_seconds: number;
  peak_memory_mb?: number;
  psnr?: number;
  ssim?: number;
  convergence?: ChartConvergencePoint[];
}

/** The full benchmark dataset passed to chart components. */
export interface ChartBenchmarkDataset {
  hardware: ChartHardware;
  entries: ChartBenchmarkEntry[];
}

/** Available metrics in BenchmarkChart. */
export type BenchmarkMetric = "render_time" | "memory" | "psnr" | "ssim";

/** Grouping mode for BenchmarkChart bars. */
export type GroupByMode = "renderer" | "scene";

/** X-axis mode for ConvergencePlot. */
export type ConvergenceXAxis = "time" | "samples";
