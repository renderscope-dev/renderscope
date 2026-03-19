'use client';

import { useCallback, useRef, useState } from 'react';
import type { NormalizedRegion, SyncedZoomState } from '@/types/image-compare';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface UseSyncedZoomOptions {
  /** Initial region width in normalized coordinates (0-1) */
  initialRegionWidth: number;
  /** Initial region height in normalized coordinates (0-1) */
  initialRegionHeight: number;
  /** Callback when region changes */
  onRegionChange?: (region: NormalizedRegion) => void;
}

/**
 * Manages the state of a rectangular zoom selection region in normalized (0-1)
 * coordinates. The same region is shared between overview images (where the
 * selection box is drawn) and magnified panels (which render zoomed content).
 */
export function useSyncedZoom({
  initialRegionWidth,
  initialRegionHeight,
  onRegionChange,
}: UseSyncedZoomOptions): SyncedZoomState {
  const [region, setRegionState] = useState<NormalizedRegion>(() => ({
    x: 0.5 - initialRegionWidth / 2,
    y: 0.5 - initialRegionHeight / 2,
    width: initialRegionWidth,
    height: initialRegionHeight,
  }));

  const [isDragging, setIsDragging] = useState(false);

  // Track the offset from the mouse position to the region's top-left corner
  // so the rectangle doesn't jump when the drag starts.
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const setRegion = useCallback(
    (newRegion: NormalizedRegion) => {
      const clamped: NormalizedRegion = {
        x: clamp(newRegion.x, 0, 1 - newRegion.width),
        y: clamp(newRegion.y, 0, 1 - newRegion.height),
        width: newRegion.width,
        height: newRegion.height,
      };
      setRegionState(clamped);
      onRegionChange?.(clamped);
    },
    [onRegionChange],
  );

  const startDrag = useCallback(
    (clientX: number, clientY: number, containerRect: DOMRect) => {
      // Calculate the mouse position in normalized coordinates
      const normX = (clientX - containerRect.left) / containerRect.width;
      const normY = (clientY - containerRect.top) / containerRect.height;

      // Store offset from mouse to region top-left
      dragOffsetRef.current = {
        x: normX - region.x,
        y: normY - region.y,
      };

      setIsDragging(true);
    },
    [region.x, region.y],
  );

  const updateDrag = useCallback(
    (clientX: number, clientY: number, containerRect: DOMRect) => {
      const normX = (clientX - containerRect.left) / containerRect.width;
      const normY = (clientY - containerRect.top) / containerRect.height;

      const rawX = normX - dragOffsetRef.current.x;
      const rawY = normY - dragOffsetRef.current.y;

      setRegionState((prev) => {
        const clamped: NormalizedRegion = {
          x: clamp(rawX, 0, 1 - prev.width),
          y: clamp(rawY, 0, 1 - prev.height),
          width: prev.width,
          height: prev.height,
        };
        onRegionChange?.(clamped);
        return clamped;
      });
    },
    [onRegionChange],
  );

  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    region,
    isDragging,
    setRegion,
    startDrag,
    updateDrag,
    endDrag,
  };
}
