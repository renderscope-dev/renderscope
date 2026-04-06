# renderscope

[![PyPI version](https://img.shields.io/pypi/v/renderscope)](https://pypi.org/project/renderscope/)
[![Python](https://img.shields.io/pypi/pyversions/renderscope)](https://pypi.org/project/renderscope/)
[![License](https://img.shields.io/pypi/l/renderscope)](https://github.com/renderscope-dev/renderscope/blob/main/LICENSE)

A CLI tool and Python library for benchmarking, comparing, and cataloging 50+ open-source rendering engines. Compare path tracers, rasterizers, neural renderers, and more with standardized image quality metrics and reproducible benchmarks.

## Features

- **Renderer catalog** with metadata for 50+ engines (PBRT, Mitsuba 3, Cycles, LuxCore, and more)
- **Image quality metrics** including PSNR, SSIM, MSE, and optional LPIPS
- **Benchmark runner** with convergence tracking and structured JSON output
- **Report generation** as self-contained HTML, JSON, CSV, or Markdown
- **Scene management** with download and format conversion
- **Renderer adapters** for automated rendering via PBRT, Mitsuba 3, Blender Cycles, LuxCore, appleseed, Filament, and OSPRay
- **Hardware detection** for CPU, GPU, RAM, and OS

## Installation

```bash
pip install renderscope
```

With optional dependencies:

```bash
pip install renderscope[ml]      # LPIPS metric (requires PyTorch)
pip install renderscope[plots]   # Benchmark chart generation
pip install renderscope[cv]      # Advanced image operations
pip install renderscope[all]     # Everything
```

## Quick Start

```bash
# Browse the renderer catalog
renderscope list

# Filter by technique or language
renderscope list --technique path_tracing
renderscope list --language Rust --status active

# Compare two rendered images
renderscope compare reference.exr test.exr --metrics psnr ssim

# Run benchmarks across renderers and scenes
renderscope benchmark --scene cornell-box --renderer pbrt mitsuba3

# Generate an HTML report from benchmark results
renderscope report results.json --format html --output report.html

# Check your hardware
renderscope system-info
```

## Commands

| Command | Description |
|---------|-------------|
| `renderscope list` | Browse and filter the renderer catalog |
| `renderscope info <renderer>` | Detailed renderer profile |
| `renderscope system-info` | Detect and display hardware specs |
| `renderscope compare` | Compute image quality metrics (PSNR, SSIM, LPIPS) |
| `renderscope benchmark` | Run standardized benchmarks with convergence tracking |
| `renderscope report` | Generate HTML/JSON/CSV/Markdown reports |
| `renderscope download-scenes` | Download standard benchmark scenes |

## Library Usage

```python
from renderscope.core.data_loader import load_all_renderers, load_renderer
from renderscope.core.metrics import ImageMetrics
from renderscope.utils.hardware import detect_hardware

# Load renderer metadata
renderers = load_all_renderers()
print(f"Cataloged {len(renderers)} renderers")

pbrt = load_renderer("pbrt")
if pbrt:
    print(f"{pbrt.name}: {pbrt.description}")

# Compare images
metrics = ImageMetrics()
result = metrics.compare("reference.png", "test.png")
print(f"PSNR: {result.psnr:.2f} dB, SSIM: {result.ssim:.4f}")

# Detect hardware
hw = detect_hardware()
print(f"CPU: {hw.cpu}, RAM: {hw.ram_gb} GB")
```

## Part of the RenderScope Ecosystem

RenderScope is a three-part platform:

- **Web app** at [renderscope.dev](https://renderscope.dev) for interactive browsing and comparison
- **Python package** (this) for benchmarking, metrics, and reports
- **npm package** [`renderscope-ui`](https://www.npmjs.com/package/renderscope-ui) for reusable React visualization components

## Citation

If you use RenderScope in academic work, please cite:

```bibtex
@software{renderscope,
  author       = {Mishra, Ashutosh},
  title        = {RenderScope: Benchmarking and Comparing Open-Source Rendering Engines},
  url          = {https://github.com/renderscope-dev/renderscope},
  license      = {Apache-2.0}
}
```

## License

[Apache-2.0](https://github.com/renderscope-dev/renderscope/blob/main/LICENSE)
