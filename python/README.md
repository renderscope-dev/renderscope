# renderscope

A CLI tool and Python library for benchmarking, comparing, and cataloging open-source rendering engines.

> Part of the [RenderScope](https://github.com/renderscope-dev/renderscope) ecosystem.

## Installation

```bash
pip install renderscope
```

For development:

```bash
cd python
pip install -e ".[dev]"
```

With optional dependencies:

```bash
pip install renderscope[ml]      # LPIPS metric (requires PyTorch)
pip install renderscope[plots]   # Benchmark chart generation
pip install renderscope[all]     # Everything
```

## Usage

### List Renderers

```bash
# Show all cataloged renderers in a formatted table
renderscope list

# Filter by rendering technique
renderscope list --technique path_tracing
renderscope list -t neural

# Filter by language or status
renderscope list --language Python
renderscope list --status active

# Machine-readable JSON output
renderscope list --format json
```

### System Information

```bash
# Show detected hardware (CPU, GPU, RAM, OS)
renderscope system-info

# JSON output for scripting
renderscope system-info --format json
```

### Version

```bash
renderscope --version
```

## Coming Soon

These commands are defined but not yet implemented:

- **`renderscope info <renderer>`** — Detailed renderer profile
- **`renderscope benchmark`** — Run standardized benchmarks
- **`renderscope compare`** — Compute image quality metrics (PSNR, SSIM, LPIPS)
- **`renderscope report`** — Generate HTML/JSON/CSV comparison reports
- **`renderscope download-scenes`** — Download standard benchmark scenes

## Library Usage

RenderScope can also be used as a Python library:

```python
from renderscope.models import RendererMetadata, HardwareInfo
from renderscope.core.data_loader import load_all_renderers, load_renderer
from renderscope.utils.hardware import detect_hardware

# Load all renderer metadata
renderers = load_all_renderers()
print(f"Loaded {len(renderers)} renderers")

# Load a specific renderer
pbrt = load_renderer("pbrt")
if pbrt:
    print(f"{pbrt.name}: {pbrt.description}")

# Detect hardware
hw = detect_hardware()
print(f"CPU: {hw.cpu}, RAM: {hw.ram_gb} GB")
```

## License

[Apache-2.0](../LICENSE)
