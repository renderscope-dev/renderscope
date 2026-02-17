/**
 * Shared TypeScript types for the renderscope-ui component library.
 *
 * These types match the JSON schemas used by the RenderScope data layer
 * and are used as prop types for components like FeatureMatrix,
 * BenchmarkChart, and TaxonomyGraph.
 *
 * @packageDocumentation
 */

export type {
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
} from "./renderer";

export type {
  HardwareInfo,
  RenderSettings,
  QualityMetrics,
  ConvergenceDataPoint,
  BenchmarkResults,
  BenchmarkEntry,
  BenchmarkComparison,
} from "./benchmark";

export type {
  SceneComplexity,
  LightType,
  SceneTestCategory,
  CameraPosition,
  SceneData,
} from "./scene";
