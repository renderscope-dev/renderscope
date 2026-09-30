# Changelog

All notable changes to the RenderScope project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed — the scene catalog is now a single, verified source of truth

RenderScope described its seven benchmark scenes twice. `data/scenes/*.json` fed
the website; `python/src/renderscope/data/scenes/manifest.json` fed the CLI.
Nothing compared them, and they had drifted apart on nearly every field:

- **Two disjoint complexity vocabularies.** The catalog used
  `trivial/low/medium/high/extreme`, schema-enforced; the manifest used
  `simple/moderate/complex`, unvalidated.
- **Format lists that disagreed with each other and with reality.** The site
  rendered a section headed "Available Formats" listing **22 formats across the
  seven scenes. Four were obtainable.** Downloading every scene that had a
  source and listing what landed on disk gave: cornell-box `obj` (site claimed
  `obj, pbrt, mitsuba_xml, gltf`), sponza `obj` (claimed four), stanford-bunny
  `obj` (claimed four), veach-mis `pbrt` (claimed two). `glb`/`gltf` was
  declared for six scenes and delivered for none, which is why the `filament`
  adapter could not run a single catalog scene.
- **`camera.look_at` versus `camera.target`** for the same point.
- **`validate_scenes.py` printed `Manifest is in sync with scene data`** while
  all of the above was true. It compared only the *set of scene ids*. It was
  also not run by CI at all.

The most concrete consequence: `renderscope reference --scene cornell-box` — the
flagship scene, whose manifest nominated PBRT at 65,536 spp as ground truth —
could never run, because the only archive wired up was an OBJ-only zip and PBRT
reads only `.pbrt`.

`data/scenes/*.json` is now the only authored description of a scene, and the
CLI manifest is generated from it.

- **`sources` replaces `downloads`** in `schemas/scene.schema.json`: per format,
  the archive URL, its SHA-256, its download size, and the path to the entry
  file inside it. `available_formats` must list exactly the keys of `sources`.
- **`scripts/generate_scene_manifest.py`** derives the CLI manifest from the
  catalog, mapping `faces` to `polygon_count` and `camera.look_at` to
  `camera.target` at that one boundary. The generated file stays committed
  because the wheel ships it.
- **`scripts/validate_scenes.py` regenerates the manifest and diffs it byte for
  byte**, and now runs in CI. Editing one side without the other fails with the
  offending lines. It also rejects a format that advertises no source, a source
  with no checksum or size, and a loose-file source whose `filename` and `path`
  disagree.
- `scripts/acquire_scenes.py` had a *third* hardcoded copy of the same URLs,
  including the dead Blender ones. It now derives them from the catalog.
- The Python test suite asserts that every nominated reference renderer can read
  at least one format its scene actually offers, which is what made the Cornell
  Box's ground truth unreachable.

### Added — every scene is downloadable, and each format has its own source

A scene is rarely published as one archive containing every format: the Cornell
Box's OBJ comes from Morgan McGuire's archive, its PBRT and Mitsuba descriptions
from Benedikt Bitterli's resource pack. The downloader resolved a single
`archive_url` per scene, so the other formats were unreachable by construction.

- **Formats are fetched, verified and installed independently**, each into
  `<scenes_dir>/<scene_id>/<format>/` with its own completion marker. Installing
  one can neither clobber nor be clobbered by another — several of these archives
  ship a same-named `LICENSE.txt`. `download-scenes --format pbrt` takes one
  format; the default takes all of them.
- **11 sources, covering all 7 scenes and 4 formats that had none.** Each archive
  was downloaded, its internal layout inspected, and its SHA-256 computed from
  the bytes that arrived:
  - cornell-box: `pbrt` and `mitsuba_xml` (Bitterli) — **this is what unblocks
    `renderscope reference --scene cornell-box`**
  - veach-mis: `mitsuba_xml` (Bitterli)
  - stanford-bunny: `ply` (Stanford 3D Scanning Repository's zippered
    reconstruction)
  - san-miguel: `obj` (535 MB, layout verified)
  - classroom and bmw: `blend`, from the nluug Blender mirror.
    `download.blender.org/demo/*` answers 403 to every user agent, including a
    browser one; `ftp.nluug.nl/pub/graphics/blender/demo/test/` serves the same
    files with the same names.
- `SceneManager` gained `is_format_downloaded`, `installed_formats`,
  `format_dir`, `describe_formats` and `remove_format`. A format counts as
  installed only when its marker *and* the file the manifest promises are both
  present, so a deleted or half-extracted file is reported as missing rather
  than handed to a renderer.
- `download-scenes --list` marks each format separately, since a scene is no
  longer simply downloaded or not.
- **A checksum proves the bytes, not the layout.** An archive that installs
  cleanly without containing its declared file is now refused
  (`SceneFileMissingError`) *before* the completion marker is written, so an
  upstream repackaging cannot leave a format marked present with nothing
  readable in it.

### Fixed

- **Error messages named formats the caller did not have.** `renderscope
  reference` reported `Scene provides: glb, obj, pbrt` — the *declared* list —
  directly below "cannot read any format", sending readers to look for files
  that were never downloaded. Both it and the benchmark runner's skip warning
  now report what is on disk, and `reference` names the command that fetches a
  format the renderer could actually read.
- **`download-scenes --list` overflowed an 80-column terminal**, where Rich
  truncated the Formats column and hid the download status entirely. The table
  now shrinks to the terminal.
- **Four cross-browser CI jobs failed on a breakpoint boundary, not a bug.** The
  `chromium-tablet` project is exactly 768px wide. Tailwind's `md:` means
  `min-width: 768px`, so that viewport gets the desktop layout and the navbar's
  `md:hidden` hamburger is correctly absent — but the responsive and touch specs
  skipped their mobile-only assertions at `width > 768`, so they ran anyway and
  failed to find it. The guards now use a shared, documented `isMobileLayout()`
  helper. `webkit-tablet` passed only because iPad (gen 7) is 810px wide.
- **A unit test downloaded the scene catalog from the internet.**
  `test_download_all_scenes_message` invoked `download-scenes` for real against
  the live manifest; with every format now sourced that is ~670 MB per run, on
  three Python versions. The fetch is stubbed; the Python suite went from 51s to
  17s.

### Added — reference renders, so quality metrics can exist at all

`BenchmarkRunner` computes PSNR, SSIM, MSE and a convergence curve the moment
`SceneManager.get_reference_path()` returns a file, and `None` until then. No
reference had ever existed, and the one tool that generates them —
`scripts/generate_reference_renders.py` — wrote to
`assets/renders/<scene>/<renderer>_reference.exr` while the runner reads the
manifest's `reference.image` under the scenes directory. Different root,
different filename: hours of 65,536-spp rendering produced a file nothing
consumed.

- `renderscope reference --scene <id>` renders the ground truth and writes it
  where the runner reads, defaulting to the renderer and sample count the
  manifest nominates so independently generated references stay comparable. It
  refuses to replace an existing reference without `--force`, because every
  published quality number for that scene is measured against it.
- A provenance sidecar is written beside each reference recording the renderer,
  version, sample count, resolution, and machine. A quality figure is only
  interpretable if you know what produced the thing it was measured against.
- `generate_reference_renders.py` now installs its output at the same location,
  closing the gap between producing a reference and consuming one.
- `SceneManager.reference_target_path()` answers "where does this belong",
  which `get_reference_path()` cannot: it returns `None` for a missing file,
  correct for a reader and useless to a writer.
- `SceneReference` gained optional `url`/`sha256`, so references can be
  distributed once hosting is decided. Unlike scene geometry they are
  RenderScope-generated, so there is no upstream to point at.

### Fixed — two accuracy bugs the reference work exposed

- **A perfect match produced unparseable JSON.** A render identical to its
  reference has an MSE of zero and therefore an infinite PSNR, which Python
  serialises as a bare `Infinity`. `json.load` and `scripts/validate_data.py`
  both accept it; `JSON.parse` rejects it, so such a record passed every
  Python-side check and then crashed the web build. Non-finite metrics are now
  omitted, which says the same thing honestly.
- **Records attributed quality to a reference that never produced it.** The
  quality block reported the manifest's *nomination* (`pbrt` at 65,536 spp)
  regardless of what actually generated the file on disk. It now prefers the
  provenance sidecar and falls back to the manifest.

### Added — benchmark scenes can now be downloaded

`renderscope download-scenes` could not acquire a single one of the seven
scenes. It created empty directory scaffolding, printed "Scene hosting not yet
available" for every entry, and exited — so `benchmark` reported every scene as
missing, `publish` had nothing to convert, and `data/benchmarks/` held one
record measured on the maintainer's own machine.

No hosting was needed. The upstream URLs already existed in the repository, in
`scripts/acquire_scenes.py` and the `downloads` maps of `data/scenes/*.json`;
the manifest the CLI actually reads had none of them.

- Wired `archive_url` and a verified `sha256` for **cornell-box, sponza,
  stanford-bunny, and veach-mis**. Each archive was downloaded and its internal
  layout checked against the paths in `formats` before being declared working,
  and each checksum was computed from the artifact that was fetched.
- Added `filename` to the manifest schema, for sources published as a single
  loose file. The Stanford Bunny ships as a bare `bunny.obj`, which the
  downloader previously rejected as an unsupported archive.
- `get_compatible_format` now believes what is on disk. The `.glb` variants are
  produced by `scripts/convert_to_gltf.py` and ship with no upstream download,
  so selecting one handed the adapter a path that did not exist. Once a scene is
  downloaded, an absent format is reported as incompatible; before download the
  declared set still stands, so `benchmark --dry-run` reasons correctly.
- `benchmark` gained `--scenes-dir`. It constructed a bare `SceneManager`, so it
  only ever looked in `~/.renderscope/scenes/` — scenes downloaded with
  `download-scenes --output-dir` elsewhere were reported as missing.
- The mock adapter wrote through PIL, which cannot save `.exr` — the extension
  the benchmark runner uses — so `benchmark --renderer mock` crashed with
  "unknown file extension". It now writes through the package's own image
  writer.

**Three scenes remained manual at the time of this entry** — `classroom` and
`bmw` because `download.blender.org/demo/*` answers 403, `san-miguel` because
its 535 MB archive had not been layout-verified. All three are now downloadable;
see *every scene is downloadable* above.

Verified end to end against live upstream: `download-scenes` (checksums
enforced) → `benchmark --scenes-dir` → `--publish-dir` → a record with zero
`benchmark.schema.json` violations.

### Fixed — CI had been red on every commit since 2026-03-19

- **The weekly catalog refresh had never once succeeded.** All 19 retained runs
  of `update-data.yml` fetched fresh GitHub statistics, committed them, and were
  then rejected at `git push` by branch protection (`GH013`). `git log` on
  `data/renderers/` confirms no automated commit has ever landed. The workflow
  now pushes to `automation/renderer-data-refresh` and opens a pull request,
  which is also what `benchmark.yml` did wrong — it had the same
  push-to-protected-main step, latent because it is `workflow_dispatch`-only.
  `ci.yml` additionally runs on `automation/**` pushes, because a pull request
  opened with the default `GITHUB_TOKEN` does not itself trigger workflows and
  its required checks would otherwise sit "Expected" forever.
- **Catalog statistics were materially wrong.** 18 of the 44 verified renderers
  were off by ≥20% — `viskores` showed 700 stars against 37 actual, `3d-slicer`
  7,500 against 2,554 — and three.js, Godot, Filament and two others showed
  nothing at all. All 49 GitHub-hosted renderers are refreshed here and now
  match the API exactly.
- **The 12-point star-trend sparklines were never measured.** They were smooth
  hand-authored ramps ending at counts up to 18x wrong. Cleared so the series
  rebuilds from real weekly runs, consistent with the fabricated benchmark data
  removed in `48df9c2`. `validate_data.py` no longer warns about short trends —
  a rolling window legitimately starts short; only an over-long one is a bug.
- **License mismatches were only ever visible in raw log output.** The refresh
  detects four (`pbrt` recorded as BSD-2-Clause where GitHub reports Apache-2.0;
  `3dgs-cpp` as MIT where GitHub reports LGPL-2.1) and now surfaces them in the
  job summary and pull request body for a human decision, rather than applying
  GitHub's heuristic detection automatically.
- **Python CI failed on every commit for two unrelated reasons.** Typer forces
  colour when `GITHUB_ACTIONS` is set, and Rich then splits `--scene` across
  escape sequences so it is no longer a contiguous substring — five help-text
  assertions passed locally and failed in CI. Separately, numpy ≥ 2.5 ships
  PEP 695 stubs that mypy rejects while targeting this package's 3.10 floor.
  Both fixed; 591 tests, `ruff`, and `mypy --strict` verified green on Python
  3.10 and 3.12 against CI's exact dependency versions.
- **60 WCAG 2.1 AA contrast violations.** Seven of the nine light-mode technique
  colours sat between 2.86:1 and 4.49:1 against their own 10%-alpha badge
  background; the terminal label was 3.66:1. All now clear 4.6:1, verified with
  axe-core on Chromium, Firefox and WebKit in both colour schemes.
- **Playwright audited the development server, not the shipped artifact.**
  `webServer` ran `npm run dev`, whose slower hydration let dark-palette text
  paint over the light default background — reporting docs-page contrast
  failures that do not exist in the static export. It now serves `out/`.
- **Lighthouse CI could never run.** `setup-node` was pointed at
  `web/package-lock.json` in an npm-workspaces monorepo where the lockfile is at
  the root, so the job died before Lighthouse started; no server was ever
  started for the configured `localhost:3000` URLs; and one audited URL
  (`/renderer/pbrt-v4/`) does not exist. Fixed via `staticDistDir`.
- The benchmark workflow ran `validate_data.py --type benchmark`, an argument the
  script does not accept; it only looked green because of `continue-on-error`.

### Known issues

- `tests/visual` is excluded from CI: all 61 committed baselines are `-win32.png`
  and CI runs on Linux, so every comparison fails with "A snapshot doesn't
  exist". Run the new **Update Visual Baselines** workflow to generate the Linux
  set, then re-add `tests/visual` to the Playwright step in `ci.yml`.
- The mobile and tablet Playwright projects (which run only on push to `main`)
  have pre-existing failures, including a genuine responsive bug: the compare
  feature matrix (`table.w-full`) overflows horizontally at a 320px viewport.
- `tests/theme` is excluded from CI: its `checkTextContrast` helper disagrees
  with axe-core, which reports zero violations on the same pages. The helper
  discarded the alpha channel entirely — reporting a contrast ratio of exactly
  1 for translucent badges — which is fixed here, but it still flags ratios axe
  does not. Reconcile the two before restoring it as a gate.
- Lighthouse now runs and reports two genuine findings that are not yet fixed:
  CLS of 0.068 against a 0.05 budget on `/explore` and `/benchmarks`, and a
  performance score of 0.93 against 0.95 on `/gallery`. The CLS shift is
  attributed to the footer but does not reproduce outside Lighthouse's
  emulation (measured 0.00001 via a direct PerformanceObserver run), so the
  thresholds are deliberately left unchanged rather than relaxed to go green.

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
