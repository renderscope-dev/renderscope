# Changelog

All notable changes to the RenderScope Python package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Scene formats are now acquired independently, each with its own source.** `SceneInfo.formats` maps a format id to a `SceneFormat` (url, sha256, size, in-archive path) instead of to a bare path string, and the per-scene `archive_url`/`sha256`/`filename` fields are gone. A scene is rarely published as one archive containing every format — the Cornell Box's OBJ, PBRT and Mitsuba descriptions come from three unrelated hosts — so resolving a single archive per scene made the other formats unreachable, and `cornell-box` declared a `pbrt` format no download could produce. Every catalog scene is now downloadable, and `renderscope reference --scene cornell-box` (PBRT at 65,536 spp) can run for the first time.
- **On-disk layout:** `<scenes_dir>/<scene_id>/<format>/<path>`, with the completion marker inside each format's directory and the reference render beside them at `<scenes_dir>/<scene_id>/`. Formats no longer share a directory, so installing one cannot clobber another — several of these archives ship a same-named `LICENSE.txt`. Scenes downloaded by an earlier version are re-fetched; they live in a cache (`~/.renderscope/scenes/`), not in your project.
- `data/scenes/manifest.json` is **generated** from the repository's scene catalog (`data/scenes/*.json`) by `scripts/generate_scene_manifest.py`, and CI fails if the two drift. `complexity` therefore now uses the catalog's vocabulary (`trivial`/`low`/`medium`/`high`/`extreme`) rather than the manifest's former `simple`/`moderate`/`complex`.

### Added

- `renderscope download-scenes --format/-f FMT` (repeatable) — fetch only the formats your renderer reads. San Miguel's OBJ is half a gigabyte; needing the Cornell Box's PBRT description should not mean taking everything. `--list` marks each format separately, because a scene is no longer simply downloaded or not.
- `SceneManager.is_format_downloaded()`, `installed_formats()`, `format_dir()`, `scene_dir()`, `describe_formats()`, `mark_format_downloaded()`, `remove_format()`. A format counts as installed only when its marker *and* the file the manifest promises are both present, so a deleted or half-extracted file is reported as missing instead of being handed to a renderer.
- `SceneDownloader.download_format()` and `downloadable_formats()`; `download_scene()` gained `formats=` and reports formats that have no configured source in `DownloadResult.without_source` rather than raising, so one unhostable format cannot block the rest of a scene.
- `FormatNotDownloadedError` — a declared format that has not been fetched is a different problem from an absent scene, and has a different fix.
- `SceneFileMissingError` — a checksum proves the bytes arrived intact, not that the archive's layout is what was expected. An archive that installs cleanly without containing its declared file is refused *before* the completion marker is written, so an upstream repackaging cannot leave a format marked present with nothing readable in it.

- `renderscope publish <results.json>` — converts a benchmark run into the schema-conforming records the RenderScope catalog accepts in `data/benchmarks/`, one file per renderer × scene × machine. Supports `--dry-run`, `--hardware-id`/`--hardware-label`, `--notes`, `--submitted-by`, and `--base-dir`. Local and offline: it writes files ready to submit, it never uploads.
- `renderscope benchmark --publish-dir DIR` (and `--submitted-by`) — measure and publish in one step. If publishing fails the measurements remain in the results file, recoverable with `renderscope publish`.
- `renderscope.report.benchmark_export` — the conversion layer. `Canonical*` Pydantic models mirror `schemas/benchmark.schema.json` field-for-field with `extra="forbid"`, so an invalid record cannot be constructed; `to_canonical()`, `CanonicalBenchmarkExporter`, and `export_results()` are the public entry points. Unmeasured optional fields are omitted rather than emitted as `null` (which the schema rejects), and values the schema cannot represent raise `BenchmarkExportError` instead of being coerced.
- `renderscope.report.schema` — loads the published benchmark JSON Schema, now bundled in the wheel, and validates documents against it when the optional `jsonschema` package is installed.
- `renderscope.core.quality` module — computes PSNR/SSIM/MSE and full convergence series from in-memory image arrays (reusing `ImageMetrics` and the runner's tone-mapping conventions), plus `is_degenerate()` to reject "convergence" series whose renders don't actually vary with sample count.

### Fixed

- **Error messages named formats the caller did not have.** `renderscope reference` printed `Scene provides: glb, obj, pbrt` — the *declared* list — directly below "cannot read any format of 'cornell-box'", sending readers to look for files that had never been downloaded. It and the benchmark runner's skip warning now report what is on disk, and `reference` names the `download-scenes --format` command that would fetch something the renderer can read.
- `download-scenes --list` overflowed an 80-column terminal, where Rich truncated the Formats column and hid the download status entirely. The table now shrinks to the terminal.
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
