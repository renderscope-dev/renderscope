"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Zap,
  Monitor,
  Brain,
  GitBranch,
  Layers,
  GraduationCap,
  Copy,
  Check,
  Github,
  Package,
  Terminal,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { FeaturePreviewCard } from "@/components/feature-preview-card";
import { HeroBackground } from "@/components/layout/hero-background";
import { TaxonomyPreviewSkeleton } from "@/components/taxonomy/TaxonomyPreviewSkeleton";
import { siteConfig } from "@/lib/constants";
import type { ProcessedGraphData } from "@/types/taxonomy";

// Lazy-load the TaxonomyPreview to keep D3 out of the critical bundle
const TaxonomyPreview = dynamic(
  () =>
    import("@/components/taxonomy/TaxonomyPreview").then(
      (mod) => mod.TaxonomyPreview
    ),
  {
    ssr: false,
    loading: () => <TaxonomyPreviewSkeleton />,
  }
);

const categories = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Path Tracing",
    description: "Physically accurate light simulation",
    accentColor: "blue",
  },
  {
    icon: <Monitor className="h-5 w-5" />,
    title: "Rasterization",
    description: "Real-time graphics & game engines",
    accentColor: "green",
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "Neural Rendering",
    description: "NeRF, Gaussian Splatting & beyond",
    accentColor: "purple",
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Differentiable",
    description: "Gradient-based inverse rendering",
    accentColor: "pink",
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Volume Rendering",
    description: "Scientific & medical visualization",
    accentColor: "orange",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Educational",
    description: "Learn rendering from the source",
    accentColor: "amber",
  },
];

const terminalLines = [
  "pip install renderscope",
  "renderscope list",
  "renderscope compare image_a.exr image_b.exr --metrics psnr ssim",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

function InstallChip({ icon, command }: { icon: React.ReactNode; command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-secondary/50 px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {icon}
      <span>{command}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}

interface HomePageContentProps {
  graphData: ProcessedGraphData | null;
  rendererCount: number;
}

export function HomePageContent({
  graphData,
  rendererCount,
}: HomePageContentProps) {
  return (
    <div className="flex flex-col">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
        {/* Animated hero background */}
        <HeroBackground />

        <motion.div
          className="relative z-10 max-w-3xl space-y-6"
          initial="initial"
          animate="animate"
          variants={{
            animate: { transition: { staggerChildren: 0.15 } },
          }}
        >
          {/* Badge */}
          <motion.div
            variants={{
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center rounded-full border border-border/50 bg-secondary/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="mr-2 inline-block h-1.5 w-1.5 animate-glow-pulse rounded-full bg-primary" />
              Under Active Development
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
            variants={{
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-foreground">Render</span>
            <span className="text-gradient">Scope</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mx-auto max-w-2xl text-xl text-muted-foreground sm:text-2xl"
            variants={{
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5 }}
          >
            Catalog, compare, and benchmark open source rendering engines.
          </motion.p>

          {/* Accent Line */}
          <motion.div
            className="mx-auto h-px w-12 bg-gradient-to-r from-blue-500 to-purple-500"
            variants={{
              initial: { opacity: 0, scaleX: 0 },
              animate: { opacity: 1, scaleX: 1 },
            }}
            transition={{ duration: 0.5 }}
          />

          {/* CTAs */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
            variants={{
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/explore"
              className="inline-flex h-11 items-center rounded-md bg-blue-700 px-6 text-sm font-medium text-white shadow transition-colors hover:bg-blue-800"
            >
              Explore Renderers
            </Link>
            <Link
              href="/learn"
              className="inline-flex h-11 items-center rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              Learn More
            </Link>
          </motion.div>

          {/* Install commands */}
          <motion.div
            className="flex flex-col items-center gap-3 pt-2"
            variants={{
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-wrap items-center justify-center gap-2">
              <InstallChip icon={<Terminal className="h-3.5 w-3.5" />} command="pip install renderscope" />
              <InstallChip icon={<Package className="h-3.5 w-3.5" />} command="npm install renderscope" />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <span className="text-border">|</span>
              <a
                href={siteConfig.pypi}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                PyPI
              </a>
              <span className="text-border">|</span>
              <a
                href={siteConfig.npm}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                npm
              </a>
            </div>
          </motion.div>

          {/* Stats line */}
          <motion.p
            className="text-sm text-muted-foreground"
            variants={{
              initial: { opacity: 0 },
              animate: { opacity: 1 },
            }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {rendererCount > 0 ? `${rendererCount}` : "50+"} renderers &middot; 7 categories &middot; 100% open source
          </motion.p>
        </motion.div>
      </section>

      {/* ── Category Preview Section ─────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.h2
          className="mb-12 text-center text-3xl font-bold tracking-tight text-foreground"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          Every rendering technique. One platform.
        </motion.h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <FeaturePreviewCard
              key={cat.title}
              icon={cat.icon}
              title={cat.title}
              description={cat.description}
              accentColor={cat.accentColor}
            />
          ))}
        </div>
      </section>

      {/* ── Taxonomy Preview Section ──────────────────────────────── */}
      {graphData && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-8 md:mb-12"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              The Rendering Ecosystem
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Explore how {rendererCount} rendering engines connect through
              shared techniques, formats, and lineage.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <TaxonomyPreview data={graphData} />
          </motion.div>

          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/explore?view=graph"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
            >
              Explore the full taxonomy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </section>
      )}

      {/* ── Quick Start Terminal Section ──────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="overflow-hidden rounded-lg border border-border/50 bg-black/50"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          {/* Terminal header */}
          <div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
            </div>
            <CopyButton text={terminalLines.join("\n")} />
          </div>

          {/* Terminal body */}
          <div className="p-4 font-mono text-sm">
            {terminalLines.map((line, i) => (
              <div key={i} className="py-0.5">
                <span className="mr-2 text-emerald-400">$</span>
                <span className="text-foreground/90">{line}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Available on{" "}
          <a
            href={siteConfig.pypi}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            PyPI
          </a>{" "}
          and{" "}
          <a
            href={siteConfig.npm}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            npm
          </a>
        </p>
      </section>

      {/* ── Status Section ───────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-lg text-muted-foreground">
            Currently in active development
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Star us on GitHub to follow progress
          </p>
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-5 w-5" />
            <span>renderscope-dev/renderscope</span>
          </a>
        </motion.div>
      </section>
    </div>
  );
}
