import type {
  ChartHardware,
  ChartBenchmarkEntry,
  ChartBenchmarkDataset,
  ChartConvergencePoint,
} from "@/types/benchmark";

// ═══════════════════════════════════════════════════════════════
// MOCK BENCHMARK DATA
//
// Realistic benchmark data for 5 renderers across 3 scenes.
// Used by the Performance tab until Phase 28 replaces it with
// real benchmark results. Values are chosen to be plausible for
// each renderer's known characteristics.
// ═══════════════════════════════════════════════════════════════

const SHARED_HARDWARE: ChartHardware = {
  cpu: "AMD Ryzen 9 7950X",
  cpu_cores: 16,
  gpu: "NVIDIA RTX 4080",
  gpu_vram_gb: 16,
  ram_gb: 64,
  os: "Ubuntu 22.04",
};

// ── Scenes ─────────────────────────────────────────────────────

interface SceneMeta {
  id: string;
  name: string;
}

const SCENES: SceneMeta[] = [
  { id: "cornell-box", name: "Cornell Box" },
  { id: "sponza-atrium", name: "Sponza Atrium" },
  { id: "stanford-bunny", name: "Stanford Bunny" },
];

// ── Renderer profiles ──────────────────────────────────────────

interface RendererProfile {
  id: string;
  name: string;
  /** Per-scene performance characteristics: [cornell, sponza, bunny] */
  renderTimes: [number, number, number];
  memoryMb: [number, number, number];
  psnr: [number, number, number];
  ssim: [number, number, number];
  /** Convergence curve shape parameters per scene */
  convergence: ConvergenceCurveParams[];
}

interface ConvergenceCurveParams {
  /** PSNR at 1 spp (starting quality) */
  psnrStart: number;
  /** PSNR at 1024 spp (final quality) */
  psnrEnd: number;
  /** SSIM at 1 spp */
  ssimStart: number;
  /** SSIM at 1024 spp */
  ssimEnd: number;
  /** Time at 1024 spp (total render time) */
  totalTime: number;
  /** Higher → steeper initial climb, more diminishing returns */
  steepness: number;
}

/**
 * Generate a convergence curve given shape parameters.
 * Uses a logarithmic model: quality = start + (end - start) * log(spp) / log(maxSpp)^steepness
 * This produces the characteristic "steep climb then plateau" pattern.
 */
function generateConvergenceCurve(
  params: ConvergenceCurveParams
): ChartConvergencePoint[] {
  const sampleCounts = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
  const maxLog = Math.log(1024);

  return sampleCounts.map((samples) => {
    // Normalized progress (0 to 1) with steepness shaping
    const logProgress = Math.log(Math.max(samples, 1)) / maxLog;
    const shaped = Math.pow(logProgress, 1 / params.steepness);

    const psnr =
      params.psnrStart + (params.psnrEnd - params.psnrStart) * shaped;
    const ssim =
      params.ssimStart + (params.ssimEnd - params.ssimStart) * shaped;

    // Time scales linearly with sample count
    const timeSeconds = (samples / 1024) * params.totalTime;

    return {
      samples,
      time_seconds: Math.round(timeSeconds * 1000) / 1000,
      psnr: Math.round(psnr * 10) / 10,
      ssim: Math.round(ssim * 10000) / 10000,
    };
  });
}

// Renderer performance profiles based on realistic characteristics

const RENDERER_PROFILES: RendererProfile[] = [
  {
    id: "pbrt",
    name: "PBRT v4",
    // PBRT: Reference renderer, high quality, moderate speed
    renderTimes: [23.4, 187.2, 42.8],
    memoryMb: [340, 1420, 520],
    psnr: [45.2, 41.8, 44.1],
    ssim: [0.9991, 0.9972, 0.9986],
    convergence: [
      { psnrStart: 14.1, psnrEnd: 45.2, ssimStart: 0.42, ssimEnd: 0.9991, totalTime: 23.4, steepness: 1.3 },
      { psnrStart: 12.8, psnrEnd: 41.8, ssimStart: 0.38, ssimEnd: 0.9972, totalTime: 187.2, steepness: 1.2 },
      { psnrStart: 13.5, psnrEnd: 44.1, ssimStart: 0.40, ssimEnd: 0.9986, totalTime: 42.8, steepness: 1.3 },
    ],
  },
  {
    id: "mitsuba3",
    name: "Mitsuba 3",
    // Mitsuba 3: Differentiable, slightly slower but very high quality
    renderTimes: [28.7, 215.4, 51.3],
    memoryMb: [410, 1680, 610],
    psnr: [46.1, 42.5, 45.0],
    ssim: [0.9993, 0.9978, 0.9989],
    convergence: [
      { psnrStart: 15.2, psnrEnd: 46.1, ssimStart: 0.45, ssimEnd: 0.9993, totalTime: 28.7, steepness: 1.4 },
      { psnrStart: 13.6, psnrEnd: 42.5, ssimStart: 0.41, ssimEnd: 0.9978, totalTime: 215.4, steepness: 1.3 },
      { psnrStart: 14.3, psnrEnd: 45.0, ssimStart: 0.43, ssimEnd: 0.9989, totalTime: 51.3, steepness: 1.4 },
    ],
  },
  {
    id: "blender-cycles",
    name: "Blender Cycles",
    // Cycles: GPU-accelerated, fast but slightly lower precision
    renderTimes: [15.8, 98.6, 27.4],
    memoryMb: [520, 2180, 740],
    psnr: [42.8, 39.6, 41.9],
    ssim: [0.9984, 0.9961, 0.9979],
    convergence: [
      { psnrStart: 16.4, psnrEnd: 42.8, ssimStart: 0.48, ssimEnd: 0.9984, totalTime: 15.8, steepness: 1.6 },
      { psnrStart: 14.2, psnrEnd: 39.6, ssimStart: 0.43, ssimEnd: 0.9961, totalTime: 98.6, steepness: 1.5 },
      { psnrStart: 15.1, psnrEnd: 41.9, ssimStart: 0.45, ssimEnd: 0.9979, totalTime: 27.4, steepness: 1.5 },
    ],
  },
  {
    id: "luxcorerender",
    name: "LuxCoreRender",
    // LuxCore: Physically accurate, slower, high quality
    renderTimes: [38.2, 278.5, 67.1],
    memoryMb: [380, 1560, 560],
    psnr: [44.8, 41.2, 43.7],
    ssim: [0.999, 0.997, 0.9984],
    convergence: [
      { psnrStart: 13.8, psnrEnd: 44.8, ssimStart: 0.41, ssimEnd: 0.999, totalTime: 38.2, steepness: 1.2 },
      { psnrStart: 12.4, psnrEnd: 41.2, ssimStart: 0.37, ssimEnd: 0.997, totalTime: 278.5, steepness: 1.1 },
      { psnrStart: 13.1, psnrEnd: 43.7, ssimStart: 0.39, ssimEnd: 0.9984, totalTime: 67.1, steepness: 1.2 },
    ],
  },
  {
    id: "appleseed",
    name: "appleseed",
    // appleseed: Production quality, moderate speed, lower memory
    renderTimes: [31.5, 242.8, 58.6],
    memoryMb: [280, 1180, 440],
    psnr: [43.5, 40.1, 42.6],
    ssim: [0.9987, 0.9965, 0.9981],
    convergence: [
      { psnrStart: 13.2, psnrEnd: 43.5, ssimStart: 0.40, ssimEnd: 0.9987, totalTime: 31.5, steepness: 1.25 },
      { psnrStart: 11.9, psnrEnd: 40.1, ssimStart: 0.36, ssimEnd: 0.9965, totalTime: 242.8, steepness: 1.15 },
      { psnrStart: 12.6, psnrEnd: 42.6, ssimStart: 0.38, ssimEnd: 0.9981, totalTime: 58.6, steepness: 1.2 },
    ],
  },
];

/**
 * Generate the full set of mock benchmark entries.
 */
function generateAllEntries(): ChartBenchmarkEntry[] {
  const entries: ChartBenchmarkEntry[] = [];

  for (const profile of RENDERER_PROFILES) {
    for (let si = 0; si < SCENES.length; si++) {
      const scene = SCENES[si]!;
      entries.push({
        id: `${scene.id}-${profile.id}`,
        renderer: profile.id,
        renderer_name: profile.name,
        scene: scene.id,
        scene_name: scene.name,
        render_time_seconds: profile.renderTimes[si]!,
        peak_memory_mb: profile.memoryMb[si]!,
        psnr: profile.psnr[si]!,
        ssim: profile.ssim[si]!,
        convergence: generateConvergenceCurve(profile.convergence[si]!),
      });
    }
  }

  return entries;
}

// Pre-compute once — this module is imported at render time
const ALL_ENTRIES = generateAllEntries();

/**
 * Returns benchmark data for the given renderer IDs across all standard scenes.
 * Unknown renderer IDs are silently excluded.
 */
export function getMockBenchmarkData(
  rendererIds: string[]
): ChartBenchmarkDataset {
  const idSet = new Set(rendererIds);
  const filtered = ALL_ENTRIES.filter((e) => idSet.has(e.renderer));

  return {
    hardware: SHARED_HARDWARE,
    entries: filtered,
  };
}

// ── Renderer chart colors ──────────────────────────────────────

/**
 * Stable, visually distinct colors for known renderers.
 * Chosen to be readable on dark backgrounds and loosely grouped
 * by technique family (path tracers → blue/cyan/teal range).
 */
const RENDERER_COLORS: Record<string, string> = {
  pbrt: "#3b82f6",           // Blue — reference path tracer
  mitsuba3: "#a855f7",       // Purple — differentiable
  "blender-cycles": "#f59e0b", // Amber — production workhorse
  luxcorerender: "#06b6d4",  // Cyan — physically-based
  appleseed: "#10b981",      // Emerald — open-source production
  filament: "#84cc16",       // Lime — real-time PBR
  ospray: "#f97316",         // Orange — scientific vis
  "blender-eevee": "#ec4899", // Pink — real-time
  "radeon-prorender": "#ef4444", // Red — AMD ecosystem
  povray: "#8b5cf6",         // Violet — classic ray tracer
};

/**
 * Returns a stable hex color for the given renderer ID.
 * Uses a deterministic hash-to-color fallback for unknown renderers.
 */
export function getRendererChartColor(rendererId: string): string {
  const known = RENDERER_COLORS[rendererId];
  if (known) return known;

  // Deterministic fallback: hash the renderer ID to a hue
  let hash = 0;
  for (let i = 0; i < rendererId.length; i++) {
    hash = rendererId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}
