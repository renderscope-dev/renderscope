# Changelog

All notable changes to the RenderScope Python package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `renderscope publish <results.json>` — converts a benchmark run into the schema-conforming records the RenderScope catalog accepts in `data/benchmarks/`, one file per renderer × scene × machine. Supports `--dry-run`, `--hardware-id`/`--hardware-label`, `--notes`, `--submitted-by`, and `--base-dir`. Local and offline: it writes files ready to submit, it never uploads.
- `renderscope benchmark --publish-dir DIR` (and `--submitted-by`) — measure and publish in one step. If publishing fails the measurements remain in the results file, recoverable with `renderscope publish`.
- `renderscope.report.benchmark_export` — the conversion layer. `Canonical*` Pydantic models mirror `schemas/benchmark.schema.json` field-for-field with `extra="forbid"`, so an invalid record cannot be constructed; `to_canonical()`, `CanonicalBenchmarkExporter`, and `export_results()` are the public entry points. Unmeasured optional fields are omitted rather than emitted as `null` (which the schema rejects), and values the schema cannot represent raise `BenchmarkExportError` instead of being coerced.
- `renderscope.report.schema` — loads the published benchmark JSON Schema, now bundled in the wheel, and validates documents against it when the optional `jsonschema` package is installed.
- `renderscope.core.quality` module — computes PSNR/SSIM/MSE and full convergence series from in-memory image arrays (reusing `ImageMetrics` and the runner's tone-mapping conventions), plus `is_degenerate()` to reject "convergence" series whose renders don't actually vary with sample count.

### Fixed

- `_detect_cpu()` treated `platform.processor()`'s architecture strings (`"arm"`, `"amd64"`, …) as CPU model names. On Apple Silicon that returned `"arm"` and skipped the `sysctl machdep.cpu.brand_string` probe entirely, stamping every benchmark with a CPU that identifies nothing. Architecture names are now rejected so the platform-specific probes run.

### Changed

- The report loader accepts a single benchmark object in addition to a JSON array and a `{"results": [...]}` envelope, so any file RenderScope writes can be read back by any command.
- `gpu_enabled` in published records reports whether the GPU was *used*, not whether it was requested: adapters that accept `--gpu` and fall back to CPU (Cycles reports `gpu_backend: "CPU (fallback)"`) previously had their CPU timings attributed to a GPU run.

### Packaging

- The wheel bundles `schemas/benchmark.schema.json` as package data, so an installed `renderscope` carries the contract it publishes against instead of depending on a monorepo checkout.
- `jsonschema` added to the `dev` extra. It is not a runtime dependency — publishing works without it, skipping only the belt-and-braces schema check.

## [1.0.0] - 2026-05-11

First public release.

### Added

- CLI tool with `list`, `system-info`, `info`, `compare`, `benchmark`, `report`, and `download-scenes` commands
- Renderer adapter framework supporting PBRT, Mitsuba 3, Blender Cycles, LuxCoreRender, appleseed, Google Filament, and Intel OSPRay
- Image quality metrics: PSNR, SSIM, MSE, absolute difference, false-color mapping
- Optional LPIPS metric via `renderscope[ml]` extra
- EXR, HDR, PNG, and JPEG image I/O with tone mapping
- Benchmark runner with convergence tracking and structured JSON output
- Self-contained HTML report generator with embedded images and interactive sliders
- JSON, CSV, and Markdown export formats for benchmark results
- Scene management with download capabilities
- Bundled metadata for 53 rendering engines
- Hardware detection (CPU, GPU, RAM, OS)
- Full type annotations (PEP 561 compliant)

### Packaging

- Hatch build hook resolves the canonical renderer data location for both monorepo and rebuilt-from-sdist wheel builds, eliminating duplicate file entries in the wheel and enabling `pip install` from sdist

[1.0.0]: https://github.com/renderscope-dev/renderscope/releases/tag/python-v1.0.0
