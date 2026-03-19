/**
 * Get RGBA pixel value at cursor coordinates on a canvas.
 *
 * Used for hover-inspect functionality in image comparison components.
 */

import { useCallback, useState } from "react";

export interface PixelValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PixelPosition {
  x: number;
  y: number;
}

export interface UsePixelSamplerReturn {
  /** RGBA pixel value at the current cursor position, or null. */
  pixel: PixelValue | null;
  /** Cursor position in image pixel coordinates, or null. */
  position: PixelPosition | null;
  /** Attach this to the canvas element's onMouseMove. */
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  /** Attach this to clear pixel/position on mouse leave. */
  onMouseLeave: () => void;
}

export function usePixelSampler(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  enabled: boolean = true,
): UsePixelSamplerReturn {
  const [pixel, setPixel] = useState<PixelValue | null>(null);
  const [position, setPosition] = useState<PixelPosition | null>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!enabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      // Map display coordinates to canvas pixel coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
        setPixel(null);
        setPosition(null);
        return;
      }

      const imageData = ctx.getImageData(x, y, 1, 1);
      const d = imageData.data;
      setPixel({ r: d[0]!, g: d[1]!, b: d[2]!, a: d[3]! });
      setPosition({ x, y });
    },
    [canvasRef, enabled],
  );

  const onMouseLeave = useCallback(() => {
    setPixel(null);
    setPosition(null);
  }, []);

  return { pixel, position, onMouseMove, onMouseLeave };
}
