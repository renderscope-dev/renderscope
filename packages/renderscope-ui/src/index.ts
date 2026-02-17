/**
 * RenderScope UI — Reusable React components for rendering engine comparison.
 *
 * @packageDocumentation
 */

// ── CSS theme (extracted to dist/theme.css by Rollup) ──
import "./styles/theme.css";

// ── Version ──
export { VERSION } from "./version";

// ── Constants ──
export { TECHNIQUE_COLORS } from "./constants";
export type { TechniqueId } from "./constants";

// ── Types ──
export type {
  // Renderer types
  RenderingTechnique,
  RendererStatus,
  Platform,
  GpuApi,
  SceneFormat,
  OutputFormat,
  RendererFeatures,
  RendererLinks,
  RendererGithub,
  RendererEditorial,
  RendererIntegration,
  RendererCommunity,
  RendererCitation,
  RendererData,
  // Benchmark types
  HardwareInfo,
  RenderSettings,
  QualityMetrics,
  ConvergenceDataPoint,
  BenchmarkResults,
  BenchmarkEntry,
  BenchmarkComparison,
  // Scene types
  SceneComplexity,
  LightType,
  SceneTestCategory,
  CameraPosition,
  SceneData,
} from "./types";

// ── Components ──
// Demo component (temporary — will be replaced by real components in Phase 22)
export { HelloRenderScope } from "./components/HelloRenderScope";
export type { HelloRenderScopeProps } from "./components/HelloRenderScope";
