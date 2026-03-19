# renderscope-ui

React components for comparing, benchmarking, and exploring rendering engines.

[![npm version](https://img.shields.io/npm/v/renderscope-ui.svg)](https://www.npmjs.com/package/renderscope-ui)
[![npm downloads](https://img.shields.io/npm/dm/renderscope-ui.svg)](https://www.npmjs.com/package/renderscope-ui)
[![bundle size](https://img.shields.io/bundlephobia/minzip/renderscope-ui)](https://bundlephobia.com/package/renderscope-ui)
[![license](https://img.shields.io/npm/l/renderscope-ui.svg)](https://github.com/renderscope-dev/renderscope/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

[Website](https://renderscope.dev) · [Storybook](https://storybook.renderscope.dev) · [GitHub](https://github.com/renderscope-dev/renderscope) · [Python CLI](https://pypi.org/project/renderscope/)

## Overview

**renderscope-ui** provides production-ready React components for visual comparison of rendering engine outputs. It ships three component categories — image comparison tools, an interactive feature matrix, and a D3-powered taxonomy graph — all with full TypeScript support, CSS custom property theming, and tree-shakeable imports.

Part of the [RenderScope](https://renderscope.dev) ecosystem for cataloging, comparing, and benchmarking open source rendering engines.

## Installation

```bash
npm install renderscope-ui
```

```bash
yarn add renderscope-ui
```

```bash
pnpm add renderscope-ui
```

**Required peer dependencies:**

```bash
npm install react react-dom
```

**Optional peer dependency** (only for `FeatureMatrix` PNG export):

```bash
npm install html2canvas
```

## Quick Start

```tsx
import { ImageCompareSlider } from 'renderscope-ui';
import 'renderscope-ui/styles';

function App() {
  return (
    <ImageCompareSlider
      left={{ src: '/renders/pbrt.png', label: 'PBRT v4' }}
      right={{ src: '/renders/mitsuba.png', label: 'Mitsuba 3' }}
    />
  );
}
```

## Components

### Image Comparison

Six components for visual comparison of rendered images.

**ImageCompareSlider** — draggable before/after slider:

```tsx
import { ImageCompareSlider } from 'renderscope-ui';

<ImageCompareSlider
  left={{ src: '/renders/reference.png', label: 'Reference' }}
  right={{ src: '/renders/test.png', label: 'Test Render' }}
  initialPosition={0.5}
  orientation="horizontal"
  showLabels
/>
```

**ImageDiff** — pixel-level difference visualization:

```tsx
import { ImageDiff } from 'renderscope-ui';

<ImageDiff
  reference="/renders/reference.png"
  test="/renders/test.png"
  mode="absolute"
  amplification={5}
  showMetrics
/>
```

**ImageSSIMHeatmap** — SSIM false-color heatmap:

```tsx
import { ImageSSIMHeatmap } from 'renderscope-ui';

<ImageSSIMHeatmap
  reference="/renders/reference.png"
  test="/renders/test.png"
  colorMap="viridis"
/>
```

Also available: `ImageToggle` (A/B toggle with auto-play), `ImageSideBySide` (synchronized zoom/pan), and `RegionZoom` (click-drag magnification).

### Feature Comparison

**FeatureMatrix** — interactive comparison table with sorting, collapsible groups, and CSV/PNG export:

```tsx
import { FeatureMatrix, RENDERSCOPE_FEATURE_CATEGORIES } from 'renderscope-ui';

<FeatureMatrix
  renderers={[
    { id: 'pbrt', name: 'PBRT v4', features: { global_illumination: true, gpu_rendering: false } },
    { id: 'mitsuba', name: 'Mitsuba 3', features: { global_illumination: true, gpu_rendering: true } },
  ]}
  features={RENDERSCOPE_FEATURE_CATEGORIES}
  exportable
  collapsible
/>
```

### Taxonomy Graph

**TaxonomyGraph** — D3.js force-directed graph for visualizing renderer relationships:

```tsx
import { TaxonomyGraph } from 'renderscope-ui';

<TaxonomyGraph
  data={{
    nodes: [
      { id: 'path_tracing', type: 'category', label: 'Path Tracing' },
      { id: 'pbrt', type: 'renderer', label: 'PBRT v4', technique: 'path_tracing', stars: 5200 },
      { id: 'mitsuba', type: 'renderer', label: 'Mitsuba 3', technique: 'path_tracing', stars: 2400 },
    ],
    edges: [
      { source: 'pbrt', target: 'path_tracing', type: 'belongs_to' },
      { source: 'mitsuba', target: 'path_tracing', type: 'belongs_to' },
    ],
  }}
  colorBy="technique"
  onNodeClick={(id, node) => console.log('Clicked:', node.label)}
/>
```

## Hooks

Reusable hooks for building custom image comparison interfaces:

```tsx
import { useImageLoader, usePixelSampler, useResizeObserver, useSyncedZoom } from 'renderscope-ui';
```

- **`useImageLoader`** — parallel image loading with stale-request protection
- **`usePixelSampler`** — sample RGB pixel values from canvas at any coordinate
- **`useResizeObserver`** — observe container resize events
- **`useSyncedZoom`** — synchronize zoom and pan state across multiple images

## Utilities

Image processing functions for computing quality metrics:

```tsx
import { computePSNR, computeSSIM, computeAllMetrics, loadImageData } from 'renderscope-ui';

const ref = await loadImageData('/reference.png');
const test = await loadImageData('/test.png');
const { psnr, ssim, mse } = computeAllMetrics(ref, test);
```

## Theming

All components use CSS custom properties prefixed with `--rs-`. Import the default dark theme:

```tsx
import 'renderscope-ui/styles';
```

Override any variable to match your application:

```css
:root {
  --rs-bg: #1a1a2e;
  --rs-bg-card: #1e1e30;
  --rs-text: #eaeaea;
  --rs-primary: #4da6ff;
  --rs-border: #2a2a3a;
}
```

Or scope overrides to a container:

```css
.my-app .renderscope {
  --rs-bg: #ffffff;
  --rs-text: #111111;
}
```

The full list of 50+ design tokens (colors, spacing, typography, borders, shadows) is documented in [theme.css](https://github.com/renderscope-dev/renderscope/blob/main/packages/renderscope-ui/src/styles/theme.css).

## TypeScript

Full type declarations ship with the package. Import types alongside components:

```tsx
import type {
  RendererData,
  BenchmarkEntry,
  SceneData,
  TaxonomyData,
  ComparisonImage,
  FeatureMatrixProps,
  ImageCompareSliderProps,
} from 'renderscope-ui';
```

## Tree-Shaking

The package is fully tree-shakeable. You only pay for what you import:

- **Image components** (~28 kB gzipped) — no D3 dependency
- **FeatureMatrix** (~29 kB gzipped) — no D3 dependency
- **TaxonomyGraph** (~29 kB gzipped) — includes D3 force/zoom/selection modules
- **Full package** (~33 kB gzipped) — all components combined

Importing `ImageCompareSlider` alone does **not** pull in D3. Each component category is isolated.

## Browser Support

- Chrome / Edge 90+
- Firefox 90+
- Safari 15+
- Canvas 2D required for `ImageDiff` and `ImageSSIMHeatmap` pixel processing

## Links

- [RenderScope Website](https://renderscope.dev)
- [Storybook Documentation](https://storybook.renderscope.dev)
- [GitHub Repository](https://github.com/renderscope-dev/renderscope)
- [Python CLI Package](https://pypi.org/project/renderscope/)
- [Contributing Guide](https://github.com/renderscope-dev/renderscope/blob/main/CONTRIBUTING.md)

## License

[Apache-2.0](https://github.com/renderscope-dev/renderscope/blob/main/LICENSE) — Copyright 2026 Ashutosh Mishra
