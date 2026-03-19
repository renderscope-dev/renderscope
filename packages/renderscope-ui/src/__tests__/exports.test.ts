/**
 * Export verification tests.
 *
 * Ensures every documented public export is actually accessible from
 * the package entry point. If a type is missing, tsc --noEmit catches
 * it; if a value is missing, these runtime checks catch it.
 */

import { describe, it, expect } from "vitest";

import {
  // Version
  VERSION,
  // Constants
  TECHNIQUE_COLORS,
  // Image Comparison Components
  ImageCompareSlider,
  ImageDiff,
  ImageSSIMHeatmap,
  ImageToggle,
  ImageSideBySide,
  RegionZoom,
  // Taxonomy Graph
  TaxonomyGraph,
  // Feature Matrix
  FeatureMatrix,
  FeatureCell,
  FeatureGroupHeader,
  // Default Feature Data
  RENDERSCOPE_FEATURE_CATEGORIES,
  getAllFeatureKeys,
  getFeatureLabel,
  // Hooks
  useImageLoader,
  usePixelSampler,
  useResizeObserver,
  useSyncedZoom,
  // Utilities
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
} from "../index";

// Type-only imports to verify type exports compile
import type {
  RenderingTechnique,
  RendererStatus,
  Platform,
  RendererData,
  HardwareInfo,
  BenchmarkEntry,
  SceneData,
  ComparisonImage,
  TaxonomyData,
  TaxonomyNode,
  TaxonomyEdge,
  ColorByMode,
  FeatureCategory,
  FeatureMatrixRenderer,
  FeatureValue,
  TechniqueId,
  RGB,
  LoadedImage,
  PixelValue,
  PixelPosition,
  UsePixelSamplerReturn,
  UseSyncedZoomReturn,
  ImageCompareSliderProps,
  ImageDiffProps,
  ImageSSIMHeatmapProps,
  ImageToggleProps,
  ImageSideBySideProps,
  RegionZoomProps,
  TaxonomyGraphProps,
  FeatureMatrixProps,
  FeatureCellProps,
  FeatureGroupHeaderProps,
} from "../index";

describe("Export Verification", () => {
  describe("Version", () => {
    it("exports VERSION as a string", () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe("string");
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe("Constants", () => {
    it("exports TECHNIQUE_COLORS as an object", () => {
      expect(TECHNIQUE_COLORS).toBeDefined();
      expect(typeof TECHNIQUE_COLORS).toBe("object");
    });

    it("TECHNIQUE_COLORS has expected technique keys", () => {
      expect(TECHNIQUE_COLORS.path_tracing).toBeDefined();
      expect(TECHNIQUE_COLORS.rasterization).toBeDefined();
      expect(TECHNIQUE_COLORS.neural).toBeDefined();
      expect(TECHNIQUE_COLORS.differentiable).toBeDefined();
      expect(TECHNIQUE_COLORS.volume).toBeDefined();
    });

    it("TECHNIQUE_COLORS values are hex color strings", () => {
      for (const value of Object.values(TECHNIQUE_COLORS)) {
        expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe("Components", () => {
    it("exports all 6 image comparison components", () => {
      expect(ImageCompareSlider).toBeDefined();
      expect(typeof ImageCompareSlider).toBe("function");

      expect(ImageDiff).toBeDefined();
      expect(typeof ImageDiff).toBe("function");

      expect(ImageSSIMHeatmap).toBeDefined();
      expect(typeof ImageSSIMHeatmap).toBe("function");

      expect(ImageToggle).toBeDefined();
      expect(typeof ImageToggle).toBe("function");

      expect(ImageSideBySide).toBeDefined();
      expect(typeof ImageSideBySide).toBe("function");

      expect(RegionZoom).toBeDefined();
      expect(typeof RegionZoom).toBe("function");
    });

    it("exports TaxonomyGraph", () => {
      expect(TaxonomyGraph).toBeDefined();
      expect(typeof TaxonomyGraph).toBe("function");
    });

    it("exports Feature Matrix components", () => {
      expect(FeatureMatrix).toBeDefined();
      expect(typeof FeatureMatrix).toBe("function");

      expect(FeatureCell).toBeDefined();
      expect(typeof FeatureCell).toBe("function");

      expect(FeatureGroupHeader).toBeDefined();
      expect(typeof FeatureGroupHeader).toBe("function");
    });
  });

  describe("Default Feature Data", () => {
    it("exports RENDERSCOPE_FEATURE_CATEGORIES", () => {
      expect(RENDERSCOPE_FEATURE_CATEGORIES).toBeDefined();
      expect(Array.isArray(RENDERSCOPE_FEATURE_CATEGORIES)).toBe(true);
      expect(RENDERSCOPE_FEATURE_CATEGORIES.length).toBeGreaterThan(0);
    });

    it("exports getAllFeatureKeys as a function", () => {
      expect(getAllFeatureKeys).toBeDefined();
      expect(typeof getAllFeatureKeys).toBe("function");
    });

    it("exports getFeatureLabel as a function", () => {
      expect(getFeatureLabel).toBeDefined();
      expect(typeof getFeatureLabel).toBe("function");
    });
  });

  describe("Hooks", () => {
    it("exports all 4 hooks as functions", () => {
      expect(useImageLoader).toBeDefined();
      expect(typeof useImageLoader).toBe("function");

      expect(usePixelSampler).toBeDefined();
      expect(typeof usePixelSampler).toBe("function");

      expect(useResizeObserver).toBeDefined();
      expect(typeof useResizeObserver).toBe("function");

      expect(useSyncedZoom).toBeDefined();
      expect(typeof useSyncedZoom).toBe("function");
    });
  });

  describe("Utilities", () => {
    it("exports color map functions", () => {
      expect(getColor).toBeDefined();
      expect(typeof getColor).toBe("function");

      expect(getColorMap).toBeDefined();
      expect(typeof getColorMap).toBe("function");

      expect(COLOR_MAP_NAMES).toBeDefined();
      expect(Array.isArray(COLOR_MAP_NAMES)).toBe(true);
    });

    it("exports image processing functions", () => {
      expect(computePSNR).toBeDefined();
      expect(typeof computePSNR).toBe("function");

      expect(computeSSIM).toBeDefined();
      expect(typeof computeSSIM).toBe("function");

      expect(computeMSE).toBeDefined();
      expect(typeof computeMSE).toBe("function");

      expect(computeAbsoluteDiff).toBeDefined();
      expect(typeof computeAbsoluteDiff).toBe("function");

      expect(computeLuminanceDiff).toBeDefined();
      expect(typeof computeLuminanceDiff).toBe("function");

      expect(computeAllMetrics).toBeDefined();
      expect(typeof computeAllMetrics).toBe("function");

      expect(loadImageData).toBeDefined();
      expect(typeof loadImageData).toBe("function");

      expect(generateSSIMHeatmap).toBeDefined();
      expect(typeof generateSSIMHeatmap).toBe("function");
    });
  });

  describe("Type exports compile correctly", () => {
    it("type-level assertions (compile-time check)", () => {
      // These assignments verify that the types are correctly exported.
      // If any type is missing from exports, TypeScript will fail at compile time.
      const _technique: RenderingTechnique = "path_tracing";
      const _status: RendererStatus = "active";
      const _platform: Platform = "linux";
      const _colorBy: ColorByMode = "technique";
      const _techniqueId: TechniqueId = "path_tracing";
      const _featureValue: FeatureValue = true;

      // Suppress unused variable warnings
      void _technique;
      void _status;
      void _platform;
      void _colorBy;
      void _techniqueId;
      void _featureValue;

      // If we got here, all type exports are accessible
      expect(true).toBe(true);
    });

    it("complex type exports compile correctly", () => {
      // Verify structural types compile
      const _image: ComparisonImage = { src: "test.png", label: "Test" };
      const _taxData: TaxonomyData = { nodes: [], edges: [] };
      const _node: TaxonomyNode = { id: "a", type: "renderer", label: "A" };
      const _edge: TaxonomyEdge = { source: "a", target: "b", type: "belongs_to" };
      const _fc: FeatureCategory = { id: "x", label: "X", features: [] };
      const _fmr: FeatureMatrixRenderer = { id: "r", name: "R", features: {} };

      void _image;
      void _taxData;
      void _node;
      void _edge;
      void _fc;
      void _fmr;

      expect(true).toBe(true);
    });
  });
});
