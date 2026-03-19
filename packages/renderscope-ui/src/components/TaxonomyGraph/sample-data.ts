/**
 * Sample taxonomy data for Storybook stories.
 *
 * Realistic node/edge data representing actual rendering engines
 * and their relationships. Used for visual demonstrations only.
 *
 * @internal Not part of the public API.
 */

import type { TaxonomyData } from "../../types/taxonomy";

/** Standard sample data: ~18 nodes, ~28 edges. */
export const sampleTaxonomyData: TaxonomyData = {
  nodes: [
    // ── Category nodes ──
    {
      id: "path_tracing",
      type: "category",
      label: "Path Tracing",
      description: "Unbiased physically-based rendering via random light path sampling.",
      technique: "path_tracing",
    },
    {
      id: "rasterization",
      type: "category",
      label: "Rasterization",
      description: "Real-time rendering by projecting triangles onto screen space.",
      technique: "rasterization",
    },
    {
      id: "neural",
      type: "category",
      label: "Neural Rendering",
      description: "Neural networks for novel view synthesis and scene representation.",
      technique: "neural",
    },
    {
      id: "gaussian_splatting",
      type: "category",
      label: "Gaussian Splatting",
      description: "3D Gaussian-based real-time radiance field rendering.",
      technique: "gaussian_splatting",
    },
    {
      id: "educational",
      type: "category",
      label: "Educational",
      description: "Renderers designed for teaching computer graphics concepts.",
      technique: "educational",
    },

    // ── Renderer nodes ──
    {
      id: "pbrt",
      type: "renderer",
      label: "PBRT-v4",
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
      id: "luxcorerender",
      type: "renderer",
      label: "LuxCoreRender",
      renderer_id: "luxcorerender",
      technique: "path_tracing",
      stars: 1400,
      slug: "luxcorerender",
    },
    {
      id: "appleseed",
      type: "renderer",
      label: "appleseed",
      renderer_id: "appleseed",
      technique: "path_tracing",
      stars: 2200,
      slug: "appleseed",
    },
    {
      id: "blender-cycles",
      type: "renderer",
      label: "Blender Cycles",
      renderer_id: "blender-cycles",
      technique: "path_tracing",
      stars: 12500,
      slug: "blender-cycles",
    },
    {
      id: "filament",
      type: "renderer",
      label: "Filament",
      renderer_id: "filament",
      technique: "rasterization",
      stars: 17800,
      slug: "filament",
    },
    {
      id: "ospray",
      type: "renderer",
      label: "OSPRay",
      renderer_id: "ospray",
      technique: "path_tracing",
      stars: 1000,
      slug: "ospray",
    },
    {
      id: "nerfstudio",
      type: "renderer",
      label: "Nerfstudio",
      renderer_id: "nerfstudio",
      technique: "neural",
      stars: 9500,
      slug: "nerfstudio",
    },
    {
      id: "instant-ngp",
      type: "renderer",
      label: "Instant NGP",
      renderer_id: "instant-ngp",
      technique: "neural",
      stars: 15600,
      slug: "instant-ngp",
    },
    {
      id: "gaussian-splatting-3d",
      type: "renderer",
      label: "3D Gaussian Splatting",
      renderer_id: "gaussian-splatting-3d",
      technique: "gaussian_splatting",
      stars: 14200,
      slug: "gaussian-splatting-3d",
    },
    {
      id: "gsplat",
      type: "renderer",
      label: "gsplat",
      renderer_id: "gsplat",
      technique: "gaussian_splatting",
      stars: 1800,
      slug: "gsplat",
    },
    {
      id: "tinyraytracer",
      type: "renderer",
      label: "tinyraytracer",
      renderer_id: "tinyraytracer",
      technique: "educational",
      stars: 5200,
      slug: "tinyraytracer",
    },
    {
      id: "raytracing-in-one-weekend",
      type: "renderer",
      label: "Ray Tracing in One Weekend",
      renderer_id: "raytracing-in-one-weekend",
      technique: "educational",
      stars: 8300,
      slug: "raytracing-in-one-weekend",
    },
  ],
  edges: [
    // Category memberships
    { source: "pbrt", target: "path_tracing", type: "belongs_to" },
    { source: "mitsuba3", target: "path_tracing", type: "belongs_to" },
    { source: "luxcorerender", target: "path_tracing", type: "belongs_to" },
    { source: "appleseed", target: "path_tracing", type: "belongs_to" },
    { source: "blender-cycles", target: "path_tracing", type: "belongs_to" },
    { source: "ospray", target: "path_tracing", type: "belongs_to" },
    { source: "filament", target: "rasterization", type: "belongs_to" },
    { source: "nerfstudio", target: "neural", type: "belongs_to" },
    { source: "instant-ngp", target: "neural", type: "belongs_to" },
    { source: "gaussian-splatting-3d", target: "gaussian_splatting", type: "belongs_to" },
    { source: "gsplat", target: "gaussian_splatting", type: "belongs_to" },
    { source: "tinyraytracer", target: "educational", type: "belongs_to" },
    { source: "raytracing-in-one-weekend", target: "educational", type: "belongs_to" },

    // Inspiration & heritage
    { source: "mitsuba3", target: "pbrt", type: "inspired_by", label: "Informed by PBRT" },
    { source: "luxcorerender", target: "pbrt", type: "inspired_by" },
    { source: "raytracing-in-one-weekend", target: "pbrt", type: "inspired_by" },

    // Fork / derivative
    { source: "gsplat", target: "gaussian-splatting-3d", type: "forked_from" },

    // Uses backend
    { source: "nerfstudio", target: "instant-ngp", type: "uses_backend", label: "Uses as backend" },

    // Shared formats
    { source: "pbrt", target: "mitsuba3", type: "shared_format", label: "PBRT scene format" },
    { source: "appleseed", target: "blender-cycles", type: "shared_format", label: "glTF" },
    { source: "filament", target: "blender-cycles", type: "shared_format", label: "glTF" },

    // Same ecosystem
    { source: "nerfstudio", target: "gaussian-splatting-3d", type: "same_ecosystem" },
    { source: "instant-ngp", target: "gaussian-splatting-3d", type: "same_ecosystem" },
    { source: "pbrt", target: "appleseed", type: "same_ecosystem" },

    // Also-belongs
    { source: "blender-cycles", target: "rasterization", type: "also_belongs_to" },
    { source: "ospray", target: "rasterization", type: "also_belongs_to" },
  ],
};

/** Minimal sample data: 4 nodes, 3 edges. */
export const minimalTaxonomyData: TaxonomyData = {
  nodes: [
    {
      id: "path_tracing",
      type: "category",
      label: "Path Tracing",
      description: "Physically-based light transport simulation.",
      technique: "path_tracing",
    },
    {
      id: "pbrt",
      type: "renderer",
      label: "PBRT-v4",
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
      id: "luxcorerender",
      type: "renderer",
      label: "LuxCoreRender",
      renderer_id: "luxcorerender",
      technique: "path_tracing",
      stars: 1400,
      slug: "luxcorerender",
    },
  ],
  edges: [
    { source: "pbrt", target: "path_tracing", type: "belongs_to" },
    { source: "mitsuba3", target: "path_tracing", type: "belongs_to" },
    { source: "luxcorerender", target: "path_tracing", type: "belongs_to" },
  ],
};

/** Dense sample data: 40+ nodes for performance stress testing. */
export const denseTaxonomyData: TaxonomyData = (() => {
  // Start with all standard sample nodes and edges
  const nodes = [...sampleTaxonomyData.nodes];
  const edges = [...sampleTaxonomyData.edges];

  // Add extra category
  nodes.push({
    id: "volume_rendering",
    type: "category",
    label: "Volume Rendering",
    description: "Direct volume rendering for scientific visualization.",
    technique: "volume_rendering",
  });

  nodes.push({
    id: "differentiable",
    type: "category",
    label: "Differentiable",
    description: "Differentiable rendering for inverse graphics optimization.",
    technique: "differentiable",
  });

  // Generate additional renderer nodes
  const extraRenderers = [
    { id: "tungsten", label: "Tungsten", technique: "path_tracing", stars: 1700 },
    { id: "yocto-gl", label: "Yocto/GL", technique: "path_tracing", stars: 2800 },
    { id: "embree", label: "Embree", technique: "path_tracing", stars: 3400 },
    { id: "radeon-prorender", label: "Radeon ProRender", technique: "path_tracing", stars: 850 },
    { id: "arnold", label: "Arnold", technique: "path_tracing", stars: 600 },
    { id: "vray", label: "V-Ray", technique: "path_tracing", stars: 320 },
    { id: "corona", label: "Corona", technique: "path_tracing", stars: 180 },
    { id: "redshift", label: "Redshift", technique: "path_tracing", stars: 150 },
    { id: "ogre", label: "OGRE", technique: "rasterization", stars: 3800 },
    { id: "bgfx", label: "bgfx", technique: "rasterization", stars: 14500 },
    { id: "wgpu", label: "wgpu", technique: "rasterization", stars: 12000 },
    { id: "three-js", label: "Three.js", technique: "rasterization", stars: 100500 },
    { id: "babylon-js", label: "Babylon.js", technique: "rasterization", stars: 23000 },
    { id: "nvdiffrast", label: "nvdiffrast", technique: "differentiable", stars: 1300 },
    { id: "pytorch3d", label: "PyTorch3D", technique: "differentiable", stars: 8600 },
    { id: "kaolin", label: "Kaolin", technique: "differentiable", stars: 4400 },
    { id: "diff-gaussian-rasterization", label: "Diff Gaussian", technique: "differentiable", stars: 900 },
    { id: "paraview", label: "ParaView", technique: "volume_rendering", stars: 4200 },
    { id: "vtk", label: "VTK", technique: "volume_rendering", stars: 2600 },
    { id: "voreen", label: "Voreen", technique: "volume_rendering", stars: 220 },
    { id: "inviwo", label: "Inviwo", technique: "volume_rendering", stars: 580 },
    { id: "smallpt", label: "smallpt", technique: "educational", stars: 350 },
    { id: "scratchapixel", label: "Scratchapixel", technique: "educational", stars: 1200 },
  ];

  for (const r of extraRenderers) {
    nodes.push({
      id: r.id,
      type: "renderer",
      label: r.label,
      renderer_id: r.id,
      technique: r.technique,
      stars: r.stars,
      slug: r.id,
    });

    // Connect to category
    edges.push({
      source: r.id,
      target: r.technique,
      type: "belongs_to",
    });
  }

  // Add extra cross-edges
  edges.push(
    { source: "embree", target: "ospray", type: "uses_backend" },
    { source: "tungsten", target: "pbrt", type: "inspired_by" },
    { source: "yocto-gl", target: "pbrt", type: "inspired_by" },
    { source: "nvdiffrast", target: "pytorch3d", type: "same_ecosystem" },
    { source: "kaolin", target: "pytorch3d", type: "same_ecosystem" },
    { source: "diff-gaussian-rasterization", target: "gaussian-splatting-3d", type: "uses_backend" },
    { source: "vtk", target: "paraview", type: "uses_backend" },
    { source: "three-js", target: "babylon-js", type: "same_ecosystem" },
    { source: "bgfx", target: "filament", type: "same_ecosystem" },
    { source: "ogre", target: "filament", type: "same_ecosystem" },
    { source: "wgpu", target: "filament", type: "shared_format" },
    { source: "smallpt", target: "raytracing-in-one-weekend", type: "same_ecosystem" },
    { source: "scratchapixel", target: "tinyraytracer", type: "same_ecosystem" },
    { source: "pytorch3d", target: "nerfstudio", type: "uses_backend" },
    { source: "radeon-prorender", target: "blender-cycles", type: "same_ecosystem" },
    { source: "corona", target: "vray", type: "same_ecosystem" },
    { source: "redshift", target: "blender-cycles", type: "shared_format" },
    { source: "arnold", target: "blender-cycles", type: "shared_format" },
    { source: "voreen", target: "inviwo", type: "same_ecosystem" },
  );

  return { nodes, edges };
})();

/** Language-based color data for the Custom Colors story. */
export const languageColorData: TaxonomyData = {
  nodes: [
    { id: "cpp", type: "category", label: "C++", technique: "C++", description: "Systems-level rendering engines." },
    { id: "python", type: "category", label: "Python", technique: "Python", description: "Python-based rendering tools." },
    { id: "rust", type: "category", label: "Rust", technique: "Rust", description: "Rust-based rendering engines." },
    { id: "javascript", type: "category", label: "JavaScript", technique: "JavaScript", description: "Web-based rendering." },
    { id: "pbrt", type: "renderer", label: "PBRT-v4", technique: "C++", stars: 4800, slug: "pbrt" },
    { id: "mitsuba3", type: "renderer", label: "Mitsuba 3", technique: "C++", stars: 2100, slug: "mitsuba3" },
    { id: "filament", type: "renderer", label: "Filament", technique: "C++", stars: 17800, slug: "filament" },
    { id: "embree", type: "renderer", label: "Embree", technique: "C++", stars: 3400, slug: "embree" },
    { id: "nerfstudio", type: "renderer", label: "Nerfstudio", technique: "Python", stars: 9500, slug: "nerfstudio" },
    { id: "pytorch3d", type: "renderer", label: "PyTorch3D", technique: "Python", stars: 8600, slug: "pytorch3d" },
    { id: "wgpu", type: "renderer", label: "wgpu", technique: "Rust", stars: 12000, slug: "wgpu" },
    { id: "three-js", type: "renderer", label: "Three.js", technique: "JavaScript", stars: 100500, slug: "three-js" },
    { id: "babylon-js", type: "renderer", label: "Babylon.js", technique: "JavaScript", stars: 23000, slug: "babylon-js" },
  ],
  edges: [
    { source: "pbrt", target: "cpp", type: "belongs_to" },
    { source: "mitsuba3", target: "cpp", type: "belongs_to" },
    { source: "filament", target: "cpp", type: "belongs_to" },
    { source: "embree", target: "cpp", type: "belongs_to" },
    { source: "nerfstudio", target: "python", type: "belongs_to" },
    { source: "pytorch3d", target: "python", type: "belongs_to" },
    { source: "wgpu", target: "rust", type: "belongs_to" },
    { source: "three-js", target: "javascript", type: "belongs_to" },
    { source: "babylon-js", target: "javascript", type: "belongs_to" },
    { source: "mitsuba3", target: "pbrt", type: "inspired_by" },
    { source: "three-js", target: "babylon-js", type: "same_ecosystem" },
    { source: "pytorch3d", target: "nerfstudio", type: "uses_backend" },
  ],
};
