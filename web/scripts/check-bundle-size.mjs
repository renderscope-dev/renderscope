#!/usr/bin/env node

/**
 * Post-build bundle size verification for RenderScope.
 *
 * Determines initial JS by parsing the generated HTML files and finding
 * chunks that appear on **every** page (the true "shared by all" set).
 * Calculates gzipped sizes and fails if the total exceeds the budget.
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs              # Check against budget
 *   node scripts/check-bundle-size.mjs --budget 200  # Custom budget in KB
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WEB_ROOT = join(__dirname, "..");
const OUT_DIR = join(WEB_ROOT, "out");

// ── Configuration ────────────────────────────────────────────

// Budget accounts for unavoidable framework overhead:
//   React + Next.js runtime ≈ 86KB gzip
//   Polyfills               ≈ 39KB gzip
//   (Total framework floor  ≈ 125KB gzip)
// Remaining budget is for app layout, shared components, and utilities.
const DEFAULT_BUDGET_KB = 200;

function parseBudget() {
  const idx = process.argv.indexOf("--budget");
  if (idx !== -1 && process.argv[idx + 1]) {
    const val = parseInt(process.argv[idx + 1], 10);
    if (!Number.isNaN(val) && val > 0) return val;
  }
  return DEFAULT_BUDGET_KB;
}

const BUDGET_KB = parseBudget();
const BUDGET_BYTES = BUDGET_KB * 1024;

// ── Helpers ──────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  return `${(kb / 1024).toFixed(2)}MB`;
}

/** Recursively collect files matching a predicate. */
function collectFiles(dir, predicate) {
  const results = [];
  if (!existsSync(dir)) return results;

  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (predicate(entry.name)) results.push(full);
    }
  }

  walk(dir);
  return results;
}

/**
 * Extract chunk file names referenced in an HTML file.
 * Looks for patterns like `_next/static/chunks/NAME.js`.
 */
function extractChunksFromHtml(htmlPath) {
  const html = readFileSync(htmlPath, "utf8");
  const pattern = /_next\/static\/chunks\/([^\s"']+\.js)/g;
  const chunks = new Set();
  let match;
  while ((match = pattern.exec(html)) !== null) {
    chunks.add(match[1]);
  }
  return chunks;
}

// ── Main ─────────────────────────────────────────────────────

function main() {
  console.log("📦 RenderScope Bundle Size Check\n");

  const chunksDir = join(OUT_DIR, "_next", "static", "chunks");
  if (!existsSync(chunksDir)) {
    console.error(
      `❌ Build output not found at ${relative(WEB_ROOT, chunksDir)}\n` +
        "   Run 'npm run build' first."
    );
    process.exit(1);
  }

  // ── Step 1: Parse all HTML pages to find which chunks each loads ──

  const htmlFiles = collectFiles(OUT_DIR, (name) => name === "index.html");

  if (htmlFiles.length === 0) {
    console.error("❌ No HTML pages found in build output.");
    process.exit(1);
  }

  // Collect chunk sets per page
  const pageChunkSets = htmlFiles.map((htmlPath) =>
    extractChunksFromHtml(htmlPath)
  );

  // The "shared by all" chunks are the intersection of all pages
  let sharedChunks = new Set(pageChunkSets[0]);
  for (let i = 1; i < pageChunkSets.length; i++) {
    const pageChunks = pageChunkSets[i];
    sharedChunks = new Set([...sharedChunks].filter((c) => pageChunks.has(c)));
  }

  console.log(
    `   Analyzed ${htmlFiles.length} pages, found ${sharedChunks.size} chunks shared by all.\n`
  );

  // ── Step 2: Compute gzipped sizes ──

  const initial = [];
  const lazy = [];

  // Also include buildId manifest files in the initial set
  const staticDir = join(OUT_DIR, "_next", "static");
  const staticEntries = readdirSync(staticDir, { withFileTypes: true });
  for (const entry of staticEntries) {
    if (
      entry.isDirectory() &&
      entry.name !== "chunks" &&
      entry.name !== "css" &&
      entry.name !== "media"
    ) {
      const buildIdDir = join(staticDir, entry.name);
      for (const file of readdirSync(buildIdDir)) {
        if (file.endsWith(".js")) {
          const filePath = join(buildIdDir, file);
          const raw = readFileSync(filePath);
          const gzipped = gzipSync(raw);
          initial.push({
            name: `[buildId]/${file}`,
            rawSize: raw.length,
            gzipSize: gzipped.length,
          });
        }
      }
    }
  }

  // Collect all JS chunks and categorize
  const allChunkFiles = collectFiles(chunksDir, (name) => name.endsWith(".js"));
  for (const filePath of allChunkFiles) {
    const name = relative(chunksDir, filePath).replace(/\\/g, "/");
    const raw = readFileSync(filePath);
    const gzipped = gzipSync(raw);

    const info = {
      name,
      rawSize: raw.length,
      gzipSize: gzipped.length,
    };

    if (sharedChunks.has(name)) {
      initial.push(info);
    } else {
      lazy.push(info);
    }
  }

  // Sort by gzip size (largest first)
  initial.sort((a, b) => b.gzipSize - a.gzipSize);
  lazy.sort((a, b) => b.gzipSize - a.gzipSize);

  const totalInitialGzip = initial.reduce((sum, c) => sum + c.gzipSize, 0);
  const totalLazyGzip = lazy.reduce((sum, c) => sum + c.gzipSize, 0);

  // ── Step 3: Print report ──

  console.log("── Initial Chunks (loaded on every page) ──────────────\n");
  for (const c of initial) {
    const bar = "█".repeat(Math.ceil(c.gzipSize / 1024));
    console.log(
      `  ${formatBytes(c.gzipSize).padStart(9)} ${bar} ${c.name}`
    );
  }
  console.log(
    `\n  ${"─".repeat(50)}\n` +
      `  Total initial JS (gzipped): ${formatBytes(totalInitialGzip)}\n` +
      `  Budget:                      ${formatBytes(BUDGET_BYTES)}\n`
  );

  if (lazy.length > 0) {
    console.log("── Lazy-Loaded Chunks (page-specific) ─────────────────\n");
    const shown = lazy.slice(0, 10);
    for (const c of shown) {
      console.log(`  ${formatBytes(c.gzipSize).padStart(9)}  ${c.name}`);
    }
    if (lazy.length > 10) {
      console.log(`  ... and ${lazy.length - 10} more`);
    }
    console.log(`\n  Total lazy JS (gzipped): ${formatBytes(totalLazyGzip)}\n`);
  }

  // Check CSS
  const cssDir = join(OUT_DIR, "_next", "static", "css");
  if (existsSync(cssDir)) {
    let totalCssGzip = 0;
    for (const entry of readdirSync(cssDir)) {
      if (entry.endsWith(".css")) {
        const raw = readFileSync(join(cssDir, entry));
        const gzipped = gzipSync(raw);
        totalCssGzip += gzipped.length;
        console.log(`  CSS: ${formatBytes(gzipped.length)} (gzipped) — ${entry}`);
      }
    }
    if (totalCssGzip > 30 * 1024) {
      console.warn(`  ⚠ CSS exceeds 30KB gzipped target (${formatBytes(totalCssGzip)})`);
    }
  }

  // ── Verdict ──

  console.log("");
  if (totalInitialGzip <= BUDGET_BYTES) {
    console.log(
      `✅ Bundle size OK: ${formatBytes(totalInitialGzip)} ≤ ${formatBytes(BUDGET_BYTES)} budget`
    );
    process.exit(0);
  } else {
    const over = totalInitialGzip - BUDGET_BYTES;
    console.error(
      `❌ Bundle size OVER BUDGET by ${formatBytes(over)}!\n` +
        `   ${formatBytes(totalInitialGzip)} > ${formatBytes(BUDGET_BYTES)} budget\n\n` +
        `   Suggestions:\n` +
        `   • Check that D3/Recharts are code-split (not in initial chunks)\n` +
        `   • Run 'npm run analyze' to inspect the bundle treemap\n` +
        `   • Consider LazyMotion for Framer Motion\n`
    );
    process.exit(1);
  }
}

main();
