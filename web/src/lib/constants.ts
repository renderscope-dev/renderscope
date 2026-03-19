export const siteConfig = {
  name: "RenderScope",
  description:
    "An open source platform for cataloging, comparing, and benchmarking rendering engines.",
  url: "https://renderscope.dev",
  github: "https://github.com/renderscope-dev/renderscope",
  pypi: "https://pypi.org/project/renderscope/",
  npm: "https://www.npmjs.com/package/renderscope",
  license: "Apache-2.0",
} as const;

export interface NavItem {
  label: string;
  href: string;
  description?: string;
  external?: boolean;
}

export const mainNavItems: NavItem[] = [
  {
    label: "Explore",
    href: "/explore",
    description: "Browse and filter all renderers",
  },
  {
    label: "Compare",
    href: "/compare",
    description: "Side-by-side feature and visual comparison",
  },
  {
    label: "Gallery",
    href: "/gallery",
    description: "Same scene rendered by different engines",
  },
  {
    label: "Benchmarks",
    href: "/benchmarks",
    description: "Performance data and metrics",
  },
  {
    label: "Learn",
    href: "/learn",
    description: "Rendering techniques explained",
  },
  {
    label: "Docs",
    href: "/docs",
    description: "CLI reference, API docs, contribution guide",
  },
];

export const footerLinks = {
  product: [
    { label: "Explore Renderers", href: "/explore" },
    { label: "Compare", href: "/compare" },
    { label: "Gallery", href: "/gallery" },
    { label: "Benchmarks", href: "/benchmarks" },
  ],
  resources: [
    { label: "Learn", href: "/learn" },
    { label: "Documentation", href: "/docs" },
    { label: "CLI Reference", href: "/docs/cli" },
    { label: "API Reference", href: "/docs/api" },
  ],
  community: [
    { label: "GitHub", href: siteConfig.github, external: true },
    { label: "PyPI", href: siteConfig.pypi, external: true },
    { label: "npm", href: siteConfig.npm, external: true },
    { label: "Contributing", href: "/docs/contributing" },
  ],
} as const;

export const techniqueColorMap: Record<string, string> = {
  path_tracing: "technique-path-tracing",
  ray_tracing: "technique-ray-tracing",
  rasterization: "technique-rasterization",
  neural: "technique-neural",
  gaussian_splatting: "technique-gaussian-splatting",
  differentiable: "technique-differentiable",
  volume_rendering: "technique-volume",
  volume: "technique-volume",
  ray_marching: "technique-ray-marching",
  hybrid: "technique-path-tracing",
  educational: "technique-educational",
};

export const techniqueLabels: Record<string, string> = {
  path_tracing: "Path Tracing",
  ray_tracing: "Ray Tracing",
  rasterization: "Rasterization",
  neural: "Neural",
  gaussian_splatting: "Gaussian Splatting",
  differentiable: "Differentiable",
  volume_rendering: "Volume",
  volume: "Volume",
  ray_marching: "Ray Marching",
  hybrid: "Hybrid",
  educational: "Educational",
};

export const sortOptions = [
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "stars-desc", label: "Most Stars" },
  { value: "stars-asc", label: "Fewest Stars" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
] as const;

export const platformLabels: Record<string, string> = {
  linux: "Linux",
  macos: "macOS",
  windows: "Windows",
  web: "Web",
  android: "Android",
  ios: "iOS",
};

export const sceneFormatLabels: Record<string, string> = {
  pbrt: "PBRT",
  mitsuba_xml: "Mitsuba XML",
  gltf: "glTF",
  glb: "GLB",
  obj: "OBJ",
  fbx: "FBX",
  usd: "USD",
  usda: "USDA",
  usdz: "USDZ",
  alembic: "Alembic",
  abc: "Alembic",
  ply: "PLY",
  stl: "STL",
  blend: "Blend",
  collada: "COLLADA",
  dae: "COLLADA",
  nrrd: "NRRD",
  dicom: "DICOM",
  nifti: "NIfTI",
  vti: "VTI",
  vtu: "VTU",
  vtp: "VTP",
  vtk_legacy: "VTK Legacy",
  colmap: "COLMAP",
  instant_ngp: "Instant-NGP",
  nerfstudio: "Nerfstudio",
  transforms_json: "transforms.json",
  custom_xml: "Custom XML",
  custom_json: "Custom JSON",
  custom_text: "Custom Text",
  custom_binary: "Custom Binary",
  python_api: "Python API",
  c_api: "C API",
  programmatic: "Programmatic",
  sokol_api: "Sokol API",
  bevy_scene: "Bevy Scene",
  ron: "RON",
  ogre_mesh: "Ogre Mesh",
  ogre_scene: "Ogre Scene",
  dotscene: "DotScene",
  bsdf_xml: "BSDF XML",
  custom_lua: "Custom Lua",
  tobj: "TOBJ",
};

export const outputFormatLabels: Record<string, string> = {
  exr: "EXR",
  png: "PNG",
  jpg: "JPEG",
  jpeg: "JPEG",
  hdr: "HDR",
  tiff: "TIFF",
  bmp: "BMP",
  tga: "TGA",
  ppm: "PPM",
  webp: "WebP",
  mp4: "MP4",
  avi: "AVI",
  ply: "PLY",
  ckpt: "Checkpoint",
  numpy: "NumPy",
  torch: "PyTorch",
  screen: "Screen",
  framebuffer: "Framebuffer",
};

export const gpuApiLabels: Record<string, string> = {
  cuda: "CUDA",
  optix: "OptiX",
  hip: "HIP",
  oneapi: "oneAPI",
  metal: "Metal",
  webgl: "WebGL",
  webgpu: "WebGPU",
  vulkan: "Vulkan",
  directx: "DirectX",
  opencl: "OpenCL",
};

/** Placeholder images for renderers without real sample renders */
export const placeholderRenders = [
  { src: "/images/placeholders/placeholder-render-1.svg", scene: "Cornell Box" },
  { src: "/images/placeholders/placeholder-render-2.svg", scene: "Sponza Atrium" },
  { src: "/images/placeholders/placeholder-render-3.svg", scene: "Stanford Bunny" },
] as const;

/** Color mapping for release freshness */
export const releaseFreshnessColors: Record<string, string> = {
  fresh: "text-emerald-400",
  aging: "text-amber-400",
  stale: "text-muted-foreground",
};

/** Color mapping for star trend */
export const trendColors: Record<string, string> = {
  up: "text-emerald-400",
  down: "text-red-400",
  stable: "text-muted-foreground",
};

export const trendIcons: Record<string, string> = {
  up: "\u25B2",
  down: "\u25BC",
  stable: "\u2014",
};

/** Maps community_links field names → display label + Lucide icon name */
export const communityLinkConfig: Record<
  string,
  { label: string; icon: string }
> = {
  discord: { label: "Discord", icon: "MessageSquare" },
  forum: { label: "Forum", icon: "MessagesSquare" },
  mailing_list: { label: "Mailing List", icon: "Mail" },
  stackoverflow_tag: { label: "Stack Overflow", icon: "HelpCircle" },
};

/** Maps tutorial type → Lucide icon name */
export const tutorialTypeIcons: Record<string, string> = {
  video: "Play",
  article: "FileText",
  course: "GraduationCap",
};

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE CONTENT
// ═══════════════════════════════════════════════════════════════

export const landingContent = {
  hero: {
    title: "RenderScope",
    tagline:
      "The open platform for cataloging, comparing, and benchmarking rendering engines.",
    primaryCta: { label: "Explore Renderers", href: "/explore" },
    secondaryCta: { label: "Compare Engines", href: "/compare" },
  },
  stats: {
    items: [
      { label: "Renderers Cataloged", icon: "Layers" as const },
      { label: "Rendering Techniques", icon: "Sparkles" as const },
      { label: "Languages Covered", icon: "Code2" as const },
      { label: "Open Source Projects", icon: "GitBranch" as const },
    ],
  },
  comparison: {
    heading: "See the Difference",
    subtitle:
      "Compare the same scene rendered by different engines — pixel by pixel.",
    cta: { label: "Try the comparison tool", href: "/compare" },
  },
  taxonomy: {
    heading: "Explore the Rendering Landscape",
    subtitle:
      "Navigate an interactive taxonomy of rendering engines. See how techniques, tools, and ecosystems connect.",
    cta: { label: "Explore the taxonomy", href: "/explore" },
  },
  quickStart: {
    heading: "Get Started in Seconds",
    subtitle:
      "Install the CLI to benchmark renderers and compare images from your terminal.",
    commands: ["pip install renderscope", "renderscope list"],
  },
  recentUpdates: {
    heading: "Latest Additions",
    subtitle: "The catalog is always growing. Here's what's new.",
  },
} as const;

/** Placeholder image data for the hero grid — will be replaced with real images later. */
export const heroPlaceholderImages: {
  renderer: string;
  technique: string;
  label: string;
}[] = [
  { renderer: "PBRT v4", technique: "path-tracing", label: "Path Tracing" },
  { renderer: "Filament", technique: "rasterization", label: "Rasterization" },
  { renderer: "Nerfstudio", technique: "neural", label: "Neural" },
  {
    renderer: "Mitsuba 3",
    technique: "differentiable",
    label: "Differentiable",
  },
  { renderer: "OSPRay", technique: "volume", label: "Volume" },
  {
    renderer: "Blender Cycles",
    technique: "path-tracing",
    label: "Path Tracing",
  },
];

/** Placeholder image data for the featured comparison section. */
export const comparisonPlaceholder = {
  left: { renderer: "PBRT v4", technique: "path-tracing" },
  right: { renderer: "Mitsuba 3", technique: "differentiable" },
} as const;

/** Technique key → gradient CSS classes for placeholder images. */
export const techniquePlaceholderGradients: Record<string, string> = {
  "path-tracing": "from-blue-900/40 via-blue-950/20 to-transparent",
  rasterization: "from-emerald-900/40 via-emerald-950/20 to-transparent",
  neural: "from-purple-900/40 via-purple-950/20 to-transparent",
  differentiable: "from-pink-900/40 via-pink-950/20 to-transparent",
  volume: "from-orange-900/40 via-orange-950/20 to-transparent",
  educational: "from-amber-900/40 via-amber-950/20 to-transparent",
  "ray-marching": "from-cyan-900/40 via-cyan-950/20 to-transparent",
  "gaussian-splatting": "from-violet-900/40 via-violet-950/20 to-transparent",
};

export const statusConfig: Record<
  string,
  { label: string; color: string; dotColor: string }
> = {
  active: {
    label: "Active",
    color: "text-emerald-400",
    dotColor: "bg-emerald-400",
  },
  maintenance: {
    label: "Maintenance",
    color: "text-amber-400",
    dotColor: "bg-amber-400",
  },
  inactive: {
    label: "Inactive",
    color: "text-zinc-500",
    dotColor: "bg-zinc-500",
  },
  archived: {
    label: "Archived",
    color: "text-zinc-600",
    dotColor: "bg-zinc-600",
  },
  deprecated: {
    label: "Deprecated",
    color: "text-red-400",
    dotColor: "bg-red-400",
  },
};
