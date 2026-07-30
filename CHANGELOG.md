# Changelog

All notable changes to the RenderScope project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **A working benchmark contribution path.** `renderscope benchmark` records a *run*
  — nested render results, adapter internals, the Python environment — while the
  catalog publishes a flat record per renderer × scene × machine defined by
  `schemas/benchmark.schema.json`. Nothing bridged the two, so the flow documented
  in the README, `CONTRIBUTING.md`, and the benchmark-submission issue template
  produced a file that failed schema validation on 20 counts and crashed the web
  app's static build. New in this release:
  - `renderscope.report.benchmark_export` — `Canonical*` Pydantic models mirroring
    the published schema field-for-field with `extra="forbid"`, so a record that
    would fail `scripts/validate_data.py` cannot be constructed. Handles the
    mapping (`width`/`height` → `resolution`, `samples` → `samples_per_pixel`,
    `output_path` → `output_image`, `cpu_cores_physical`/`_logical` →
    `cpu_cores`/`cpu_threads`), omits unmeasured optional fields rather than
    emitting `null`, and refuses data the schema cannot represent instead of
    coercing it.
  - `renderscope publish <results.json>` — converts a run into catalog records,
    with `--dry-run`, `--hardware-id`/`--hardware-label`, `--notes`, and
    `--submitted-by`. Idempotent, and it refuses to silently overwrite one run
    with another that targets the same file.
  - `renderscope benchmark --publish-dir` — measure and publish in one step. A
    publishing failure leaves the measurements intact in the results file.
  - The wheel now bundles `benchmark.schema.json`, and publishing validates its
    own output against it when `jsonschema` is available.
- `renderscope.core.quality` module — reusable, fully-typed PSNR/SSIM/MSE and convergence-series computation from rendered images, using the same tone-mapping/`data_range` conventions as the benchmark runner. Includes a degeneracy guard that detects when per-sample-count renders are numerically identical (so no genuine convergence exists to publish).
- `scripts/compute_benchmarks_from_renders.py` — derives real benchmark quality metrics from existing convergence-checkpoint EXRs and measured run timings, emitting `benchmark.schema.json`-conforming JSON. Publishes a run only when its convergence series is genuine.

### Fixed
- `_detect_cpu()` accepted `platform.processor()`'s architecture strings as CPU
  models, so every benchmark measured on Apple Silicon recorded its CPU as
  `"arm"` and never reached the `sysctl` probe that returns the real chip name.
  Architecture names are now rejected, which is what lets machine identity be
  derived rather than hardcoded.
- `scripts/validate_data.py` only globbed the top level of each data directory,
  so nested files were never validated — two committed 0-byte benchmark JSON
  files passed CI unnoticed. It now walks recursively, reports empty files
  distinctly from syntax errors, and explains what to do when handed a JSON
  array instead of a record (previously an unhandled `AttributeError`).
- The benchmark workflow ran `validate_data.py --type benchmark`, an argument the
  script does not accept; the step only appeared to pass because of
  `continue-on-error`. Validation is now a real gate, with artifacts uploaded
  even on failure so a long run is never lost.

### Changed
- `data/benchmarks/` now separates the two things it held. Published catalog
  records stay flat as `<scene>-<renderer>-<hardware>.json`; raw run records move
  to `data/benchmarks/_raw/<scene>/<renderer>.json`, where the underscore keeps
  them out of both the web data loader and the validator. `docs/NAMING_CONVENTIONS.md`
  documented only the raw layout while the site and validator read only the flat
  one — both are now described accurately.
- Benchmark record ids include the hardware component
  (`<scene>-<renderer>-<hardware>-<YYYY-MM-DD>`). Without it, two contributors
  benchmarking the same renderer and scene on the same day collide on one id and
  trip the validator's duplicate check.
- `scripts/compute_benchmarks_from_renders.py` builds its output with the shared
  `Canonical*` models instead of a hand-rolled dict, so the repo's own publisher
  and the CLI cannot drift apart. Its output is unchanged.
- The report loader accepts a single benchmark object, not just an array or a
  `{"results": [...]}` envelope, so any file RenderScope writes can be read back
  by any command.
- Removed two committed 0-byte files (`cornell-box/pbrt.json`,
  `cornell-box/filament.json`).
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
