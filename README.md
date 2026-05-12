<p align="center">
  <h1 align="center">RenderScope</h1>
  <p align="center">
    <strong>The open-source platform for cataloging, comparing, and benchmarking rendering engines.</strong>
  </p>
  <p align="center">
    <a href="https://render-scope.web.app">Website</a> &middot;
    <a href="https://render-scope.web.app/docs">Documentation</a> &middot;
    <a href="https://pypi.org/project/renderscope/">PyPI</a> &middot;
    <a href="https://www.npmjs.com/package/renderscope-ui">npm</a>
  </p>
  <p align="center">
    <a href="https://github.com/renderscope-dev/renderscope/actions/workflows/ci.yml"><img src="https://github.com/renderscope-dev/renderscope/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://github.com/renderscope-dev/renderscope/actions/workflows/deploy.yml"><img src="https://github.com/renderscope-dev/renderscope/actions/workflows/deploy.yml/badge.svg" alt="Deploy"></a>
    <a href="https://pypi.org/project/renderscope/"><img src="https://img.shields.io/pypi/v/renderscope?color=blue" alt="PyPI version"></a>
    <a href="https://www.npmjs.com/package/renderscope-ui"><img src="https://img.shields.io/npm/v/renderscope-ui?color=blue" alt="npm version"></a>
    <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
    <a href="https://pypi.org/project/renderscope/"><img src="https://img.shields.io/pypi/pyversions/renderscope" alt="Python"></a>
  </p>
</p>

---

RenderScope is a unified ecosystem for exploring, comparing, and benchmarking open-source rendering engines. It catalogs **54 renderers** across **8 rendering techniques** — from classical path tracers and rasterizers to neural radiance fields, 3D Gaussian Splatting, differentiable renderers, and volume renderers — with standardized metadata, reproducible benchmarks, and interactive visual comparison tools.

<br>

## Why RenderScope

The rendering landscape is vast and fragmented. Choosing the right engine for a research paper, a production pipeline, or a personal project means navigating dozens of repositories with incompatible data formats, undocumented feature sets, and no standardized way to compare quality or performance.

RenderScope solves this by providing:

- **A structured catalog** of 54 rendering engines with normalized metadata — techniques, features, platforms, GPU APIs, file format support, license, and community health
- **Visual comparison tools** to see the actual difference between renderers on the same scene, pixel by pixel
- **Reproducible benchmarks** with standardized scenes, consistent settings, and hardware-aware profiling
- **Educational resources** explaining the techniques behind each renderer, with an interactive glossary of 67 terms

<br>

## The Ecosystem

RenderScope is three tools that work together:

### Web Application &nbsp; `render-scope.web.app`

An interactive Next.js application for browsing, comparing, and learning about rendering engines.

- **Explore** — Filter and search 54 renderers by technique, language, GPU support, license, and status
- **Compare** — Side-by-side feature matrices, six image comparison modes (slider, toggle, diff, SSIM heatmap, side-by-side, region zoom), and performance charts
- **Benchmarks** — Dashboard with per-scene breakdowns, convergence plots, hardware profiles, and exportable data
- **Gallery** — Curated renders from 7 standard benchmark scenes across multiple renderers
- **Taxonomy** — Interactive D3 force-directed graph visualizing renderer relationships by technique
- **Learn** — Technique deep-dives, a searchable glossary, and a historical timeline of renderer releases

### Python Package &nbsp; `pip install renderscope`

A CLI tool and library for benchmarking, image quality analysis, and report generation.

```bash
renderscope list                          # Browse the renderer catalog
renderscope list --technique neural       # Filter by technique
renderscope compare ref.exr test.exr      # PSNR, SSIM, MSE, LPIPS
renderscope benchmark --scene sponza      # Run standardized benchmarks
renderscope report results.json -f html   # Generate self-contained HTML reports
renderscope system-info                   # Detect CPU, GPU, RAM
```

- **7 renderer adapters** — PBRT, Mitsuba 3, Blender Cycles, LuxCoreRender, appleseed, Filament, OSPRay
- **Image quality metrics** — PSNR, SSIM, MSE, false-color diff maps, and optional LPIPS (via PyTorch)
- **Report generation** — Self-contained HTML with embedded images, plus JSON, CSV, and Markdown
- **Scene management** — Download, convert, and manage standard benchmark scenes

### npm Package &nbsp; `npm install renderscope-ui`

Reusable React components for embedding renderer comparisons in any application.

```tsx
import { ImageCompareSlider, FeatureMatrix, TaxonomyGraph } from 'renderscope-ui';
import 'renderscope-ui/styles';
```

- **Image comparison** — `ImageCompareSlider`, `ImageDiff`, `ImageSSIMHeatmap`, `ImageToggle`, `ImageSideBySide`, `RegionZoom`
- **Data visualization** — `FeatureMatrix`, `BenchmarkChart`, `ConvergencePlot`, `RadarComparison`
- **Taxonomy** — Interactive `TaxonomyGraph` with D3 force simulation
- **Tree-shakeable** — Import only what you use; core bundle under 50KB gzipped

<br>

## Rendering Techniques Covered

| Technique | Description | Example Renderers |
|-----------|-------------|-------------------|
| **Path Tracing** | Unbiased global illumination via stochastic light-path sampling | PBRT, Mitsuba 3, LuxCore, Cycles |
| **Ray Tracing** | Image synthesis by tracing rays from camera into the scene | Embree, OSPRay, Filament |
| **Rasterization** | Real-time rendering by projecting primitives onto a 2D pixel grid | Eevee, Three.js, Babylon.js, Godot |
| **Neural Rendering** | Learned representations for novel view synthesis | Instant-NGP, Nerfstudio, NeRF |
| **Gaussian Splatting** | Projecting and compositing 3D Gaussian primitives | 3D Gaussian Splatting, gsplat |
| **Differentiable Rendering** | Renderers differentiable w.r.t. scene parameters for inverse problems | Mitsuba 3, Redner, nvdiffrast |
| **Volume Rendering** | Direct visualization of 3D scalar or vector fields | OSPRay, VTK, ParaView |
| **Educational** | Minimal or tutorial-oriented renderers for learning | Ray Tracing in One Weekend, smallpt |

<br>

## Quick Start

### Web Application

```bash
git clone https://github.com/renderscope-dev/renderscope.git
cd renderscope
npm install
npm run dev --workspace=web
```

Open [http://localhost:3000](http://localhost:3000).

### Python Package

```bash
pip install renderscope

# Optional extras
pip install renderscope[ml]      # LPIPS metric (PyTorch)
pip install renderscope[plots]   # Chart generation (Matplotlib)
pip install renderscope[all]     # Everything
```

### npm Package

```bash
npm install renderscope-ui react react-dom
```

<br>

## Project Structure

```text
renderscope/
├── web/                        Next.js 14 web application (171 React components)
├── packages/
│   └── renderscope-ui/         Reusable React component library (ESM + CJS)
├── python/                     Python CLI & library (7 renderer adapters)
├── data/
│   ├── renderers/              54 renderer profiles (JSON)
│   ├── benchmarks/             Benchmark results across scenes and hardware
│   ├── scenes/                 7 standard benchmark scenes
│   ├── taxonomy.json           Renderer technique classification
│   └── glossary.json           67 rendering terms
├── scripts/                    Automation (benchmarks, data refresh, deployment)
└── .github/workflows/          CI/CD, deployment, PyPI/npm publishing, data refresh
```

<br>

## Development

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20 |
| Python | >= 3.10 |
| npm | >= 10 |

### Setup

```bash
# Clone the repository
git clone https://github.com/renderscope-dev/renderscope.git
cd renderscope

# Install JavaScript dependencies (web + npm package)
npm install

# Install Python package in development mode
cd python && pip install -e ".[dev]" && cd ..

# Start the web app
npm run dev --workspace=web

# Build all packages
npx turbo build

# Run tests
npx turbo test                          # Web + npm package tests
cd python && pytest                     # Python tests
```

### Code Quality

```bash
# Linting and formatting
npx turbo lint
cd python && ruff check src/ && ruff format --check src/

# Type checking
npx turbo typecheck
cd python && mypy src/renderscope --strict

# End-to-end tests (Chromium, Firefox, WebKit)
cd web && npx playwright test
```

<br>

## Infrastructure

- **CI/CD** — GitHub Actions with lint, type check, unit tests, E2E tests, and Lighthouse audits on every push
- **Deployment** — Firebase Hosting with automatic preview deployments on pull requests
- **Data refresh** — Scheduled weekly workflow fetching GitHub stats (stars, forks, activity) for all 54 renderers
- **Publishing** — Automated PyPI and npm release pipelines triggered by GitHub releases
- **Testing** — Vitest + Playwright (web), pytest (Python), with cross-browser and responsive coverage

<br>

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Common contributions include:
- **Adding a new renderer** — Submit a JSON profile following the [data schema](https://render-scope.web.app/docs/schema)
- **Submitting benchmark results** — Run benchmarks on your hardware and submit via pull request
- **Improving educational content** — Add glossary terms, technique explanations, or renderer write-ups
- **Bug reports and feature requests** — Use the [issue templates](https://github.com/renderscope-dev/renderscope/issues/new/choose)

<br>

## Citation

If you use RenderScope in academic work, please cite:

```bibtex
@software{renderscope,
  author       = {{RenderScope Contributors}},
  title        = {{RenderScope}: An Open-Source Platform for Cataloging, Comparing, and Benchmarking Rendering Engines},
  url          = {https://github.com/renderscope-dev/renderscope},
  license      = {Apache-2.0}
}
```

<br>

## License

RenderScope is released under the [Apache License 2.0](LICENSE).

Copyright 2026 RenderScope Contributors.

<br>

---

## Appendix: Architecture & Diagrams

### System Overview

How the shared data layer feeds into all three packages and how they interconnect:

```mermaid
graph LR
    subgraph Data["Shared Data Layer"]
        R[("54 Renderer<br>Profiles")]
        S[("7 Benchmark<br>Scenes")]
        T[("Taxonomy &<br>Glossary")]
    end

    subgraph Web["Web App — render-scope.web.app"]
        E["Explore &<br>Filter"]
        C["Compare<br>Renderers"]
        B["Benchmark<br>Dashboard"]
        G["Gallery &<br>Learn"]
    end

    subgraph Py["Python CLI — pip install renderscope"]
        CLI["CLI"]
        AD["Renderer<br>Adapters"]
        MET["Image<br>Metrics"]
        REP["Report<br>Generator"]
    end

    subgraph NPM["npm — renderscope-ui"]
        IC["Image Comparison<br>Components"]
        FM["Feature Matrix &<br>Charts"]
        TG["Taxonomy<br>Graph"]
    end

    R --> E & CLI
    S --> B & AD
    T --> G & TG

    AD --> MET --> REP --> B

    IC & FM --> C
    TG --> G
```

### Monorepo Architecture

The full monorepo structure, internal modules of each package, and the CI/CD pipeline:

```mermaid
graph TB
    subgraph Monorepo["renderscope/ — Turborepo Monorepo"]
        direction TB

        subgraph SharedData["data/"]
            RD["renderers/*.json — 54 profiles"]
            BD["benchmarks/ — results per scene x renderer x hardware"]
            SD["scenes/ — 7 standard benchmark scenes"]
            TX["taxonomy.json — technique classification graph"]
            GL["glossary.json — 67 rendering terms"]
        end

        subgraph WebApp["web/ — Next.js 14 + React 18"]
            direction LR
            Pages["App Router<br><small>/explore · /compare · /benchmarks<br>/gallery · /learn · /taxonomy</small>"]
            Lib["lib/<br><small>Data loading · Filters · Search<br>Image processing · SEO · Structured Data</small>"]
            Components["components/<br><small>171 React components<br>Radix UI · Tailwind · Framer Motion</small>"]
        end

        subgraph UIPKG["packages/renderscope-ui/ — npm Library"]
            direction LR
            ImgComp["Image Comparison<br><small>Slider · Diff · SSIM Heatmap<br>Toggle · SideBySide · RegionZoom</small>"]
            DataViz["Data Visualization<br><small>FeatureMatrix · BenchmarkChart<br>ConvergencePlot · RadarComparison</small>"]
            TaxGraph["TaxonomyGraph<br><small>D3 force-directed graph</small>"]
        end

        subgraph PyPkg["python/ — PyPI Package"]
            direction LR
            CLIMod["cli/<br><small>list · info · compare<br>benchmark · report<br>download-scenes · system-info</small>"]
            Adapters["adapters/<br><small>PBRT · Mitsuba 3 · Cycles<br>LuxCore · appleseed<br>Filament · OSPRay</small>"]
            Core["core/<br><small>Metrics · BenchmarkRunner<br>SceneManager · Registry</small>"]
            Report["report/<br><small>HTML (Jinja2) · JSON<br>CSV · Markdown</small>"]
        end

        SharedData -- "build-time static import" --> WebApp
        SharedData -- "bundled in wheel" --> PyPkg
        UIPKG -- "consumed as dependency" --> WebApp
    end

    subgraph CICD["GitHub Actions CI/CD"]
        CI["CI — Lint · Type Check · Test · Playwright E2E · Lighthouse"]
        Deploy["Deploy — Firebase Hosting (preview + production)"]
        Pub["Publish — PyPI & npm (OIDC trusted publishing)"]
        Refresh["Weekly Data Refresh — GitHub API stats for 54 renderers"]
    end

    Monorepo --> CICD
```

### Benchmark Pipeline

End-to-end flow from scene selection through adapter execution, metrics computation, to multi-format report generation. The Python CLI orchestrates the full pipeline. Each renderer adapter handles scene format negotiation, subprocess execution, and output parsing. Metrics are computed against reference images using scikit-image (PSNR, SSIM, MSE) with optional LPIPS via PyTorch.

```mermaid
flowchart LR
    A["Select Scenes<br>& Renderers"] --> B["Download &<br>Prepare Scenes"]
    B --> C["Detect<br>Hardware"]
    C --> D["Run Benchmarks"]
    D --> E["Compute Metrics"]
    E --> F["Generate Reports"]

    D -- "per renderer" --> D1["Adapter resolves<br>scene format"]
    D1 --> D2["Subprocess<br>execution"]
    D2 --> D3["Parse output<br>EXR / PNG"]
    D3 --> D4["Convergence<br>tracking"]

    E --> E1["PSNR"]
    E --> E2["SSIM"]
    E --> E3["MSE"]
    E --> E4["LPIPS<br><i>(optional)</i>"]

    F --> F1["HTML<br><i>self-contained</i>"]
    F --> F2["JSON"]
    F --> F3["CSV"]
    F --> F4["Markdown"]
```

```bash
# Full pipeline in one command
renderscope benchmark --scene cornell-box sponza --renderer pbrt mitsuba3 cycles

# Or step by step
renderscope download-scenes                                       # Fetch scene assets
renderscope benchmark --scene cornell-box --renderer pbrt         # Run single benchmark
renderscope compare reference.exr pbrt_output.exr --metrics all   # Compute metrics
renderscope report results.json --format html --output report.html # Generate report
```

### Adding a New Renderer

The contribution workflow for adding a renderer — from fork to live on the website:

```mermaid
flowchart TD
    A["Fork & clone the repository"] --> B["Create renderer JSON profile"]
    B --> C{"Does it need<br>a Python adapter?"}

    C -- "No — data only" --> D["Add to taxonomy.json"]
    C -- "Yes — benchmarkable" --> E["Write adapter class"]

    E --> F["Register in adapter __init__.py"]
    F --> D

    D --> G["Run validation"]
    G --> H["Submit pull request"]
    H --> I["CI validates schema,<br>lint, and tests"]
    I --> J["Merged & live on<br>render-scope.web.app"]
```

**Step 1 — Create the renderer profile** at `data/renderers/<id>.json`:

```jsonc
{
  "id": "my-renderer",
  "name": "My Renderer",
  "version": "1.0.0",
  "description": "One-line description of the renderer",
  "technique": ["path_tracing"],       // path_tracing | ray_tracing | rasterization | neural | gaussian_splatting | differentiable | volume | educational
  "language": "C++",
  "license": "MIT",
  "platforms": ["linux", "macos", "windows"],
  "gpu_support": true,
  "gpu_apis": ["cuda", "optix"],
  "scene_formats": ["pbrt", "gltf"],
  "output_formats": ["exr", "png"],
  "repository": "https://github.com/org/my-renderer",
  "status": "active",                  // active | maintained | experimental | archived
  "features": { ... }
  // See data/renderers/pbrt.json for the full schema
}
```

**Step 2 — Add to taxonomy** in `data/taxonomy.json` under the appropriate technique node.

**Step 3 (optional) — Write an adapter** if you want the renderer to be benchmarkable via the CLI. Extend `RendererAdapter` in `python/src/renderscope/adapters/`:

```python
class MyRendererAdapter(RendererAdapter):
    name = "my-renderer"
    supported_formats = ["pbrt", "gltf"]

    def detect(self) -> str | None:
        """Return version string if installed, None otherwise."""

    def render(self, scene_path, output_path, settings) -> RenderResult:
        """Execute the renderer and return results."""
```

**Step 4 — Validate and submit:**

```bash
python scripts/validate_data.py          # Schema validation
cd python && pytest                       # Run tests
```

Then open a pull request. The CI pipeline validates everything automatically.

### Submitting Benchmark Results

How community benchmark contributions flow from local hardware to the public dashboard:

```mermaid
flowchart LR
    A["Install renderscope"] --> B["Run benchmarks<br>on your hardware"]
    B --> C["Results saved<br>as JSON"]
    C --> D["Submit PR to<br>data/benchmarks/"]
    D --> E["CI validates<br>schema & format"]
    E --> F["Merged into<br>dashboard"]
```

```bash
pip install renderscope
renderscope benchmark --scene cornell-box sponza --renderer pbrt mitsuba3 --output results.json
# Submit results.json via pull request to data/benchmarks/
```

Benchmark results from diverse hardware configurations make the comparison data more representative. All submissions are validated against the data schema and appear on the benchmark dashboard at [render-scope.web.app/benchmarks](https://render-scope.web.app/benchmarks).
