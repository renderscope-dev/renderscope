"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { landingContent } from "@/lib/constants";
import { HeroImageGrid, type HeroGridImage } from "./hero-image-grid";

const { hero } = landingContent;

const stagger = {
  animate: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

interface HeroSectionProps {
  images?: HeroGridImage[];
}

export function HeroSection({ images }: HeroSectionProps) {
  const reduced = useReducedMotion();

  return (
    <section data-testid="hero-section" className="relative flex min-h-[90vh] flex-col items-center overflow-hidden">
      {/* Background image grid (faded behind content) */}
      <div className="relative w-full pt-8 sm:pt-12 lg:pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <HeroImageGrid className="opacity-50" images={images} />
        </div>
      </div>

      {/* Content overlaid / positioned below grid */}
      <div className="relative z-10 -mt-16 flex flex-1 flex-col items-center justify-center px-4 pb-16 text-center sm:-mt-24 lg:-mt-32">
        <motion.div
          className="max-w-3xl space-y-6"
          initial="initial"
          animate={reduced ? undefined : "animate"}
          variants={reduced ? undefined : stagger}
        >
          {/* Title */}
          <motion.h1
            className="text-display-lg"
            variants={reduced ? undefined : fadeUp}
            transition={{ duration: 0.5 }}
          >
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {hero.title}
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl"
            variants={reduced ? undefined : fadeUp}
            transition={{ duration: 0.5 }}
          >
            {hero.tagline}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4"
            variants={reduced ? undefined : fadeUp}
            transition={{ duration: 0.5 }}
          >
            <Link
              href={hero.primaryCta.href}
              className="group inline-flex h-12 items-center gap-2 rounded-lg bg-blue-700 px-6 text-sm font-medium text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-800 hover:shadow-xl hover:shadow-blue-700/30"
            >
              {hero.primaryCta.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className="group inline-flex h-12 items-center gap-2 rounded-lg border border-border bg-background px-6 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              {hero.secondaryCta.label}
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
