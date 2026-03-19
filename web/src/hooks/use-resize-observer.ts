'use client';

import { useEffect, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

/**
 * Tracks the dimensions of a DOM element via ResizeObserver.
 * Returns a ref to attach to the target element and the current { width, height }.
 */
export function useResizeObserver<T extends HTMLElement = HTMLDivElement>(): {
  ref: React.RefObject<T>;
  width: number;
  height: number;
} {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      setSize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    });

    observer.observe(element);

    // Set initial size
    const rect = element.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, ...size };
}
