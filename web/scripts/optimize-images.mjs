#!/usr/bin/env node

/**
 * Build-time image optimization pipeline for RenderScope.
 *
 * Since Next.js is configured with `images: { unoptimized: true }` for
 * static export, all image optimization must happen at build time.
 *
 * This script:
 *  1. Scans `public/renders/` and `public/images/` for source images.
 *  2. Generates optimized WebP variants at three sizes (thumb, medium, large).
 *  3. Generates tiny Base64-encoded blur placeholder data URIs.
 *  4. Writes an image manifest to `src/generated/image-manifest.json`.
 *  5. Is idempotent — skips images whose outputs are newer than the source.
 *
 * Usage:
 *   node scripts/optimize-images.mjs          # Process all images
 *   node scripts/optimize-images.mjs --force  # Re-process everything
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

// ── Resolve paths (Windows-safe) ─────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WEB_ROOT = resolve(__dirname, "..");

// ── sharp (dev dependency) ───────────────────────────────────

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.warn(
    "⚠  sharp is not installed. Skipping image optimization.\n" +
      "   Install it with: npm install -D sharp"
  );
  process.exit(0);
}

// ── Configuration ────────────────────────────────────────────

const SOURCE_DIRS = [
  { base: join(WEB_ROOT, "public", "renders"), prefix: "renders" },
  { base: join(WEB_ROOT, "public", "images"), prefix: "images" },
];

const OUTPUT_DIR = join(WEB_ROOT, "public", "optimized");
const MANIFEST_PATH = join(WEB_ROOT, "src", "generated", "image-manifest.json");

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".tiff",
  ".avif",
]);

const SIZES = {
  thumb: { width: 400, quality: 80 },
  medium: { width: 960, quality: 82 },
  large: { width: 1920, quality: 85 },
};

const BLUR_WIDTH = 16;
const FORCE = process.argv.includes("--force");

// ── Helpers ──────────────────────────────────────────────────

/** Recursively collect image files from a directory. */
function collectImageFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  function walk(d) {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/** Check if output is newer than source (mtime comparison). */
function isUpToDate(sourcePath, outputPath) {
  if (FORCE) return false;
  if (!existsSync(outputPath)) return false;
  try {
    const srcStat = statSync(sourcePath);
    const outStat = statSync(outputPath);
    return outStat.mtimeMs >= srcStat.mtimeMs;
  } catch {
    return false;
  }
}

/** Generate a slug-safe base name from a relative path. */
function toSlug(relativePath) {
  return relativePath
    .replace(/\\/g, "/")
    .replace(extname(relativePath), "")
    .replace(/\//g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

/** Ensure a directory exists. */
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Normalise a URL path (forward slashes, no double slashes). */
function normUrl(p) {
  return p.replace(/\\/g, "/").replace(/\/+/g, "/");
}

// ── Main Pipeline ────────────────────────────────────────────

async function main() {
  const startTime = performance.now();
  console.log("🖼  RenderScope Image Optimization Pipeline\n");

  /** @type {Record<string, {thumb: string, medium: string, large: string, width: number, height: number, blurDataURL: string}>} */
  const manifest = {};
  let processedCount = 0;
  let skippedCount = 0;
  let totalCount = 0;

  for (const { base, prefix } of SOURCE_DIRS) {
    if (!existsSync(base)) {
      console.log(`   Skipping ${prefix}/ (directory not found)`);
      continue;
    }

    const files = collectImageFiles(base);
    console.log(`   Found ${files.length} image(s) in ${prefix}/`);

    for (const sourcePath of files) {
      totalCount++;
      const relPath = relative(base, sourcePath).replace(/\\/g, "/");
      const slug = toSlug(relPath);
      const manifestKey = `${prefix}/${relPath}`;
      const outputSubdir = join(OUTPUT_DIR, prefix);
      ensureDir(outputSubdir);

      // Build output URL paths
      const entry = {
        thumb: normUrl(`/optimized/${prefix}/${slug}-thumb.webp`),
        medium: normUrl(`/optimized/${prefix}/${slug}-medium.webp`),
        large: normUrl(`/optimized/${prefix}/${slug}-large.webp`),
        width: 0,
        height: 0,
        blurDataURL: "",
      };

      // Resolve output file paths on disk
      const outputPaths = {
        thumb: join(outputSubdir, `${slug}-thumb.webp`),
        medium: join(outputSubdir, `${slug}-medium.webp`),
        large: join(outputSubdir, `${slug}-large.webp`),
      };

      // Check if all outputs are up-to-date
      const allUpToDate =
        isUpToDate(sourcePath, outputPaths.thumb) &&
        isUpToDate(sourcePath, outputPaths.medium) &&
        isUpToDate(sourcePath, outputPaths.large);

      if (allUpToDate) {
        try {
          const meta = await sharp(sourcePath).metadata();
          entry.width = meta.width ?? 0;
          entry.height = meta.height ?? 0;

          const blurBuf = await sharp(sourcePath)
            .resize(BLUR_WIDTH)
            .webp({ quality: 20 })
            .toBuffer();
          entry.blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;
        } catch {
          // Non-critical — metadata and blur are best-effort
        }

        manifest[manifestKey] = entry;
        skippedCount++;
        continue;
      }

      // Process the image
      try {
        const meta = await sharp(sourcePath).metadata();
        entry.width = meta.width ?? 0;
        entry.height = meta.height ?? 0;

        // Generate each size variant
        for (const [sizeName, config] of Object.entries(SIZES)) {
          const targetWidth = Math.min(
            config.width,
            entry.width || config.width
          );

          await sharp(sourcePath)
            .resize(targetWidth, undefined, { withoutEnlargement: true })
            .webp({ quality: config.quality })
            .toFile(outputPaths[sizeName]);
        }

        // Generate blur placeholder
        const blurBuf = await sharp(sourcePath)
          .resize(BLUR_WIDTH)
          .webp({ quality: 20 })
          .toBuffer();
        entry.blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;

        manifest[manifestKey] = entry;
        processedCount++;

        if (processedCount % 10 === 0) {
          process.stdout.write(`   Processed ${processedCount} images...\r`);
        }
      } catch (err) {
        console.error(`   ⚠ Failed to process ${manifestKey}: ${err.message}`);
        manifest[manifestKey] = {
          thumb: `/${manifestKey}`,
          medium: `/${manifestKey}`,
          large: `/${manifestKey}`,
          width: 0,
          height: 0,
          blurDataURL: "",
        };
      }
    }
  }

  // Write manifest
  ensureDir(dirname(MANIFEST_PATH));
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n✅ Image optimization complete in ${elapsed}s\n` +
      `   Total: ${totalCount} | Processed: ${processedCount} | Skipped (up-to-date): ${skippedCount}\n` +
      `   Manifest: ${relative(WEB_ROOT, MANIFEST_PATH)}`
  );
}

main().catch((err) => {
  console.error("❌ Image optimization failed:", err);
  process.exit(1);
});
