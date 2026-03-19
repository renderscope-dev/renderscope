"use client";

import { motion, useReducedMotion } from "framer-motion";

/* ── Orb configuration ──────────────────────────────────────────────── */

interface OrbConfig {
  gradient: string;
  size: number;
  position: [number, number];
  drift: [number, number][];
  duration: number;
  pulseRange: [number, number];
  pulseDuration: number;
}

const orbs: OrbConfig[] = [
  {
    // Blue (path tracing) — upper-left, dominant
    gradient:
      "radial-gradient(circle, hsla(210,100%,65%,0.22) 0%, hsla(195,100%,60%,0.08) 50%, transparent 100%)",
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
    // Purple (neural) — upper-right
    gradient:
      "radial-gradient(circle, hsla(280,85%,65%,0.18) 0%, hsla(260,80%,70%,0.06) 50%, transparent 100%)",
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
    // Cyan (ray marching) — center-bottom
    gradient:
      "radial-gradient(circle, hsla(185,80%,55%,0.15) 0%, hsla(210,100%,65%,0.05) 50%, transparent 100%)",
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
    // Orange (volume) — lower-left
    gradient:
      "radial-gradient(circle, hsla(25,95%,55%,0.12) 0%, hsla(45,95%,55%,0.04) 50%, transparent 100%)",
    size: 450,
    position: [30, 60],
    drift: [
      [34, 65],
      [26, 54],
      [32, 62],
      [30, 60],
    ],
    duration: 40,
    pulseRange: [0.8, 1],
    pulseDuration: 14,
  },
];

/* ── Layer 1: Dot Grid ──────────────────────────────────────────────── */

function DotGrid() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(circle, hsl(var(--foreground) / 0.15) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage:
          "radial-gradient(ellipse 60% 55% at 50% 45%, black 25%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 60% 55% at 50% 45%, black 25%, transparent 75%)",
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
            background: orb.gradient,
            filter: "blur(80px)",
          }}
          animate={
            reduced
              ? undefined
              : {
                  left: orb.drift.map(([x]) => `${x}%`),
                  top: orb.drift.map(([, y]) => `${y}%`),
                  opacity: [orb.pulseRange[0], orb.pulseRange[1], orb.pulseRange[0]],
                }
          }
          transition={
            reduced
              ? undefined
              : {
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
                }
          }
        />
      ))}
    </>
  );
}

/* ── Layer 3: Light Rays ────────────────────────────────────────────── */

function LightRays({ reduced }: { reduced: boolean | null }) {
  if (reduced) return null;

  return (
    <>
      {/* Ray 1 — blue, steeper angle, 30s */}
      <div
        className="absolute left-1/2 top-1/2 h-[120px] w-[250%] -translate-x-1/2 -translate-y-1/2 animate-ray-sweep-1"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(var(--technique-path-tracing) / 0.08) 35%, hsl(var(--technique-path-tracing) / 0.10) 50%, hsl(var(--technique-path-tracing) / 0.08) 65%, transparent 100%)",
          maskImage:
            "linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      />
      {/* Ray 2 — purple, shallower angle, 45s */}
      <div
        className="absolute left-1/2 top-1/2 h-[90px] w-[250%] -translate-x-1/2 -translate-y-1/2 animate-ray-sweep-2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(var(--technique-neural) / 0.06) 35%, hsl(var(--technique-neural) / 0.08) 50%, hsl(var(--technique-neural) / 0.06) 65%, transparent 100%)",
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
      <DotGrid />
      <GradientOrbs reduced={reduced} />
      <LightRays reduced={reduced} />
      <RadialVignette />
    </div>
  );
}
