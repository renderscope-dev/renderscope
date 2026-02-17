# renderscope-ui

Reusable React components for comparing, benchmarking, and visualizing rendering engines.

> Part of the [RenderScope](https://github.com/renderscope-dev/renderscope) ecosystem.

## Installation

```bash
npm install renderscope-ui
```

**Peer dependencies:** `react >= 18`, `react-dom >= 18`

## Setup

Import the theme CSS in your application entry point:

```tsx
import "renderscope-ui/styles";
```

## Usage

```tsx
import { HelloRenderScope } from "renderscope-ui";

function App() {
  return <HelloRenderScope />;
}
```

## Theming

All components use CSS custom properties prefixed with `--rs-`. Override them to match your application:

```css
:root {
  --rs-bg: #1a1a2e;
  --rs-primary: #e94560;
  --rs-text: #eaeaea;
}
```

Or scope overrides to a container:

```css
.my-app .renderscope {
  --rs-bg: #ffffff;
  --rs-text: #111111;
}
```

See [`src/styles/theme.css`](src/styles/theme.css) for the full list of available CSS variables.

## Exported Types

The package exports TypeScript types for the RenderScope data layer:

```tsx
import type { RendererData, BenchmarkEntry, SceneData } from "renderscope-ui";
```

## Planned Components

- `ImageCompareSlider` — Draggable before/after image comparison
- `ImageDiff` — Pixel-level difference visualization with heatmaps
- `FeatureMatrix` — Interactive feature comparison table
- `BenchmarkChart` — Benchmark result visualizations
- `TaxonomyGraph` — Interactive renderer taxonomy visualization

## Development

```bash
# Build the package (ESM + CJS + types + CSS)
npm run build

# Watch mode for iterative development
npm run build:watch

# Launch Storybook
npm run storybook

# Type-check without emitting
npm run typecheck

# Clean build artifacts
npm run clean
```

## Build Output

```
dist/
├── index.mjs        # ESM bundle
├── index.cjs        # CJS bundle
├── index.d.mts      # TypeScript declarations (ESM)
├── index.d.cts      # TypeScript declarations (CJS)
└── theme.css        # CSS custom properties
```

## License

[Apache-2.0](../../LICENSE)
