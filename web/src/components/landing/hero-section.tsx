"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Github, Terminal, Package, Layers, Sparkles, Code2, GitBranch } from "lucide-react";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { landingContent, siteConfig } from "@/lib/constants";
import { HeroImageGrid, type HeroGridImage } from "./hero-image-grid";
import { HeroBackground } from "@/components/layout/hero-background";
import { AnimatedCounter } from "./animated-counter";
import type { LandingPageStats } from "@/lib/data";

const { hero } = landingContent;

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

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
      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3.5 py-1.5 font-mono text-xs text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-background hover:text-foreground hover:shadow-md"
    >
      {icon}
      <span>{command}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

/* ── Stat icons ───────────────────────────────────────────────────── */
const statIcons = {
  Layers,
  Sparkles,
  Code2,
  GitBranch,
} as const;

interface StatPillProps {
  icon: keyof typeof statIcons;
  value: number;
  label: string;
}

function StatPill({ icon, value, label }: StatPillProps) {
  const Icon = statIcons[icon];
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon className="h-4 w-4 text-primary/70" aria-hidden="true" />
      <AnimatedCounter
        target={value}
        className="font-display text-2xl font-bold leading-none text-foreground"
      />
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

interface HeroSectionProps {
  images?: HeroGridImage[];
  stats?: LandingPageStats;
}

export function HeroSection({ images, stats }: HeroSectionProps) {
  const reduced = useReducedMotion();

  const statItems: StatPillProps[] = stats
    ? [
        { icon: "Layers", value: stats.totalRenderers, label: "Renderers Cataloged" },
        { icon: "Sparkles", value: stats.totalTechniques, label: "Rendering Techniques" },
        { icon: "Code2", value: stats.totalLanguages, label: "Languages Covered" },
        { icon: "GitBranch", value: stats.totalOpenSource, label: "Open Source Projects" },
      ]
    : [];

  return (
    <section
      data-testid="hero-section"
      className="relative overflow-hidden border-b border-border/40"
    >
      {/* Faded container background */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-50/80 via-card/60 to-background dark:from-violet-950/40 dark:via-card/40 dark:to-background" />
      <div className="absolute inset-0 bg-mesh-light" />

      {/* Animated hero background */}
      <HeroBackground />

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28 lg:px-8">
        <motion.div
          className="flex flex-col items-center text-center"
          initial="initial"
          animate={reduced ? undefined : "animate"}
          variants={reduced ? undefined : stagger}
        >
          {/* Badge */}
          <motion.div
            variants={reduced ? undefined : fadeUp}
            transition={{ duration: 0.4 }}
          >
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary dark:border-primary/30 dark:bg-primary/10">
              <span className="mr-2 inline-block h-1.5 w-1.5 animate-glow-pulse rounded-full bg-primary" />
              Open Source Rendering Platform
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            variants={reduced ? undefined : fadeUp}
            transition={{ duration: 0.5 }}
          >
            Catalog, Compare &{" "}
            <span className="text-primary">Benchmark</span> Renderers
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-lg"
            variants={reduced ? undefined : fadeUp}
            transition={{ duration: 0.4 }}
          >
            The open platform for exploring{" "}
            <span className="font-medium text-foreground">50+ rendering engines</span>
            {" "}&mdash; from path tracers to neural renderers, with structured data, visual comparisons, and CLI tools.
          </motion.p>

          {/* CTA Buttons + Install */}
          <motion.div
            className="mt-5 flex flex-col items-center gap-3"
            variants={reduced ? undefined : fadeUp}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <Link
                href={hero.primaryCta.href}
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
              >
                {hero.primaryCta.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={hero.secondaryCta.href}
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-6 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-background hover:shadow-md"
              >
                {hero.secondaryCta.label}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <InstallChip icon={<Terminal className="h-3.5 w-3.5" />} command="pip install renderscope" />
              <InstallChip icon={<Package className="h-3.5 w-3.5" />} command="npm install renderscope" />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
              <span className="h-3.5 w-px bg-border" />
              <a
                href={siteConfig.pypi}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                PyPI
              </a>
              <span className="h-3.5 w-px bg-border" />
              <a
                href={siteConfig.npm}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                npm
              </a>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Image showcase — full-width row below text ──── */}
        <motion.div
          className="mt-8 sm:mt-10"
          initial={reduced ? undefined : { opacity: 0, y: 30 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        >
          <HeroImageGrid images={images} />
        </motion.div>

        {/* ── KPI Stats row ─────────────────────────────────── */}
        {stats && (
          <motion.div
            className="mt-8 grid grid-cols-2 gap-6 sm:mt-10 sm:grid-cols-4 sm:gap-8"
            initial={reduced ? undefined : { opacity: 0, y: 16 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {statItems.map((item) => (
              <StatPill key={item.label} {...item} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
