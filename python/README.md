# renderscope

A CLI tool and Python library for benchmarking, comparing, and cataloging open-source rendering engines.

> Part of the [RenderScope](https://github.com/renderscope-dev/renderscope) ecosystem.

## Status

🚧 Under active development — CLI commands will be added progressively.

## Installation

```bash
pip install renderscope
```

For development:

```bash
cd python
pip install -e ".[dev]"
```

## Planned Features

- **`renderscope list`** — List detected rendering engines
- **`renderscope benchmark`** — Run standardized benchmarks
- **`renderscope compare`** — Compute image quality metrics (PSNR, SSIM, LPIPS)
- **`renderscope report`** — Generate HTML comparison reports
- **`renderscope system-info`** — Print hardware specifications

## License

[Apache-2.0](../LICENSE)
