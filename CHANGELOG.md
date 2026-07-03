# Changelog

All notable changes to the RenderScope project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `renderscope.core.quality` module — reusable, fully-typed PSNR/SSIM/MSE and convergence-series computation from rendered images, using the same tone-mapping/`data_range` conventions as the benchmark runner. Includes a degeneracy guard that detects when per-sample-count renders are numerically identical (so no genuine convergence exists to publish).
- `scripts/compute_benchmarks_from_renders.py` — derives real benchmark quality metrics from existing convergence-checkpoint EXRs and measured run timings, emitting `benchmark.schema.json`-conforming JSON. Publishes a run only when its convergence series is genuine.

### Changed
- Benchmark data is now measurement-backed end to end. The Compare page's Performance tab reads the same real benchmark files as the dashboard (loaded at build time and passed from the server) instead of its own mock data module, so the two views can no longer drift apart.
- Added the real Sponza / Blender Cycles benchmark (measured on Apple M5 Max) with a genuine convergence curve computed from the existing renders.

### Removed
- Fabricated benchmark JSON that had no measured render backing (18 placeholder files across pbrt, mitsuba3, appleseed, luxcorerender, and Blender Cycles) and the web `mock-benchmark-data` module. The cornell-box and stanford-bunny runs were found to be degenerate (renders identical across sample counts) and are intentionally not published.

## [1.0.0] — 2026-05-11

First public release of RenderScope.

### Added
- Monorepo with web app (Next.js 14 + React 18), Python CLI/library (`renderscope`), and React component package (`renderscope-ui`)
- Apache-2.0 license, community infrastructure (issue templates, `CONTRIBUTING.md`, `SECURITY.md`, code of conduct)
- JSON data schema for renderer metadata, benchmarks, scenes, and taxonomy, plus `scripts/validate_data.py`
- 53 renderer profiles spanning 8 techniques: path tracing, ray tracing, rasterization, neural rendering, Gaussian splatting, differentiable rendering, volume rendering, educational
- Web app shell with navigation, footer, theme toggle, and layout system
- Explore page with filter sidebar, fuzzy search, and URL state persistence
- Six image comparison modes: slider, toggle, diff, SSIM heatmap, side-by-side, region zoom
- Compare page with renderer picker, feature matrix, images tab, and performance tab
- Gallery page with scene grid, detail view, and lightbox across 7 standard scenes
- Benchmark dashboard with data table, charts, convergence plots, and rankings
- Learn section with technique deep-dives, 67-term glossary, and historical timeline
- Interactive D3 force-directed taxonomy graph
- Docs site with CLI, API, schema, contributing, methodology, and citation pages
- Python renderer adapters for PBRT, Mitsuba 3, Blender Cycles, LuxCoreRender, appleseed, Filament, and OSPRay
- Image-quality metrics (PSNR, SSIM, MSE; optional LPIPS via PyTorch)
- HTML report generator with JSON, CSV, and Markdown export
- `renderscope-ui` exports: `ImageCompareSlider`, `ImageDiff`, `ImageSSIMHeatmap`, `ImageToggle`, `ImageSideBySide`, `RegionZoom`, `FeatureMatrix`, `BenchmarkChart`, `ConvergencePlot`, `RadarComparison`, `TaxonomyGraph`

### Quality
- SEO, Open Graph, and structured data for all public pages
- Accessibility audit and manual a11y fixes
- Performance optimization with Lighthouse audits in CI
- Cross-browser testing on Chromium, Firefox, and WebKit via Playwright
- Vitest + Playwright (web), pytest (Python), Vitest (npm) test suites

### Infrastructure
- Turborepo-based monorepo with npm workspaces
- GitHub Actions: lint, type-check, unit tests, Playwright E2E, Lighthouse
- Firebase Hosting deployment with PR preview channels
- PyPI publishing via trusted-publisher (OIDC)
- npm publishing with provenance attestation
- Weekly automated refresh of GitHub stats for all renderers

[Unreleased]: https://github.com/renderscope-dev/renderscope/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/renderscope-dev/renderscope/releases/tag/v1.0.0
