"use client";

import Link from "next/link";
import {
  Database,
  ArrowLeft,
  FileJson,
  BarChart3,
  ImageIcon,
  Network,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import { CodeBlock } from "@/components/renderer/code-block";

/* ------------------------------------------------------------------ */
/*  Schema summaries                                                   */
/* ------------------------------------------------------------------ */

const schemas = [
  {
    icon: <FileJson className="h-5 w-5" />,
    title: "Renderer Metadata",
    location: "/data/renderers/{id}.json",
    schema: "renderer.schema.json",
    description:
      "One file per renderer. Contains technical metadata, feature flags, editorial strengths/limitations, and community links.",
    required:
      "id, name, version, description, technique, language, license, platforms, repository, first_release, status, tags, strengths, limitations, best_for, features",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Benchmark Results",
    location: "/data/benchmarks/{id}.json",
    schema: "benchmark.schema.json",
    description:
      "One file per benchmark run (renderer × scene × hardware). Includes render time, memory usage, image quality metrics, and convergence data.",
    required:
      "id, renderer_id, scene_id, hardware, settings, results",
  },
  {
    icon: <ImageIcon className="h-5 w-5" />,
    title: "Scene Metadata",
    location: "/data/scenes/{id}.json",
    schema: "scene.schema.json",
    description:
      "One file per standard benchmark scene. Describes geometry complexity, lighting, materials, and what rendering features the scene tests.",
    required: "id, name, description, complexity, tests, source",
  },
  {
    icon: <Network className="h-5 w-5" />,
    title: "Taxonomy Graph",
    location: "/data/taxonomy.json",
    schema: "taxonomy.schema.json",
    description:
      "Classification graph connecting renderers and technique categories. Defines nodes (renderers + categories) and edges (relationships).",
    required: "nodes, edges",
  },
] as const;

const quickStartSnippet = `# 1. Copy the template
cp data/renderers/_template.json data/renderers/your-renderer.json

# 2. Edit the file — fill in required fields, remove __comment_* keys

# 3. Validate
python scripts/validate_data.py`;

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */

export function SchemaPageContent() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <PageHeader
        icon={<Database className="h-12 w-12" />}
        title="Data Schema"
        subtitle="JSON schema documentation for renderer metadata, benchmarks, scenes, and the taxonomy graph. All data files validate against JSON Schema Draft 2020-12."
        accentColor="sky"
      />

      {/* ── Schema cards ─────────────────────────────────────── */}
      <div className="mt-16 space-y-6">
        {schemas.map((s, i) => (
          <motion.div
            key={s.title}
            className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{
              duration: 0.4,
              delay: i * 0.06,
              ease: "easeOut",
            }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="text-sky-400">{s.icon}</span>
              <h2 className="text-lg font-semibold text-foreground">
                {s.title}
              </h2>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              {s.description}
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-muted-foreground">
                  Location:
                </span>{" "}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5">
                  {s.location}
                </code>
              </p>
              <p>
                <span className="font-medium text-muted-foreground">
                  Schema:
                </span>{" "}
                <code className="rounded bg-zinc-900 px-1.5 py-0.5">
                  /schemas/{s.schema}
                </code>
              </p>
              <p>
                <span className="font-medium text-muted-foreground">
                  Required:
                </span>{" "}
                {s.required}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Quick start ──────────────────────────────────────── */}
      <motion.section
        className="mt-16"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h2 className="mb-4 text-xl font-bold tracking-tight text-foreground">
          Quick Start
        </h2>
        <CodeBlock code={quickStartSnippet} />
        <p className="mt-4 text-sm text-muted-foreground">
          See the{" "}
          <Link
            href="/docs/contributing"
            className="text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:decoration-sky-400"
          >
            Contributing guide
          </Link>{" "}
          for detailed step-by-step instructions.
        </p>
      </motion.section>

      {/* ── Back link ────────────────────────────────────────── */}
      <div className="mt-16">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Docs
        </Link>
      </div>
    </div>
  );
}
