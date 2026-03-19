/**
 * Shared mock data for all renderscope-ui tests.
 *
 * These mirror real RenderScope data structures and provide consistent,
 * realistic test data across all test files.
 */

import type {
  ComparisonImage,
  TaxonomyData,
  TaxonomyNode,
  TaxonomyEdge,
  FeatureCategory,
  FeatureMatrixRenderer,
} from "../types";

// ---------------------------------------------------------------------------
// Tiny 1×1 PNG data URI for image testing (avoids network requests)
// ---------------------------------------------------------------------------

/** A 1×1 transparent PNG. */
export const TRANSPARENT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** A 1×1 red PNG. */
export const RED_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

/** A 1×1 blue PNG. */
export const BLUE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// ---------------------------------------------------------------------------
// Comparison Images
// ---------------------------------------------------------------------------

export const mockLeftImage: ComparisonImage = {
  src: TRANSPARENT_PNG,
  label: "PBRT v4",
  metadata: {
    renderer: "pbrt",
    samples: "1024 SPP",
    time: "47.3s",
  },
};

export const mockRightImage: ComparisonImage = {
  src: RED_PNG,
  label: "Mitsuba 3",
  metadata: {
    renderer: "mitsuba3",
    samples: "1024 SPP",
    time: "52.1s",
  },
};

export const mockComparisonImages: ComparisonImage[] = [
  mockLeftImage,
  mockRightImage,
  {
    src: BLUE_PNG,
    label: "Blender Cycles",
    metadata: {
      renderer: "cycles",
      samples: "1024 SPP",
      time: "38.7s",
    },
  },
];

export const mockManyImages: ComparisonImage[] = Array.from(
  { length: 6 },
  (_, i) => ({
    src: TRANSPARENT_PNG,
    label: `Renderer ${i + 1}`,
    metadata: { renderer: `renderer-${i + 1}` },
  }),
);

export const mockSingleImage: ComparisonImage[] = [mockLeftImage];

// ---------------------------------------------------------------------------
// Feature Matrix Data
// ---------------------------------------------------------------------------

export const mockFeatureCategories: FeatureCategory[] = [
  {
    id: "rendering",
    label: "Rendering Capabilities",
    features: [
      {
        key: "global_illumination",
        label: "Global Illumination",
        description: "Indirect lighting computation",
      },
      {
        key: "path_tracing",
        label: "Path Tracing",
        description: "Monte Carlo path tracing",
      },
      {
        key: "volumetric",
        label: "Volumetric Rendering",
        description: "Participating media support",
      },
      {
        key: "subsurface_scattering",
        label: "Subsurface Scattering",
        description: "BSSRDF for translucent materials",
      },
    ],
  },
  {
    id: "formats",
    label: "Format Support",
    features: [
      {
        key: "gltf",
        label: "glTF",
        description: "GL Transmission Format support",
      },
      {
        key: "obj",
        label: "OBJ",
        description: "Wavefront OBJ format support",
      },
      {
        key: "exr_output",
        label: "EXR Output",
        description: "OpenEXR output format",
      },
    ],
  },
  {
    id: "api",
    label: "API & Ecosystem",
    features: [
      {
        key: "python_api",
        label: "Python API",
        description: "Usable from Python",
      },
      {
        key: "plugin_system",
        label: "Plugin System",
        description: "Supports extensions",
      },
    ],
  },
];

export const mockRenderers: FeatureMatrixRenderer[] = [
  {
    id: "pbrt",
    name: "PBRT v4",
    features: {
      global_illumination: true,
      path_tracing: true,
      volumetric: true,
      subsurface_scattering: true,
      gltf: false,
      obj: true,
      exr_output: true,
      python_api: false,
      plugin_system: true,
    },
  },
  {
    id: "mitsuba3",
    name: "Mitsuba 3",
    features: {
      global_illumination: true,
      path_tracing: true,
      volumetric: true,
      subsurface_scattering: true,
      gltf: true,
      obj: false,
      exr_output: true,
      python_api: true,
      plugin_system: true,
    },
  },
  {
    id: "cycles",
    name: "Blender Cycles",
    features: {
      global_illumination: true,
      path_tracing: true,
      volumetric: true,
      subsurface_scattering: true,
      gltf: true,
      obj: true,
      exr_output: true,
      python_api: true,
      plugin_system: false,
    },
  },
];

export const mockSingleRenderer: FeatureMatrixRenderer[] = [mockRenderers[0]!];

export const mockManyRenderers: FeatureMatrixRenderer[] = Array.from(
  { length: 15 },
  (_, i) => ({
    id: `renderer-${i + 1}`,
    name: `Renderer ${i + 1}`,
    features: {
      global_illumination: i % 2 === 0,
      path_tracing: i % 3 !== 0,
      volumetric: i % 4 === 0 ? null : i % 2 === 0,
      subsurface_scattering: false,
    },
  }),
);

// ---------------------------------------------------------------------------
// Taxonomy Data
// ---------------------------------------------------------------------------

export const mockTaxonomyNodes: TaxonomyNode[] = [
  {
    id: "path_tracing",
    type: "category",
    label: "Path Tracing",
    description: "Physically based unbiased rendering",
  },
  {
    id: "rasterization",
    type: "category",
    label: "Rasterization",
    description: "Real-time GPU rendering",
  },
  {
    id: "pbrt",
    type: "renderer",
    label: "PBRT v4",
    renderer_id: "pbrt",
    technique: "path_tracing",
    stars: 4800,
    slug: "pbrt",
  },
  {
    id: "mitsuba3",
    type: "renderer",
    label: "Mitsuba 3",
    renderer_id: "mitsuba3",
    technique: "path_tracing",
    stars: 2100,
    slug: "mitsuba3",
  },
  {
    id: "cycles",
    type: "renderer",
    label: "Blender Cycles",
    renderer_id: "cycles",
    technique: "path_tracing",
    stars: 12000,
    slug: "blender-cycles",
  },
  {
    id: "filament",
    type: "renderer",
    label: "Google Filament",
    renderer_id: "filament",
    technique: "rasterization",
    stars: 17000,
    slug: "filament",
  },
  {
    id: "threejs",
    type: "renderer",
    label: "three.js",
    renderer_id: "threejs",
    technique: "rasterization",
    stars: 98000,
    slug: "threejs",
  },
  {
    id: "ospray",
    type: "renderer",
    label: "Intel OSPRay",
    renderer_id: "ospray",
    technique: "path_tracing",
    stars: 1000,
    slug: "ospray",
  },
];

export const mockTaxonomyEdges: TaxonomyEdge[] = [
  { source: "pbrt", target: "path_tracing", type: "belongs_to" },
  { source: "mitsuba3", target: "path_tracing", type: "belongs_to" },
  { source: "cycles", target: "path_tracing", type: "belongs_to" },
  { source: "filament", target: "rasterization", type: "belongs_to" },
  { source: "threejs", target: "rasterization", type: "belongs_to" },
  { source: "ospray", target: "path_tracing", type: "belongs_to" },
  { source: "mitsuba3", target: "pbrt", type: "inspired_by", label: "Inspired by" },
];

export const mockTaxonomyData: TaxonomyData = {
  nodes: mockTaxonomyNodes,
  edges: mockTaxonomyEdges,
};

export const emptyTaxonomyData: TaxonomyData = {
  nodes: [],
  edges: [],
};

export const singleNodeTaxonomy: TaxonomyData = {
  nodes: [mockTaxonomyNodes[2]!],
  edges: [],
};

// ---------------------------------------------------------------------------
// ImageData helpers for metric tests
// ---------------------------------------------------------------------------

/**
 * Create an ImageData with all pixels set to a single RGBA color.
 */
export function createSolidImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a: number = 255,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return new ImageData(data, width, height);
}

/**
 * Create an ImageData with a gradient pattern for more realistic testing.
 */
export function createGradientImageData(
  width: number,
  height: number,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = Math.round((x / width) * 255);
      data[idx + 1] = Math.round((y / height) * 255);
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }
  return new ImageData(data, width, height);
}
