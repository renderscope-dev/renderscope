import { useState, useEffect } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Detects whether the user prefers reduced motion via the
 * `prefers-reduced-motion: reduce` media query.
 *
 * Returns `false` during SSR (safe default). On the client,
 * it reactively updates when the user changes their OS setting.
 *
 * This is a framework-agnostic alternative to Framer Motion's
 * `useReducedMotion()` hook — use it for D3 animations, CSS
 * transitions controlled via JS, or any non-Framer-Motion context.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setPrefersReducedMotion(mql.matches);

    function handleChange(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
