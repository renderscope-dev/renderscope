"use client";

import { MotionConfig } from "framer-motion";

/**
 * Wraps children with Framer Motion's MotionConfig to globally
 * respect the user's `prefers-reduced-motion` OS setting.
 *
 * With `reducedMotion="user"`, all Framer Motion animations
 * (motion.div, AnimatePresence, layout, variants) are automatically
 * skipped when the user prefers reduced motion — no per-component
 * opt-in needed.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
