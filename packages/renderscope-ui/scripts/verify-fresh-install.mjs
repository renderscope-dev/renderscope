/**
 * Fresh Install Verification Script
 *
 * Verifies that the packed tarball installs correctly in a clean project
 * and that all key exports resolve properly. This is the ultimate smoke
 * test — if this passes, consumers will be able to install and use the package.
 *
 * Usage: node scripts/verify-fresh-install.mjs
 *
 * Prerequisites: Run `npm pack` first to produce the .tgz tarball.
 *
 * @author Ashutosh Mishra
 * @license Apache-2.0
 */

import { execSync } from "child_process";
import {
  readdirSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "..");
const TMP_DIR = join(PACKAGE_ROOT, ".verify-install-tmp");

// ── Helpers ──────────────────────────────────────────────────────────

function log(msg) {
  console.log(`  ${msg}`);
}

function pass(msg) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function fail(msg) {
  console.error(`  \x1b[31m✗\x1b[0m ${msg}`);
}

function exec(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    ...opts,
  });
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n  Fresh Install Verification\n");

  // Step 1: Find the .tgz tarball
  const tgzFiles = readdirSync(PACKAGE_ROOT).filter((f) => f.endsWith(".tgz"));

  if (tgzFiles.length === 0) {
    fail("No .tgz file found. Run `npm pack` first.");
    process.exit(1);
  }

  const tarball = resolve(PACKAGE_ROOT, tgzFiles[0]);
  log(`Tarball: ${tgzFiles[0]}`);

  // Step 2: Create a clean temp project
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(TMP_DIR, { recursive: true });

  writeFileSync(
    join(TMP_DIR, "package.json"),
    JSON.stringify(
      {
        name: "verify-install-test",
        version: "1.0.0",
        private: true,
        type: "module",
      },
      null,
      2
    )
  );

  // Step 3: Install the tarball + peer dependencies
  log("Installing package from tarball...");
  try {
    exec(`npm install "${tarball.replace(/\\/g, "/")}" react react-dom`, {
      cwd: TMP_DIR,
    });
    pass("Package installed successfully");
  } catch (err) {
    fail(`Installation failed: ${err.stderr || err.message}`);
    cleanup();
    process.exit(1);
  }

  // Step 4: Write a test file that imports key exports
  const testFile = join(TMP_DIR, "test-imports.mjs");
  writeFileSync(
    testFile,
    `
import {
  ImageCompareSlider,
  ImageDiff,
  ImageSSIMHeatmap,
  ImageToggle,
  ImageSideBySide,
  RegionZoom,
  TaxonomyGraph,
  FeatureMatrix,
  FeatureCell,
  FeatureGroupHeader,
  useImageLoader,
  usePixelSampler,
  useResizeObserver,
  useSyncedZoom,
  VERSION,
  TECHNIQUE_COLORS,
  computePSNR,
  computeSSIM,
  loadImageData,
  getColor,
  getColorMap,
  RENDERSCOPE_FEATURE_CATEGORIES,
  getAllFeatureKeys,
  getFeatureLabel,
} from "renderscope-ui";

const checks = [
  ["ImageCompareSlider", typeof ImageCompareSlider === "function"],
  ["ImageDiff", typeof ImageDiff === "function"],
  ["ImageSSIMHeatmap", typeof ImageSSIMHeatmap === "function"],
  ["ImageToggle", typeof ImageToggle === "function"],
  ["ImageSideBySide", typeof ImageSideBySide === "function"],
  ["RegionZoom", typeof RegionZoom === "function"],
  ["TaxonomyGraph", typeof TaxonomyGraph === "function"],
  ["FeatureMatrix", typeof FeatureMatrix === "function"],
  ["FeatureCell", typeof FeatureCell === "function"],
  ["FeatureGroupHeader", typeof FeatureGroupHeader === "function"],
  ["useImageLoader", typeof useImageLoader === "function"],
  ["usePixelSampler", typeof usePixelSampler === "function"],
  ["useResizeObserver", typeof useResizeObserver === "function"],
  ["useSyncedZoom", typeof useSyncedZoom === "function"],
  ["VERSION", typeof VERSION === "string" && VERSION.length > 0],
  ["TECHNIQUE_COLORS", typeof TECHNIQUE_COLORS === "object" && TECHNIQUE_COLORS !== null],
  ["computePSNR", typeof computePSNR === "function"],
  ["computeSSIM", typeof computeSSIM === "function"],
  ["loadImageData", typeof loadImageData === "function"],
  ["getColor", typeof getColor === "function"],
  ["getColorMap", typeof getColorMap === "function"],
  ["RENDERSCOPE_FEATURE_CATEGORIES", Array.isArray(RENDERSCOPE_FEATURE_CATEGORIES)],
  ["getAllFeatureKeys", typeof getAllFeatureKeys === "function"],
  ["getFeatureLabel", typeof getFeatureLabel === "function"],
];

let passed = 0;
let failed = 0;

for (const [name, ok] of checks) {
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error("FAIL: " + name);
  }
}

console.log(JSON.stringify({ passed, failed, total: checks.length }));
process.exit(failed > 0 ? 1 : 0);
`
  );

  // Step 5: Run the test file
  log("Verifying exports...");
  try {
    const output = exec(`node "${testFile.replace(/\\/g, "/")}"`, {
      cwd: TMP_DIR,
    });
    const result = JSON.parse(output.trim());
    if (result.failed === 0) {
      pass(`All ${result.total} exports verified`);
    } else {
      fail(`${result.failed}/${result.total} export checks failed`);
      cleanup();
      process.exit(1);
    }
  } catch (err) {
    fail(`Import verification failed: ${err.stderr || err.message}`);
    cleanup();
    process.exit(1);
  }

  // Step 6: Verify CSS file exists
  log("Verifying CSS file...");
  const cssPath = join(
    TMP_DIR,
    "node_modules",
    "renderscope-ui",
    "dist",
    "theme.css"
  );
  if (existsSync(cssPath)) {
    pass("CSS file (dist/theme.css) exists");
  } else {
    fail("CSS file (dist/theme.css) not found");
    cleanup();
    process.exit(1);
  }

  // Step 7: Verify type declarations exist
  log("Verifying type declarations...");
  const dtsPath = join(
    TMP_DIR,
    "node_modules",
    "renderscope-ui",
    "dist",
    "index.d.mts"
  );
  if (existsSync(dtsPath)) {
    pass("Type declarations (dist/index.d.mts) exist");
  } else {
    fail("Type declarations (dist/index.d.mts) not found");
    cleanup();
    process.exit(1);
  }

  // Step 8: Verify LICENSE and CHANGELOG are included
  log("Verifying package files...");
  const licensePath = join(
    TMP_DIR,
    "node_modules",
    "renderscope-ui",
    "LICENSE"
  );
  const changelogPath = join(
    TMP_DIR,
    "node_modules",
    "renderscope-ui",
    "CHANGELOG.md"
  );
  const readmePath = join(
    TMP_DIR,
    "node_modules",
    "renderscope-ui",
    "README.md"
  );

  if (existsSync(licensePath)) {
    pass("LICENSE file included");
  } else {
    fail("LICENSE file not included in package");
  }

  if (existsSync(changelogPath)) {
    pass("CHANGELOG.md included");
  } else {
    fail("CHANGELOG.md not included in package");
  }

  if (existsSync(readmePath)) {
    pass("README.md included");
  } else {
    fail("README.md not included in package");
  }

  cleanup();
  console.log("\n  Fresh install verification passed.\n");
}

function cleanup() {
  rmSync(TMP_DIR, { recursive: true, force: true });

  // Clean up .tgz files
  const tgzFiles = readdirSync(PACKAGE_ROOT).filter((f) => f.endsWith(".tgz"));
  for (const f of tgzFiles) {
    rmSync(join(PACKAGE_ROOT, f), { force: true });
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  cleanup();
  process.exit(1);
});
