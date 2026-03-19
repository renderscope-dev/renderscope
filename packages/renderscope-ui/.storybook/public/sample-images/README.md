# Sample Images for Storybook

The Storybook stories for image comparison components use **programmatically
generated data URLs** (via `src/components/ImageCompare/__stories__/sampleImages.ts`),
so no external image files are needed for the default stories.

## Adding real sample images

If you want to use actual rendered images for more realistic demos:

1. Place PNG or JPEG files in this directory (e.g., `pbrt-cornell.png`,
   `mitsuba-cornell.png`).
2. Reference them in stories as `/sample-images/your-file.png` -- Storybook
   serves files from `.storybook/public/` at the root URL.
3. Ensure image pairs have the **same dimensions** -- the `ImageDiff` and
   `ImageSSIMHeatmap` components require matching sizes.

## Recommended naming convention

```
<renderer>-<scene>.<ext>
```

Examples:
- `pbrt-cornell.png`
- `mitsuba3-cornell.png`
- `blender-cycles-cornell.png`
