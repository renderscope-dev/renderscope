/**
 * OG Image Generator — Phase 29
 *
 * Generates 1200×630 PNG Open Graph images for every page type.
 * Uses satori (React JSX → SVG) + @resvg/resvg-js (SVG → PNG).
 *
 * Run: npx tsx scripts/generate-og-images.ts
 */

import React from "react";
import type { ReactNode } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

// ── Configuration ───────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(process.cwd(), "public", "og");
const WIDTH = 1200;
const HEIGHT = 630;

const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");
const interBold = fs.readFileSync(path.join(FONTS_DIR, "Inter-Bold.ttf"));
const interRegular = fs.readFileSync(
  path.join(FONTS_DIR, "Inter-Regular.ttf")
);

const fonts: { name: string; data: Buffer; weight: 700 | 400; style: "normal" }[] = [
  { name: "Inter", data: interBold, weight: 700, style: "normal" },
  { name: "Inter", data: interRegular, weight: 400, style: "normal" },
];

// ── Technique color mapping (matches the site's CSS) ────────────────────────

const TECHNIQUE_COLORS: Record<string, string> = {
  path_tracing: "#3b82f6",    // blue-500
  ray_tracing: "#3b82f6",
  rasterization: "#10b981",   // emerald-500
  neural: "#a855f7",          // purple-500
  gaussian_splatting: "#ec4899", // pink-500
  differentiable: "#f43f5e",  // rose-500
  volume_rendering: "#f97316", // orange-500
  volume: "#f97316",
  ray_marching: "#06b6d4",    // cyan-500
  hybrid: "#3b82f6",
  educational: "#f59e0b",     // amber-500
};

// ── Core render pipeline ────────────────────────────────────────────────────

async function generateImage(jsx: ReactNode, filename: string) {
  try {
    const svg = await satori(jsx as React.ReactElement, {
      width: WIDTH,
      height: HEIGHT,
      fonts,
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: WIDTH },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), pngBuffer);
    console.log(`  \u2713 ${filename}`);
  } catch (err) {
    console.error(`  \u2717 Failed to generate ${filename}:`, err);
  }
}

// ── Shared layout wrapper ───────────────────────────────────────────────────

function OGLayout({
  children,
  accentColor = "#3b82f6",
}: {
  children: ReactNode;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#0a0a0f",
        padding: "60px 64px 40px",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
        }}
      >
        {children}
      </div>

      {/* Bottom bar: accent gradient + wordmark */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            height: "3px",
            width: "100%",
            background: `linear-gradient(to right, ${accentColor}, ${accentColor}44)`,
            borderRadius: "2px",
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#ffffff",
              display: "flex",
            }}
          >
            RenderScope
          </div>
          <div
            style={{
              fontSize: "16px",
              color: "#71717a",
              display: "flex",
            }}
          >
            renderscope.dev
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Image templates ─────────────────────────────────────────────────────────

function createDefaultOG() {
  return (
    <OGLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "56px", fontWeight: 700, color: "#ffffff", display: "flex" }}>
          RenderScope
        </div>
        <div
          style={{
            fontSize: "28px",
            fontWeight: 400,
            color: "#a1a1aa",
            display: "flex",
            lineHeight: 1.4,
          }}
        >
          Catalog, Compare & Benchmark Rendering Engines
        </div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 400,
            color: "#71717a",
            display: "flex",
            marginTop: "8px",
          }}
        >
          50+ open source renderers \u2022 Path tracers \u2022 Neural renderers \u2022 Real-time engines
        </div>
      </div>
    </OGLayout>
  );
}

function createExploreOG() {
  return (
    <OGLayout accentColor="#10b981">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#10b981",
            textTransform: "uppercase",
            letterSpacing: "2px",
            display: "flex",
          }}
        >
          Explore
        </div>
        <div style={{ fontSize: "48px", fontWeight: 700, color: "#ffffff", display: "flex" }}>
          50+ Open Source Renderers
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 400,
            color: "#a1a1aa",
            display: "flex",
            lineHeight: 1.4,
          }}
        >
          Browse and filter by technique, language, license, and platform
        </div>
      </div>
    </OGLayout>
  );
}

function createRendererOG(renderer: {
  id: string;
  name: string;
  description: string;
  technique: string[];
  language: string;
  license: string;
}) {
  const primaryTechnique = renderer.technique[0] ?? "path_tracing";
  const accentColor = TECHNIQUE_COLORS[primaryTechnique] ?? "#3b82f6";
  const techniqueLabel = primaryTechnique
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Truncate description to fit
  const desc =
    renderer.description.length > 120
      ? renderer.description.slice(0, 117) + "\u2026"
      : renderer.description;

  return (
    <OGLayout accentColor={accentColor}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: accentColor,
              backgroundColor: `${accentColor}22`,
              padding: "4px 12px",
              borderRadius: "6px",
              display: "flex",
            }}
          >
            {techniqueLabel}
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#71717a",
              display: "flex",
            }}
          >
            {renderer.language} \u2022 {renderer.license}
          </div>
        </div>
        <div style={{ fontSize: "52px", fontWeight: 700, color: "#ffffff", display: "flex" }}>
          {renderer.name}
        </div>
        <div
          style={{
            fontSize: "22px",
            fontWeight: 400,
            color: "#a1a1aa",
            display: "flex",
            lineHeight: 1.4,
          }}
        >
          {desc}
        </div>
      </div>
    </OGLayout>
  );
}

function createCompareOG() {
  return (
    <OGLayout accentColor="#f59e0b">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#f59e0b",
            textTransform: "uppercase",
            letterSpacing: "2px",
            display: "flex",
          }}
        >
          Compare
        </div>
        <div style={{ fontSize: "48px", fontWeight: 700, color: "#ffffff", display: "flex" }}>
          Compare Renderers Side by Side
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 400,
            color: "#a1a1aa",
            display: "flex",
            lineHeight: 1.4,
          }}
        >
          Feature matrices, visual output comparisons, and performance benchmarks
        </div>
      </div>
    </OGLayout>
  );
}

function createGalleryOG() {
  return (
    <OGLayout accentColor="#8b5cf6">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#8b5cf6",
            textTransform: "uppercase",
            letterSpacing: "2px",
            display: "flex",
          }}
        >
          Gallery
        </div>
        <div style={{ fontSize: "48px", fontWeight: 700, color: "#ffffff", display: "flex" }}>
          Render Gallery
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 400,
            color: "#a1a1aa",
            display: "flex",
            lineHeight: 1.4,
          }}
        >
          Same scene, different engines — Cornell Box, Sponza, Stanford Bunny, and more
        </div>
      </div>
    </OGLayout>
  );
}

function createBenchmarksOG() {
  return (
    <OGLayout accentColor="#ef4444">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#ef4444",
            textTransform: "uppercase",
            letterSpacing: "2px",
            display: "flex",
          }}
        >
          Benchmarks
        </div>
        <div style={{ fontSize: "48px", fontWeight: 700, color: "#ffffff", display: "flex" }}>
          Performance Benchmarks
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 400,
            color: "#a1a1aa",
            display: "flex",
            lineHeight: 1.4,
          }}
        >
          Render times, memory usage, PSNR, SSIM — standardized across 50+ renderers
        </div>
      </div>
    </OGLayout>
  );
}

function createLearnOG() {
  return (
    <OGLayout accentColor="#06b6d4">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#06b6d4",
            textTransform: "uppercase",
            letterSpacing: "2px",
            display: "flex",
          }}
        >
          Learn
        </div>
        <div style={{ fontSize: "48px", fontWeight: 700, color: "#ffffff", display: "flex" }}>
          Learn Rendering Techniques
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 400,
            color: "#a1a1aa",
            display: "flex",
            lineHeight: 1.4,
          }}
        >
          Path tracing, rasterization, neural radiance fields, Gaussian splatting, and more
        </div>
      </div>
    </OGLayout>
  );
}

function createTechniqueOG(technique: {
  id: string;
  name: string;
  shortDescription: string;
  accentColor: string;
}) {
  const COLOR_MAP: Record<string, string> = {
    blue: "#3b82f6",
    green: "#10b981",
    purple: "#a855f7",
    pink: "#ec4899",
    orange: "#f97316",
    rose: "#f43f5e",
    cyan: "#06b6d4",
  };
  const accentColor = COLOR_MAP[technique.accentColor] ?? "#3b82f6";

  const desc =
    technique.shortDescription.length > 140
      ? technique.shortDescription.slice(0, 137) + "\u2026"
      : technique.shortDescription;

  return (
    <OGLayout accentColor={accentColor}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: "2px",
            display: "flex",
          }}
        >
          Rendering Technique
        </div>
        <div style={{ fontSize: "48px", fontWeight: 700, color: "#ffffff", display: "flex" }}>
          {technique.name}
        </div>
        <div
          style={{
            fontSize: "22px",
            fontWeight: 400,
            color: "#a1a1aa",
            display: "flex",
            lineHeight: 1.4,
          }}
        >
          {desc}
        </div>
      </div>
    </OGLayout>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

interface RendererJson {
  id: string;
  name: string;
  description: string;
  technique: string[];
  language: string;
  license: string;
}

interface TechniqueJson {
  id: string;
  name: string;
  shortDescription: string;
  accentColor: string;
}

async function main() {
  const startTime = Date.now();
  console.log("Generating OG images...\n");

  let generated = 0;
  let failed = 0;

  // 1. Default
  await generateImage(createDefaultOG(), "default.png");
  generated++;

  // 2. Explore
  await generateImage(createExploreOG(), "explore.png");
  generated++;

  // 3. Compare
  await generateImage(createCompareOG(), "compare.png");
  generated++;

  // 4. Gallery
  await generateImage(createGalleryOG(), "gallery.png");
  generated++;

  // 5. Benchmarks
  await generateImage(createBenchmarksOG(), "benchmarks.png");
  generated++;

  // 6. Learn
  await generateImage(createLearnOG(), "learn.png");
  generated++;

  // 7. Per-Renderer
  const renderersDir = path.join(process.cwd(), "..", "data", "renderers");
  if (fs.existsSync(renderersDir)) {
    const rendererFiles = fs
      .readdirSync(renderersDir)
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

    console.log(`\nGenerating ${rendererFiles.length} renderer OG images...`);

    for (const file of rendererFiles) {
      try {
        const raw = fs.readFileSync(path.join(renderersDir, file), "utf-8");
        const renderer = JSON.parse(raw) as RendererJson;
        await generateImage(
          createRendererOG(renderer),
          `renderer-${renderer.id}.png`
        );
        generated++;
      } catch (err) {
        console.error(`  \u2717 Failed to process ${file}:`, err);
        failed++;
      }
    }
  }

  // 8. Per-Technique
  const techniquesPath = path.join(process.cwd(), "..", "data", "techniques.json");
  if (fs.existsSync(techniquesPath)) {
    const raw = fs.readFileSync(techniquesPath, "utf-8");
    const techniques = JSON.parse(raw) as TechniqueJson[];

    console.log(`\nGenerating ${techniques.length} technique OG images...`);

    for (const technique of techniques) {
      await generateImage(
        createTechniqueOG(technique),
        `learn-${technique.id}.png`
      );
      generated++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\nDone! Generated ${generated} images${failed > 0 ? `, ${failed} failed` : ""} in ${elapsed}s`
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
