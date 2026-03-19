# Changelog

All notable changes to the RenderScope project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project scaffolding with monorepo structure (web app, Python CLI, npm package)
- Apache-2.0 license
- Community infrastructure (issue templates, contribution guide, security policy)
- JSON data schema for renderer metadata, benchmarks, scenes, and taxonomy
- Data validation script (`scripts/validate_data.py`)
- Web app shell with navigation, footer, theme toggle, and layout system
- Explore page with filter sidebar, fuzzy search, and URL state persistence
- Image comparison components (slider, diff, SSIM heatmap, toggle, region zoom)
- Compare page with renderer picker, images tab, and performance tab
- Gallery page with scene grid, detail view, and lightbox
- Benchmark dashboard with data table, charts, and rankings
- Learn section with technique pages, glossary, and timeline
- TaxonomyGraph npm component (D3 force-directed graph)
- Python renderer adapters (PBRT, Mitsuba 3, Blender Cycles, LuxCore, appleseed, Filament, OSPRay)
- HTML report generator with JSON, CSV, and Markdown export

### Infrastructure
- Turborepo-based monorepo with npm workspaces
- GitHub Actions CI/CD pipeline
- Firebase Hosting deployment configuration

[Unreleased]: https://github.com/renderscope-dev/renderscope/commits/main
