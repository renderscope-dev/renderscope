# Contributing to RenderScope

Thank you for your interest in contributing to RenderScope! This project thrives on community contributions — whether you're adding a new renderer to the catalog, submitting benchmark results, improving the documentation, or fixing bugs.

## Quick Links

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [Documentation](https://render-scope.web.app/docs)

## Ways to Contribute

### Add a New Renderer

The easiest and most impactful way to contribute. No coding required!

1. Copy `data/renderers/_template.json` to `data/renderers/<renderer-id>.json`
2. Fill in all required fields (see [Data Schema docs](https://render-scope.web.app/docs/schema))
3. Run validation: `python scripts/validate_data.py`
4. Submit a Pull Request

**Or** simply [open a New Renderer Request](../../issues/new?template=new_renderer.yml) with the renderer details and we'll create the data file.

### Submit Benchmark Results

1. Install the CLI: `pip install renderscope`
2. Run a benchmark:
   ```bash
   renderscope benchmark --scene cornell-box --renderer <name> --output results.json
   ```
3. Convert the run into catalog records:
   ```bash
   renderscope publish results.json --output-dir data/benchmarks --submitted-by <your-handle>
   ```
   Add `--dry-run` first to preview. Steps 2 and 3 collapse into one with
   `renderscope benchmark ... --publish-dir data/benchmarks`.
4. Validate: `python scripts/validate_data.py`
5. Submit via [Benchmark Submission issue](../../issues/new?template=benchmark_submission.yml) or open a PR adding the published records to `data/benchmarks/`

> **Do not copy `results.json` into `data/benchmarks/` directly.** It is a *run
> record* — nested render results, adapter internals, your Python environment —
> not a catalog entry, and it does not conform to
> [`schemas/benchmark.schema.json`](schemas/benchmark.schema.json).
> `renderscope publish` is what converts one into the other.

### Report Bugs

[Open a Bug Report](../../issues/new?template=bug_report.yml) with steps to reproduce.

### Suggest Features

[Open a Feature Request](../../issues/new?template=feature_request.yml) with your idea.

### Contribute Code

#### Development Setup

**Prerequisites:** Node.js >= 20, Python >= 3.10, npm

```bash
# Clone the repository
git clone https://github.com/renderscope-dev/renderscope.git
cd renderscope

# Install all dependencies (web app + npm package)
npm install

# Start the web app in development mode
npm run dev --workspace=web

# Install Python package in editable mode
cd python && pip install -e ".[dev]" && cd ..
```

#### Project Structure

- `web/` — Next.js web application
- `packages/renderscope-ui/` — npm component library
- `python/` — Python CLI and library
- `data/` — Shared JSON data files
- `schemas/` — JSON Schema definitions
- `scripts/` — Utility scripts (validation, data fetching)

#### Code Style

- **TypeScript/JavaScript:** ESLint + Prettier (run `npm run lint` and `npm run format`)
- **Python:** Ruff (run `ruff check .` and `ruff format .`)
- **Commits:** Use [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat: add new comparison mode`
  - `fix: correct SSIM calculation`
  - `data: add LuxCoreRender profile`
  - `docs: update CLI reference`

#### Pull Request Process

1. Fork the repository and create a branch from `main`
2. Make your changes
3. Ensure all checks pass:
   - `npm run build` (web app builds successfully)
   - `npm run lint` (no lint errors)
   - `python scripts/validate_data.py` (data is valid)
4. Open a Pull Request using the [PR template](.github/PULL_REQUEST_TEMPLATE.md)
5. Address any review feedback
6. A maintainer will merge once approved

### Improve Documentation

Documentation improvements are always welcome. You can edit pages directly on GitHub or submit a PR. Documentation lives in the `web/` app and is deployed to render-scope.web.app.

## Recognition

All contributors are recognized in the project. Significant contributions are acknowledged in release notes and the CHANGELOG.

## Questions?

Open a [Discussion](https://github.com/renderscope-dev/renderscope/discussions) or reach out to the maintainers.
