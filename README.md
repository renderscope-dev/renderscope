# RenderScope

> An open-source platform for cataloging, comparing, benchmarking, and understanding open-source rendering engines.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Overview

RenderScope is a three-part open-source ecosystem:

- **Web Application** — Browse renderer profiles, explore an interactive taxonomy, compare features and visual output, and access curated benchmark data.
- **Python Package** (`pip install renderscope`) — Auto-detect installed renderers, run standardized benchmarks, compute image quality metrics, and generate comparison reports.
- **npm Package** (`npm install renderscope-ui`) — Embeddable React components for image comparison sliders, feature matrices, benchmark charts, and taxonomy graphs.

## Status

🚧 **Under active development** — not yet ready for production use.

## Project Structure

```text
renderscope/
├── web/                    # Next.js web application
├── packages/
│   └── renderscope-ui/     # npm component library
├── python/                 # Python CLI & library
├── data/                   # Shared JSON data (renderers, benchmarks, scenes)
└── assets/                 # Shared image assets (renders, scene files)
```

## Development

### Prerequisites

- Node.js >= 20
- Python >= 3.10
- npm >= 10

### Getting Started

```bash
# Install all dependencies
npm install

# Start the web app in development mode
npm run dev --workspace=web

# Build all packages
npx turbo build

# Install the Python package in development mode
cd python && pip install -e .
```

## License

[Apache-2.0](LICENSE)

## Citation

If you use RenderScope in academic work, please cite:

```bibtex
@software{renderscope,
  title = {RenderScope: An Open Source Platform for Cataloging, Comparing, and Benchmarking Rendering Engines},
  author = {Ashutosh Mishra},
  url = {https://github.com/renderscope-dev/renderscope},
  license = {Apache-2.0}
}
```
