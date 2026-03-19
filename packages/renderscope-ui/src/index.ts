/**
 * RenderScope UI — Reusable React components for rendering engine comparison.
 *
 * @packageDocumentation
 */

// ── CSS (extracted to dist/theme.css by Rollup) ──
import "./styles/theme.css";
import "./styles/components.css";
import "./components/TaxonomyGraph/graph-styles.css";

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
  // Image comparison types
  ComparisonImage,
  SliderOrientation,
  DiffMode,
  ColorMapName,
  ImageLoadState,
  ZoomPanState,
  NormalizedRegion,
  ImageMetrics,
  SSIMResult,
  // Taxonomy types
  TaxonomyData,
  TaxonomyNode,
  TaxonomyEdge,
  TaxonomyNodeType,
  TaxonomyEdgeType,
  ColorByMode,
  // Feature matrix types
  FeatureDefinition,
  FeatureCategory,
  FeatureMatrixRenderer,
  FeatureValue,
  FeatureMatrixProps,
  FeatureCellProps,
  FeatureGroupHeaderProps,
} from "./types";

// ── Image Comparison Components ──
export { ImageCompareSlider } from "./components/ImageCompare";
export type { ImageCompareSliderProps } from "./components/ImageCompare";

export { ImageDiff } from "./components/ImageCompare";
export type { ImageDiffProps } from "./components/ImageCompare";

export { ImageSSIMHeatmap } from "./components/ImageCompare";
export type { ImageSSIMHeatmapProps } from "./components/ImageCompare";

export { ImageToggle } from "./components/ImageCompare";
export type { ImageToggleProps } from "./components/ImageCompare";

export { ImageSideBySide } from "./components/ImageCompare";
export type { ImageSideBySideProps } from "./components/ImageCompare";

export { RegionZoom } from "./components/ImageCompare";
export type { RegionZoomProps } from "./components/ImageCompare";

// ── Taxonomy Graph ──
export { TaxonomyGraph } from "./components/TaxonomyGraph";
export type { TaxonomyGraphProps } from "./components/TaxonomyGraph";

// ── Feature Matrix ──
export { FeatureMatrix, FeatureCell, FeatureGroupHeader } from "./components/FeatureMatrix";

// ── Default Feature Data ──
export {
  RENDERSCOPE_FEATURE_CATEGORIES,
  getAllFeatureKeys,
  getFeatureLabel,
} from "./data/defaultFeatureCategories";

// ── Hooks ──
export { useImageLoader } from "./hooks";
export { usePixelSampler } from "./hooks";
export type { PixelValue, PixelPosition, UsePixelSamplerReturn } from "./hooks";
export { useResizeObserver } from "./hooks";
export { useSyncedZoom } from "./hooks";
export type { UseSyncedZoomReturn } from "./hooks";

// ── Utilities ──
export {
  getColor,
  getColorMap,
  COLOR_MAP_NAMES,
  computePSNR,
  computeSSIM,
  computeMSE,
  computeAbsoluteDiff,
  computeLuminanceDiff,
  computeAllMetrics,
  loadImageData,
  generateSSIMHeatmap,
} from "./utils";
export type { RGB, LoadedImage } from "./utils";
