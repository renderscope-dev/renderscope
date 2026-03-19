/**
 * Tree-Shaking Verification Script
 *
 * Verifies that importing specific component subsets does NOT pull in
 * unrelated heavy dependencies (D3, Recharts). Uses esbuild for fast
 * bundling and inspects the output for forbidden dependency strings.
 *
 * Usage: node scripts/verify-treeshake.mjs
 *
 * @author Ashutosh Mishra
 * @license Apache-2.0
 */

import { build } from "esbuild";
import { writeFileSync, readFileSync, mkdirSync, rmSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { gzipSync } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "..");
const DIST_ENTRY = join(PACKAGE_ROOT, "dist", "index.mjs");
const TMP_DIR = join(PACKAGE_ROOT, ".verify-treeshake-tmp");

// ── Test Cases ──────────────────────────────────────────────────────
const TEST_CASES = [
  {
    name: "ImageCompareSlider only",
    imports: "{ ImageCompareSlider }",
    forbiddenStrings: ["d3-force", "d3-zoom", "d3-drag", "recharts"],
    description: "Should not include D3 or Recharts",
  },
  {
    name: "All image components",
    imports:
      "{ ImageCompareSlider, ImageDiff, ImageSSIMHeatmap, ImageToggle, ImageSideBySide, RegionZoom }",
    forbiddenStrings: ["d3-force", "d3-zoom", "d3-drag", "recharts"],
    description: "Should not include D3 or Recharts",
  },
  {
    name: "FeatureMatrix only",
    imports: "{ FeatureMatrix }",
    forbiddenStrings: ["d3-force", "d3-zoom", "d3-drag", "recharts"],
    description: "Should not include D3 or Recharts",
  },
  {
    name: "TaxonomyGraph only",
    imports: "{ TaxonomyGraph }",
    forbiddenStrings: ["recharts"],
    description: "Should not include Recharts",
  },
  {
    name: "Utilities only (no components)",
    imports: "{ computePSNR, computeSSIM, TECHNIQUE_COLORS }",
    forbiddenStrings: ["d3-force", "d3-zoom", "d3-drag", "recharts"],
    description: "Should not include D3 or Recharts",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} kB`;
}

function gzipSize(content) {
  return gzipSync(content).length;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n  Tree-Shaking Verification\n");
  console.log("  Package: renderscope-ui");
  console.log(`  Entry:   ${DIST_ENTRY}\n`);

  // Verify dist exists
  try {
    statSync(DIST_ENTRY);
  } catch {
    console.error("  ERROR: dist/index.mjs not found. Run `npm run build` first.\n");
    process.exit(1);
  }

  // Create temp directory
  mkdirSync(TMP_DIR, { recursive: true });

  const results = [];
  let hasFailures = false;

  for (const testCase of TEST_CASES) {
    const entryFile = join(TMP_DIR, `test-${testCase.name.replace(/\s+/g, "-")}.mjs`);
    const outFile = join(TMP_DIR, `out-${testCase.name.replace(/\s+/g, "-")}.mjs`);

    // Write a temp entry file importing from the dist bundle
    writeFileSync(
      entryFile,
      `import ${testCase.imports} from '${DIST_ENTRY.replace(/\\/g, "/")}';\nconsole.log(${testCase.imports.replace(/[{}]/g, "").trim()});\n`
    );

    try {
      // Bundle with esbuild (tree-shaking enabled by default)
      await build({
        entryPoints: [entryFile],
        bundle: true,
        outfile: outFile,
        format: "esm",
        minify: true,
        treeShaking: true,
        external: ["react", "react-dom", "react/jsx-runtime"],
        logLevel: "silent",
        platform: "browser",
      });

      const outputContent = readFileSync(outFile, "utf-8");
      const rawSize = Buffer.byteLength(outputContent, "utf-8");
      const gzipped = gzipSize(Buffer.from(outputContent, "utf-8"));

      // Check for forbidden strings
      const violations = [];
      for (const forbidden of testCase.forbiddenStrings) {
        if (outputContent.includes(forbidden)) {
          violations.push(forbidden);
        }
      }

      const passed = violations.length === 0;
      if (!passed) hasFailures = true;

      results.push({
        name: testCase.name,
        description: testCase.description,
        rawSize,
        gzipSize: gzipped,
        passed,
        violations,
      });
    } catch (err) {
      hasFailures = true;
      results.push({
        name: testCase.name,
        description: testCase.description,
        rawSize: 0,
        gzipSize: 0,
        passed: false,
        violations: [`Build error: ${err.message}`],
      });
    }
  }

  // Clean up
  rmSync(TMP_DIR, { recursive: true, force: true });

  // ── Print Results ──

  console.log("  " + "─".repeat(72));
  console.log(
    "  " +
      "Test Case".padEnd(30) +
      "Raw Size".padEnd(12) +
      "Gzipped".padEnd(12) +
      "Status"
  );
  console.log("  " + "─".repeat(72));

  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    const statusColor = r.passed ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    console.log(
      "  " +
        r.name.padEnd(30) +
        formatBytes(r.rawSize).padEnd(12) +
        formatBytes(r.gzipSize).padEnd(12) +
        `${statusColor}${status}${reset}`
    );
    if (!r.passed) {
      for (const v of r.violations) {
        console.log(`  ${"".padEnd(30)}\x1b[31m→ Found: ${v}\x1b[0m`);
      }
    }
  }

  console.log("  " + "─".repeat(72));

  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const allPassed = passCount === totalCount;

  console.log(
    `\n  ${allPassed ? "\x1b[32m" : "\x1b[31m"}${passCount}/${totalCount} checks passed${"\x1b[0m"}\n`
  );

  if (hasFailures) {
    console.error(
      "  Tree-shaking verification FAILED. Heavy dependencies are leaking into\n" +
        "  component bundles that should not contain them. Check import chains.\n"
    );
    process.exit(1);
  }

  console.log("  Tree-shaking is working correctly.\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
