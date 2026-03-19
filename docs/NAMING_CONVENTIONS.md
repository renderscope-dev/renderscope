# RenderScope Asset Naming Conventions

This document specifies the file naming rules for all rendered assets and
benchmark results.  Every downstream consumer — the web app (gallery, compare
tool, renderer profiles), the Python CLI, and future contributors — relies on
these conventions to locate files by construction rather than by index.

> **Stability guarantee:** IDs are permanent.  Once a renderer or scene ID has
> been published, it must never be renamed.

---

## IDs

| Entity   | Format             | Examples                                       |
|----------|--------------------|------------------------------------------------|
| Scene    | `lowercase-hyphen` | `cornell-box`, `sponza`, `stanford-bunny`      |
| Renderer | `lowercase-hyphen` | `pbrt`, `mitsuba3`, `blender-cycles`, `luxcore` |

- Scene IDs match the `id` field in `/data/scenes/<scene-id>.json`.
- Renderer IDs match the canonical adapter name and the `id` field in
  `/data/renderers/<renderer-id>.json`.

---

## Benchmark Result JSON Files

```
data/benchmarks/<scene-id>/<renderer-id>.json
```

**Examples:**

| File                                           | Description                      |
|------------------------------------------------|----------------------------------|
| `data/benchmarks/cornell-box/pbrt.json`        | PBRT × Cornell Box result        |
| `data/benchmarks/sponza/mitsuba3.json`         | Mitsuba 3 × Sponza result       |
| `data/benchmarks/stanford-bunny/blender-cycles.json` | Cycles × Stanford Bunny result |

Each file conforms to `schemas/benchmark.schema.json`.

---

## Rendered Images (Original EXR)

```
assets/renders/<scene-id>/<renderer-id>_<spp>spp.exr
```

**Examples:**

| File                                             | Description                           |
|--------------------------------------------------|---------------------------------------|
| `assets/renders/cornell-box/pbrt_1024spp.exr`    | PBRT render, 1 024 samples per pixel  |
| `assets/renders/sponza/mitsuba3_1024spp.exr`     | Mitsuba 3 render, 1 024 SPP           |

These are 32-bit float HDR files preserving full dynamic range.  They are
**not** committed to Git (too large); use Git LFS or download separately.

---

## Reference Renders

```
assets/renders/<scene-id>/<renderer-id>_reference.exr
```

**Example:**

| File                                              | Description                        |
|---------------------------------------------------|------------------------------------|
| `assets/renders/cornell-box/pbrt_reference.exr`   | 65 536 SPP ground-truth reference  |

Reference renders are produced by `scripts/generate_reference_renders.py`.
PSNR/SSIM quality metrics are computed against these.

---

## Web-Optimised Images

### Full size

```
assets/renders/<scene-id>/<renderer-id>_1920x1080.webp
```

### Thumbnail

```
assets/renders/<scene-id>/<renderer-id>_400x225.webp
```

**Examples:**

| File                                                 | Description            |
|------------------------------------------------------|------------------------|
| `assets/renders/cornell-box/pbrt_1920x1080.webp`    | Full-size web image    |
| `assets/renders/cornell-box/pbrt_400x225.webp`      | Thumbnail for card grid|
| `assets/renders/sponza/mitsuba3_1920x1080.webp`     | Full-size web image    |
| `assets/renders/sponza/mitsuba3_400x225.webp`       | Thumbnail              |

WebP files are produced by `scripts/generate_web_images.py` with consistent
ACES Filmic tone mapping and sRGB colour space.

Full-size images use WebP quality 90; thumbnails use quality 85.

---

## Reference Image Web Versions

```
assets/renders/<scene-id>/<renderer-id>_reference_1920x1080.webp
```

Generated alongside the reference EXR for display on the web.

---

## Comparison Strips

```
assets/renders/<scene-id>/comparison_strip.webp
```

A single wide image with all renderer outputs placed side-by-side for quick
visual comparison and social media sharing.  Generated with the
`--comparison-strips` flag of `generate_web_images.py`.

---

## Error Logs

```
logs/benchmarks/<scene-id>_<renderer-id>_error.log
```

Per-combination error logs created by `run_benchmarks.py` when a render fails
or times out.

---

## Batch Summary

```
logs/benchmarks/batch_summary.json   # Machine-readable
logs/benchmarks/batch_summary.txt    # Human-readable
```

Written after every batch run.  Contains hardware info, per-combination
status, timings, and error details.

---

## Directory Layout Overview

```
data/
└── benchmarks/
    ├── cornell-box/
    │   ├── pbrt.json
    │   ├── mitsuba3.json
    │   ├── blender-cycles.json
    │   ├── luxcore.json
    │   └── appleseed.json
    ├── sponza/
    │   └── ...
    └── stanford-bunny/
        └── ...

assets/
└── renders/
    ├── cornell-box/
    │   ├── pbrt_1024spp.exr
    │   ├── pbrt_reference.exr
    │   ├── pbrt_1920x1080.webp
    │   ├── pbrt_400x225.webp
    │   ├── mitsuba3_1024spp.exr
    │   ├── mitsuba3_1920x1080.webp
    │   ├── mitsuba3_400x225.webp
    │   ├── comparison_strip.webp
    │   └── ...
    ├── sponza/
    │   └── ...
    └── stanford-bunny/
        └── ...

logs/
└── benchmarks/
    ├── batch_summary.json
    ├── batch_summary.txt
    ├── cornell-box_luxcore_error.log
    └── ...
```

---

## Real-Time Renderer Output

For rasterization renderers (Filament, etc.) that output PNG instead of EXR:

```
assets/renders/<scene-id>/<renderer-id>_frame.png
```

**Examples:**

| File                                              | Description                    |
|---------------------------------------------------|--------------------------------|
| `assets/renders/cornell-box/filament_frame.png`   | Filament render (single frame) |
| `assets/renders/sponza/filament_frame.png`        | Filament render of Sponza      |

Note: No SPP suffix for real-time renderers (they don't use progressive
sampling).  The image captures a single frame after warm-up.

---

## OSPRay Renderer Modes

OSPRay can render in multiple modes.  Each mode gets a separate result:

```
Path tracer:  assets/renders/<scene-id>/ospray_<spp>spp.exr       (standard)
Sci-vis:      assets/renders/<scene-id>/ospray_scivis_frame.png    (optional)
```

**Examples:**

| File                                                | Description                |
|-----------------------------------------------------|----------------------------|
| `assets/renders/cornell-box/ospray_1024spp.exr`    | OSPRay path tracer render  |
| `assets/renders/cornell-box/ospray_scivis_frame.png`| OSPRay scivis render       |

---

## Skipped/Incompatible Combinations

When a combination is skipped due to format incompatibility, no files are
produced.  The skip is recorded in the batch summary JSON with a reason.

Skipped combinations can be declared in the benchmark config YAML under the
`skip_combinations` section, or detected automatically by the format
compatibility pre-check in `run_benchmarks.py`.

The `scripts/format_compatibility.py` utility generates the full
compatibility matrix and can auto-generate `skip_combinations` config entries.

---

## Partial Results (Timeout / OOM)

If a render times out or crashes:

- The error log is saved: `logs/benchmarks/<scene-id>_<renderer-id>_error.log`
- No benchmark JSON is produced in `data/benchmarks/`
- No image files are produced in `assets/renders/`
- The failure is recorded in `logs/benchmarks/batch_summary.json`

---

## Git Tracking Rules

| Path                          | Tracked in Git? | Notes                                  |
|-------------------------------|-----------------|----------------------------------------|
| `data/benchmarks/**/*.json`   | **Yes**         | Small JSON — web app reads at build time |
| `assets/renders/**/*.webp`    | Optional        | ~6 MB total for Batch 1; OK to commit  |
| `assets/renders/**/*.exr`     | **No**          | 10–50 MB each; use Git LFS if needed   |
| `assets/renders/**/*.png`     | Optional        | Rasterizer output; small per file      |
| `logs/benchmarks/`            | **No**          | Ephemeral; generated locally            |
