import { readFileSync } from "fs";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import dts from "rollup-plugin-dts";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

/**
 * Rollup configuration for renderscope-ui.
 *
 * Produces three outputs from a single input:
 *   1. ESM bundle  → dist/index.mjs
 *   2. CJS bundle  → dist/index.cjs
 *   3. Type declarations → dist/index.d.mts + dist/index.d.cts
 *
 * CSS is extracted to dist/theme.css (not injected via JS).
 */
export default [
  // ── Main build: ESM + CJS + CSS extraction ──
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.mjs",
        format: "esm",
        sourcemap: true,
      },
      {
        file: "dist/index.cjs",
        format: "cjs",
        sourcemap: true,
        interop: "auto",
      },
    ],
    plugins: [
      // Automatically externalize peer dependencies (react, react-dom)
      peerDepsExternal(),

      // Resolve bare module specifiers to node_modules
      resolve({
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      }),

      // Convert CommonJS modules to ESM
      commonjs(),

      // Compile TypeScript
      typescript({
        tsconfig: "./tsconfig.build.json",
        declaration: true,
        declarationDir: "./dist/types",
        sourceMap: true,
      }),

      // Extract CSS to a standalone file
      postcss({
        extract: "theme.css",
        minimize: true,
      }),
    ],
    external: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      ...Object.keys(pkg.peerDependencies || {}),
    ],
  },

  // ── Declaration bundling: consolidate .d.ts files ──
  {
    input: "dist/types/index.d.ts",
    output: [
      { file: "dist/index.d.mts", format: "esm" },
      { file: "dist/index.d.cts", format: "cjs" },
    ],
    plugins: [dts()],
    external: [/\.css$/],
  },
];
