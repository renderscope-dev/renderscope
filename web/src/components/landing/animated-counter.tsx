"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface AnimatedCounterProps {
  /** Target value to count up to. */
  target: number;
  /** Duration of the count-up animation in ms. */
  duration?: number;
  /** Suffix to display after the number (e.g. "+"). */
  suffix?: string;
  className?: string;
}

/**
 * An easeOut function: starts fast, decelerates.
 * t ranges from 0 to 1.
 */
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function AnimatedCounter({
  target,
  duration = 1500,
  suffix = "+",
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const prefersReduced = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // If user prefers reduced motion, show final value immediately
    if (prefersReduced) {
      setDisplayValue(target);
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const currentValue = Math.round(easedProgress * target);

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [target, duration, prefersReduced]);

  useEffect(() => {
    if (isInView) {
      animate();
    }
  }, [isInView, animate]);

  return (
    <span
      ref={ref}
      className={className}
      aria-label={`${target}${suffix}`}
    >
      {displayValue}
      {suffix}
    </span>
  );
}
