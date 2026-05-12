# Changelog

All notable changes to the RenderScope Python package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
