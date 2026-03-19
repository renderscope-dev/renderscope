/**
 * Default feature categories used by the RenderScope web app.
 *
 * Pass this to `<FeatureMatrix features={RENDERSCOPE_FEATURE_CATEGORIES} />`
 * for the standard RenderScope comparison layout.
 *
 * Consumers with different data shapes can provide their own categories
 * instead — the FeatureMatrix accepts any `FeatureCategory[]`.
 */

import type { FeatureCategory } from "../types/feature-matrix";

export const RENDERSCOPE_FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: "rendering",
    label: "Rendering Capabilities",
    features: [
      {
        key: "global_illumination",
        label: "Global Illumination",
        description:
          "Computes indirect lighting \u2014 light bouncing between surfaces",
      },
      {
        key: "path_tracing",
        label: "Path Tracing",
        description:
          "Unbiased Monte Carlo path tracing for physically accurate results",
      },
      {
        key: "bidirectional_pt",
        label: "Bidirectional Path Tracing",
        description:
          "Traces paths from both the camera and light sources for better convergence on difficult lighting",
      },
      {
        key: "metropolis_lt",
        label: "Metropolis Light Transport",
        description:
          "MLT \u2014 mutation-based sampling that excels at finding difficult light paths (caustics, indirect)",
      },
      {
        key: "photon_mapping",
        label: "Photon Mapping",
        description:
          "Two-pass algorithm using photon maps \u2014 efficient for caustics and participating media",
      },
      {
        key: "volumetric",
        label: "Volumetric Rendering",
        description:
          "Participating media support \u2014 fog, smoke, clouds, subsurface volumes",
      },
      {
        key: "subsurface_scattering",
        label: "Subsurface Scattering",
        description:
          "BSSRDF \u2014 light penetrating and scattering within translucent materials (skin, wax, marble)",
      },
      {
        key: "caustics",
        label: "Caustics",
        description:
          "Focused light patterns from specular-diffuse paths (light through glass, reflections from water)",
      },
      {
        key: "spectral_rendering",
        label: "Spectral Rendering",
        description:
          "Full spectral simulation beyond RGB \u2014 enables dispersion, fluorescence, and accurate color science",
      },
      {
        key: "polarization",
        label: "Polarization",
        description:
          "Polarization-aware light transport \u2014 relevant for optical simulation and scientific rendering",
      },
      {
        key: "motion_blur",
        label: "Motion Blur",
        description:
          "Camera or object motion blur during exposure time",
      },
      {
        key: "depth_of_field",
        label: "Depth of Field",
        description:
          "Thin-lens or physical camera DOF simulation",
      },
      {
        key: "adaptive_sampling",
        label: "Adaptive Sampling",
        description:
          "Spatially adaptive sample allocation \u2014 more samples where noise is highest",
      },
      {
        key: "denoiser_builtin",
        label: "Built-in Denoiser",
        description:
          "Integrated AI or NLM denoiser to reduce noise without additional samples",
      },
      {
        key: "instancing",
        label: "Geometry Instancing",
        description:
          "Memory-efficient instancing for scenes with repeated geometry",
      },
      {
        key: "out_of_core",
        label: "Out-of-Core Rendering",
        description:
          "Can render scenes larger than available RAM by streaming geometry",
      },
    ],
  },
  {
    id: "gpu_hardware",
    label: "GPU & Hardware",
    features: [
      {
        key: "gpu_rendering",
        label: "GPU Rendering",
        description:
          "Can execute rendering on a GPU for acceleration",
      },
      {
        key: "multi_gpu",
        label: "Multi-GPU",
        description:
          "Supports distributing work across multiple GPUs",
      },
      {
        key: "hardware_ray_tracing",
        label: "Hardware Ray Tracing",
        description:
          "Uses dedicated RT cores (OptiX, DXR, Vulkan RT) for acceleration",
      },
      {
        key: "network_rendering",
        label: "Network / Distributed Rendering",
        description:
          "Can distribute rendering across multiple machines over a network",
      },
    ],
  },
  {
    id: "differentiable_ml",
    label: "Differentiable & ML",
    features: [
      {
        key: "differentiable",
        label: "Differentiable Rendering",
        description:
          "Supports gradient computation through the rendering pipeline",
      },
      {
        key: "inverse_rendering",
        label: "Inverse Rendering",
        description:
          "Can optimize scene parameters (materials, lighting, geometry) from images",
      },
      {
        key: "neural_acceleration",
        label: "Neural Acceleration",
        description:
          "Uses neural networks for acceleration (e.g., neural importance sampling, learned denoising)",
      },
    ],
  },
  {
    id: "realtime",
    label: "Real-Time Features",
    features: [
      {
        key: "real_time_preview",
        label: "Real-Time Preview",
        description:
          "Interactive preview at reasonable frame rates during authoring",
      },
      {
        key: "pbr_materials",
        label: "PBR Materials",
        description:
          "Physically based material model (metallic-roughness or specular-glossiness)",
      },
      {
        key: "hdri_environment",
        label: "HDRI Environment Lighting",
        description:
          "High dynamic range environment maps for image-based lighting",
      },
      {
        key: "shadow_mapping",
        label: "Shadow Mapping",
        description:
          "Real-time shadow maps (as opposed to ray-traced shadows)",
      },
      {
        key: "screen_space_effects",
        label: "Screen-Space Effects",
        description:
          "SSAO, SSR, screen-space shadows, and similar post-process effects",
      },
      {
        key: "lod_system",
        label: "Level of Detail (LOD)",
        description:
          "Automatic level-of-detail management for performance optimization",
      },
      {
        key: "animation_support",
        label: "Animation Support",
        description:
          "Keyframe and/or skeletal animation playback",
      },
    ],
  },
  {
    id: "api_ecosystem",
    label: "API & Ecosystem",
    features: [
      {
        key: "python_api",
        label: "Python API",
        description:
          "Usable from Python \u2014 scripting, automation, Jupyter integration",
      },
      {
        key: "c_cpp_api",
        label: "C/C++ API",
        description:
          "Usable from C or C++ \u2014 native integration",
      },
      {
        key: "rust_api",
        label: "Rust API",
        description:
          "Usable from Rust \u2014 native integration",
      },
      {
        key: "javascript_api",
        label: "JavaScript API",
        description:
          "Usable from JavaScript \u2014 browser or Node.js",
      },
      {
        key: "scene_editor_gui",
        label: "Built-in Scene Editor",
        description:
          "Has its own GUI for scene editing and material authoring",
      },
      {
        key: "plugin_system",
        label: "Plugin / Extension System",
        description:
          "Supports community plugins or extensions for adding integrators, materials, etc.",
      },
      {
        key: "open_shading_language",
        label: "Open Shading Language (OSL)",
        description:
          "Supports OSL shaders for material authoring",
      },
      {
        key: "materialx",
        label: "MaterialX",
        description:
          "Supports the MaterialX material exchange format",
      },
    ],
  },
];

/**
 * Flatten all feature keys from a set of categories, in display order.
 * Useful for CSV export and iteration.
 */
export function getAllFeatureKeys(categories: FeatureCategory[]): string[] {
  return categories.flatMap((cat) => cat.features.map((f) => f.key));
}

/**
 * Look up a feature's human-readable label by its key.
 * Returns the raw key as fallback if not found.
 */
export function getFeatureLabel(
  categories: FeatureCategory[],
  key: string,
): string {
  for (const cat of categories) {
    const found = cat.features.find((f) => f.key === key);
    if (found) return found.label;
  }
  return key;
}
