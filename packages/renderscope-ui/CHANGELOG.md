# Changelog

All notable changes to the `renderscope-ui` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-19

### Added

- **Image Comparison Components**
  - `ImageCompareSlider` — draggable before/after comparison slider with horizontal and vertical orientations
  - `ImageDiff` — pixel-difference visualization with absolute and luminance modes, PSNR overlay
  - `ImageSSIMHeatmap` — SSIM false-color heatmap with viridis, inferno, and magma colormaps
  - `ImageToggle` — click/auto-toggle between images with crossfade transition and playback controls
  - `ImageSideBySide` — synchronized side-by-side comparison with linked zoom and pan
  - `RegionZoom` — click-drag magnification panel with adjustable zoom level

- **Feature Comparison**
  - `FeatureMatrix` — interactive comparison table with sorting, collapsible groups, and CSV/PNG export
  - `FeatureCell` — individual feature support cell component
  - `FeatureGroupHeader` — collapsible category header component

- **Taxonomy Graph**
  - `TaxonomyGraph` — D3.js force-directed graph with zoom, pan, hover tooltips, drag, and click events
  - Supports `colorBy` modes: technique, language, status
  - Filtering by node type, imperative zoom controls

- **Hooks**
  - `useImageLoader` — parallel image loading with stale-request protection
  - `usePixelSampler` — canvas pixel RGB sampling at arbitrary coordinates
  - `useResizeObserver` — DOM element resize observation
  - `useSyncedZoom` — synchronized zoom and pan state across multiple images

- **Utilities**
  - Image processing: `computePSNR`, `computeSSIM`, `computeMSE`, `computeAbsoluteDiff`, `computeLuminanceDiff`, `computeAllMetrics`, `loadImageData`, `generateSSIMHeatmap`
  - Color maps: `getColor`, `getColorMap` with viridis, inferno, and magma presets
  - Class name utility: `cx`

- **Theming**
  - CSS custom properties system (`--rs-*`) with dark theme default
  - 50+ design tokens for colors, spacing, typography, borders, shadows
  - Import via `'renderscope-ui/styles'`

- **TypeScript**
  - Full type declarations for all components, props, hooks, and data types
  - Exported types: `RendererData`, `BenchmarkEntry`, `SceneData`, `TaxonomyData`, `FeatureMatrixProps`, and 30+ more

- **Build & Distribution**
  - Dual ESM/CJS output with TypeScript declarations
  - Tree-shakeable — importing one component does not pull in unrelated dependencies
  - Bundle size enforcement via size-limit
  - CSS extracted to separate file for optimal loading
