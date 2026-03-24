"use client";

import { motion, useReducedMotion } from "framer-motion";

/* ── Orb configuration ──────────────────────────────────────────────── */

interface OrbConfig {
  gradient: string;
  gradientDark: string;
  size: number;
  position: [number, number];
  drift: [number, number][];
  duration: number;
  pulseRange: [number, number];
  pulseDuration: number;
}

const orbs: OrbConfig[] = [
  {
    // Indigo — upper-left, dominant
    gradient:
      "radial-gradient(circle, hsla(252,60%,58%,0.08) 0%, hsla(252,60%,70%,0.03) 50%, transparent 100%)",
    gradientDark:
      "radial-gradient(circle, hsla(252,85%,65%,0.20) 0%, hsla(252,80%,60%,0.07) 50%, transparent 100%)",
    size: 700,
    position: [25, 30],
    drift: [
      [30, 36],
      [22, 26],
      [28, 34],
      [25, 30],
    ],
    duration: 25,
    pulseRange: [0.8, 1],
    pulseDuration: 8,
  },
  {
    // Violet — upper-right
    gradient:
      "radial-gradient(circle, hsla(280,60%,60%,0.06) 0%, hsla(280,60%,70%,0.02) 50%, transparent 100%)",
    gradientDark:
      "radial-gradient(circle, hsla(280,85%,65%,0.16) 0%, hsla(260,80%,70%,0.05) 50%, transparent 100%)",
    size: 600,
    position: [70, 25],
    drift: [
      [74, 30],
      [66, 20],
      [72, 28],
      [70, 25],
    ],
    duration: 30,
    pulseRange: [0.75, 1],
    pulseDuration: 10,
  },
  {
    // Teal — center-bottom
    gradient:
      "radial-gradient(circle, hsla(190,55%,52%,0.05) 0%, hsla(200,55%,60%,0.02) 50%, transparent 100%)",
    gradientDark:
      "radial-gradient(circle, hsla(185,80%,55%,0.13) 0%, hsla(210,100%,65%,0.04) 50%, transparent 100%)",
    size: 500,
    position: [50, 65],
    drift: [
      [54, 70],
      [46, 58],
      [52, 66],
      [50, 65],
    ],
    duration: 35,
    pulseRange: [0.7, 1],
    pulseDuration: 12,
  },
  {
    // Rose — lower-right accent
    gradient:
      "radial-gradient(circle, hsla(330,55%,55%,0.04) 0%, hsla(330,55%,60%,0.01) 50%, transparent 100%)",
    gradientDark:
      "radial-gradient(circle, hsla(330,80%,60%,0.10) 0%, hsla(330,70%,55%,0.03) 50%, transparent 100%)",
    size: 450,
    position: [75, 60],
    drift: [
      [79, 65],
      [71, 54],
      [77, 62],
      [75, 60],
    ],
    duration: 40,
    pulseRange: [0.8, 1],
    pulseDuration: 14,
  },
];

/* ── Layer 1: Subtle Grid ──────────────────────────────────────────── */

function SubtleGrid() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--foreground) / 0.025) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.025) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage:
          "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 70%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 70%)",
      }}
    />
  );
}

/* ── Layer 2: Floating Gradient Orbs ────────────────────────────────── */

function GradientOrbs({ reduced }: { reduced: boolean | null }) {
  return (
    <>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.position[0]}%`,
            top: `${orb.position[1]}%`,
            translate: "-50% -50%",
            filter: "blur(80px)",
          }}
        >
          {/* Light mode orb */}
          <div
            className="absolute inset-0 rounded-full dark:opacity-0 transition-opacity duration-300"
            style={{ background: orb.gradient }}
          />
          {/* Dark mode orb */}
          <div
            className="absolute inset-0 rounded-full opacity-0 dark:opacity-100 transition-opacity duration-300"
            style={{ background: orb.gradientDark }}
          />
          {reduced ? null : (
            <motion.div
              className="absolute inset-0"
              animate={{
                left: orb.drift.map(([x]) => `${x - orb.position[0]}%`),
                top: orb.drift.map(([, y]) => `${y - orb.position[1]}%`),
                opacity: [orb.pulseRange[0], orb.pulseRange[1], orb.pulseRange[0]],
              }}
              transition={{
                left: {
                  duration: orb.duration,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut",
                },
                top: {
                  duration: orb.duration,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut",
                },
                opacity: {
                  duration: orb.pulseDuration,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut",
                },
              }}
            />
          )}
        </motion.div>
      ))}
    </>
  );
}

/* ── Layer 3: Light Rays ────────────────────────────────────────────── */

function LightRays({ reduced }: { reduced: boolean | null }) {
  if (reduced) return null;

  return (
    <>
      {/* Ray 1 — indigo, steeper angle, 30s */}
      <div
        className="absolute left-1/2 top-1/2 h-[120px] w-[250%] -translate-x-1/2 -translate-y-1/2 animate-ray-sweep-1"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.03) 35%, hsl(var(--primary) / 0.05) 50%, hsl(var(--primary) / 0.03) 65%, transparent 100%)",
          maskImage:
            "linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      />
      {/* Ray 2 — violet, shallower angle, 45s */}
      <div
        className="absolute left-1/2 top-1/2 h-[90px] w-[250%] -translate-x-1/2 -translate-y-1/2 animate-ray-sweep-2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(var(--technique-neural) / 0.02) 35%, hsl(var(--technique-neural) / 0.04) 50%, hsl(var(--technique-neural) / 0.02) 65%, transparent 100%)",
          maskImage:
            "linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      />
    </>
  );
}

/* ── Layer 4: Radial Vignette ───────────────────────────────────────── */

function RadialVignette() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 40%, hsl(var(--background)) 100%)",
      }}
    />
  );
}

/* ── Composed Background ────────────────────────────────────────────── */

export function HeroBackground() {
  const reduced = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <SubtleGrid />
      <GradientOrbs reduced={reduced} />
      <LightRays reduced={reduced} />
      <RadialVignette />
    </div>
  );
}
