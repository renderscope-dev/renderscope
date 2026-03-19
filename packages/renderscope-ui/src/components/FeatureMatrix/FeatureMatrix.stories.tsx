/**
 * Storybook stories for the FeatureMatrix component.
 *
 * Demonstrates every prop combination and use case with realistic
 * renderer data from the RenderScope ecosystem.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { FeatureMatrix } from "./FeatureMatrix";
import { RENDERSCOPE_FEATURE_CATEGORIES } from "../../data/defaultFeatureCategories";
import type {
  FeatureMatrixRenderer,
  FeatureCategory,
} from "../../types/feature-matrix";

/* ── Sample renderer data (realistic feature values) ── */

const PBRT: FeatureMatrixRenderer = {
  id: "pbrt",
  name: "PBRT v4",
  features: {
    global_illumination: true,
    path_tracing: true,
    bidirectional_pt: true,
    metropolis_lt: true,
    photon_mapping: false,
    volumetric: true,
    subsurface_scattering: true,
    caustics: true,
    spectral_rendering: true,
    polarization: false,
    motion_blur: true,
    depth_of_field: true,
    adaptive_sampling: true,
    denoiser_builtin: false,
    instancing: true,
    out_of_core: false,
    gpu_rendering: true,
    multi_gpu: false,
    hardware_ray_tracing: true,
    network_rendering: false,
    differentiable: false,
    inverse_rendering: false,
    neural_acceleration: false,
    real_time_preview: false,
    pbr_materials: true,
    hdri_environment: true,
    shadow_mapping: false,
    screen_space_effects: false,
    lod_system: false,
    animation_support: true,
    python_api: false,
    c_cpp_api: true,
    rust_api: false,
    javascript_api: false,
    scene_editor_gui: false,
    plugin_system: false,
    open_shading_language: false,
    materialx: false,
  },
};

const MITSUBA: FeatureMatrixRenderer = {
  id: "mitsuba3",
  name: "Mitsuba 3",
  features: {
    global_illumination: true,
    path_tracing: true,
    bidirectional_pt: true,
    metropolis_lt: false,
    photon_mapping: false,
    volumetric: true,
    subsurface_scattering: true,
    caustics: true,
    spectral_rendering: true,
    polarization: true,
    motion_blur: true,
    depth_of_field: true,
    adaptive_sampling: false,
    denoiser_builtin: false,
    instancing: true,
    out_of_core: false,
    gpu_rendering: true,
    multi_gpu: false,
    hardware_ray_tracing: false,
    network_rendering: false,
    differentiable: true,
    inverse_rendering: true,
    neural_acceleration: false,
    real_time_preview: false,
    pbr_materials: true,
    hdri_environment: true,
    shadow_mapping: false,
    screen_space_effects: false,
    lod_system: false,
    animation_support: false,
    python_api: true,
    c_cpp_api: true,
    rust_api: false,
    javascript_api: false,
    scene_editor_gui: false,
    plugin_system: true,
    open_shading_language: false,
    materialx: false,
  },
};

const CYCLES: FeatureMatrixRenderer = {
  id: "blender-cycles",
  name: "Blender Cycles",
  features: {
    global_illumination: true,
    path_tracing: true,
    bidirectional_pt: false,
    metropolis_lt: false,
    photon_mapping: false,
    volumetric: true,
    subsurface_scattering: true,
    caustics: true,
    spectral_rendering: false,
    polarization: false,
    motion_blur: true,
    depth_of_field: true,
    adaptive_sampling: true,
    denoiser_builtin: true,
    instancing: true,
    out_of_core: true,
    gpu_rendering: true,
    multi_gpu: true,
    hardware_ray_tracing: true,
    network_rendering: true,
    differentiable: false,
    inverse_rendering: false,
    neural_acceleration: false,
    real_time_preview: true,
    pbr_materials: true,
    hdri_environment: true,
    shadow_mapping: false,
    screen_space_effects: false,
    lod_system: false,
    animation_support: true,
    python_api: true,
    c_cpp_api: true,
    rust_api: false,
    javascript_api: false,
    scene_editor_gui: true,
    plugin_system: true,
    open_shading_language: true,
    materialx: false,
  },
};

const LUXCORE: FeatureMatrixRenderer = {
  id: "luxcorerender",
  name: "LuxCoreRender",
  features: {
    global_illumination: true,
    path_tracing: true,
    bidirectional_pt: true,
    metropolis_lt: true,
    photon_mapping: true,
    volumetric: true,
    subsurface_scattering: true,
    caustics: true,
    spectral_rendering: true,
    polarization: false,
    motion_blur: true,
    depth_of_field: true,
    adaptive_sampling: true,
    denoiser_builtin: true,
    instancing: true,
    out_of_core: false,
    gpu_rendering: true,
    multi_gpu: true,
    hardware_ray_tracing: false,
    network_rendering: true,
    differentiable: false,
    inverse_rendering: false,
    neural_acceleration: false,
    real_time_preview: true,
    pbr_materials: true,
    hdri_environment: true,
    shadow_mapping: false,
    screen_space_effects: false,
    lod_system: false,
    animation_support: true,
    python_api: true,
    c_cpp_api: true,
    rust_api: false,
    javascript_api: false,
    scene_editor_gui: false,
    plugin_system: true,
    open_shading_language: false,
    materialx: false,
  },
};

const FILAMENT: FeatureMatrixRenderer = {
  id: "filament",
  name: "Google Filament",
  features: {
    global_illumination: false,
    path_tracing: false,
    bidirectional_pt: false,
    metropolis_lt: false,
    photon_mapping: false,
    volumetric: false,
    subsurface_scattering: false,
    caustics: false,
    spectral_rendering: false,
    polarization: false,
    motion_blur: false,
    depth_of_field: true,
    adaptive_sampling: false,
    denoiser_builtin: false,
    instancing: true,
    out_of_core: false,
    gpu_rendering: true,
    multi_gpu: false,
    hardware_ray_tracing: false,
    network_rendering: false,
    differentiable: false,
    inverse_rendering: false,
    neural_acceleration: false,
    real_time_preview: true,
    pbr_materials: true,
    hdri_environment: true,
    shadow_mapping: true,
    screen_space_effects: true,
    lod_system: true,
    animation_support: true,
    python_api: false,
    c_cpp_api: true,
    rust_api: false,
    javascript_api: true,
    scene_editor_gui: false,
    plugin_system: false,
    open_shading_language: false,
    materialx: false,
  },
};

const ALL_RENDERERS = [PBRT, MITSUBA, CYCLES, LUXCORE, FILAMENT];

/* ── Custom feature set for the "Custom Features" story ── */

const CUSTOM_FEATURES: FeatureCategory[] = [
  {
    id: "architecture",
    label: "Architecture",
    features: [
      { key: "gpu_accel", label: "GPU Acceleration", description: "Uses GPU for computation" },
      { key: "distributed", label: "Distributed Training", description: "Supports multi-node training" },
      { key: "mixed_precision", label: "Mixed Precision", description: "FP16/BF16 training support" },
    ],
  },
  {
    id: "data",
    label: "Data Handling",
    features: [
      { key: "streaming", label: "Data Streaming", description: "Supports streaming datasets" },
      { key: "augmentation", label: "Built-in Augmentation", description: "Has data augmentation primitives" },
    ],
  },
];

const CUSTOM_RENDERERS: FeatureMatrixRenderer[] = [
  {
    id: "framework-a",
    name: "Framework A",
    features: { gpu_accel: true, distributed: true, mixed_precision: true, streaming: true, augmentation: false },
  },
  {
    id: "framework-b",
    name: "Framework B",
    features: { gpu_accel: true, distributed: false, mixed_precision: true, streaming: false, augmentation: true },
  },
  {
    id: "framework-c",
    name: "Framework C",
    features: { gpu_accel: false, distributed: false, mixed_precision: false, streaming: true, augmentation: true },
  },
];

/* ── Meta ── */

const meta: Meta<typeof FeatureMatrix> = {
  title: "Components/FeatureMatrix",
  component: FeatureMatrix,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  argTypes: {
    exportable: { control: "boolean" },
    collapsible: { control: "boolean" },
    stickyHeader: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof FeatureMatrix>;

/* ── Stories ── */

/** Default: 3 renderers, all features, all props at defaults. */
export const Default: Story = {
  args: {
    renderers: [PBRT, MITSUBA, CYCLES],
    features: RENDERSCOPE_FEATURE_CATEGORIES,
  },
};

/** Minimal comparison with just 2 renderers. */
export const TwoRenderers: Story = {
  args: {
    renderers: [PBRT, MITSUBA],
    features: RENDERSCOPE_FEATURE_CATEGORIES,
  },
};

/** Maximum reasonable comparison — 5 renderers. Demonstrates horizontal scroll. */
export const FiveRenderers: Story = {
  args: {
    renderers: ALL_RENDERERS,
    features: RENDERSCOPE_FEATURE_CATEGORIES,
  },
};

/** Highlight Differences mode active — rows with identical values are dimmed. */
export const HighlightDifferences: Story = {
  render: () => {
    // We can't pre-set internal state, so we render with a note
    return (
      <div>
        <p style={{ color: "var(--rs-text-muted)", fontSize: 13, marginBottom: 12 }}>
          Toggle &ldquo;Highlight Differences&rdquo; to see rows with identical values dimmed.
        </p>
        <FeatureMatrix
          renderers={[PBRT, MITSUBA, CYCLES]}
          features={RENDERSCOPE_FEATURE_CATEGORIES}
        />
      </div>
    );
  },
};

/** Non-collapsible — table shown as a flat list without collapse controls. */
export const NonCollapsible: Story = {
  args: {
    renderers: [PBRT, MITSUBA, CYCLES],
    features: RENDERSCOPE_FEATURE_CATEGORIES,
    collapsible: false,
  },
};

/** No export buttons — toolbar shows only the highlight toggle. */
export const NoExport: Story = {
  args: {
    renderers: [PBRT, MITSUBA, CYCLES],
    features: RENDERSCOPE_FEATURE_CATEGORIES,
    exportable: false,
  },
};

/** Custom features — demonstrates non-RenderScope use case (e.g., ML frameworks). */
export const CustomFeatures: Story = {
  args: {
    renderers: CUSTOM_RENDERERS,
    features: CUSTOM_FEATURES,
  },
};

/** With callbacks — demonstrates interactive headers. */
export const WithCallbacks: Story = {
  args: {
    renderers: [PBRT, MITSUBA, CYCLES],
    features: RENDERSCOPE_FEATURE_CATEGORIES,
    onRendererClick: (id: string) => {
      // eslint-disable-next-line no-alert
      alert(`Clicked renderer: ${id}`);
    },
    onRendererRemove: (id: string) => {
      // eslint-disable-next-line no-alert
      alert(`Remove renderer: ${id}`);
    },
  },
};

/** Custom theme — overridden CSS variables for a blue/teal tinted look. */
export const CustomTheme: Story = {
  render: () => (
    <div
      style={{
        // @ts-expect-error CSS custom properties are valid inline
        "--rs-bg-card": "#0d1b2a",
        "--rs-bg-elevated": "#1b2838",
        "--rs-bg-hover": "#243447",
        "--rs-border": "#2a3f55",
        "--rs-text": "#e0f0ff",
        "--rs-text-muted": "#7a9bb8",
        "--rs-text-dim": "#4a6a85",
        "--rs-primary": "#00bcd4",
        "--rs-feature-supported": "#4dd0e1",
        "--rs-feature-supported-bg": "rgba(77, 208, 225, 0.08)",
        "--rs-feature-unsupported": "#ff8a80",
        "--rs-feature-unsupported-bg": "rgba(255, 138, 128, 0.06)",
      }}
    >
      <FeatureMatrix
        renderers={[PBRT, MITSUBA, CYCLES]}
        features={RENDERSCOPE_FEATURE_CATEGORIES}
      />
    </div>
  ),
};

/** Empty state — fewer than 2 renderers selected. */
export const EmptyState: Story = {
  args: {
    renderers: [PBRT],
    features: RENDERSCOPE_FEATURE_CATEGORIES,
  },
};
