/**
 * Synchronized zoom/pan state across multiple image panels.
 *
 * When one panel's zoom or pan changes, all others follow.
 * Used by ImageSideBySide for linked viewing.
 */

import { useCallback, useRef, useState } from "react";
import type { ZoomPanState } from "../types/image-compare";

const MIN_SCALE = 1;
const MAX_SCALE = 32;
const ZOOM_STEP = 1.15;

function clampScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

export interface UseSyncedZoomReturn {
  /** Current zoom/pan state. */
  state: ZoomPanState;
  /** Pointer and wheel event handlers to attach to each panel. */
  handlers: {
    onWheel: (e: React.WheelEvent) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onDoubleClick: () => void;
  };
  /** Reset zoom to 1x and pan to center. */
  reset: () => void;
  /** Programmatically set zoom level. */
  setZoom: (scale: number) => void;
}

const INITIAL_STATE: ZoomPanState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export function useSyncedZoom(): UseSyncedZoomReturn {
  const [state, setState] = useState<ZoomPanState>(INITIAL_STATE);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setState((prev) => {
      const direction = e.deltaY < 0 ? 1 : -1;
      const newScale = clampScale(
        direction > 0 ? prev.scale * ZOOM_STEP : prev.scale / ZOOM_STEP,
      );

      // Zoom toward cursor position
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cursorX = e.clientX - rect.left - rect.width / 2;
      const cursorY = e.clientY - rect.top - rect.height / 2;

      const scaleFactor = newScale / prev.scale;
      const newOffsetX = cursorX - (cursorX - prev.offsetX) * scaleFactor;
      const newOffsetY = cursorY - (cursorY - prev.offsetY) * scaleFactor;

      // Reset offset when zoomed out to 1x
      if (newScale <= 1) {
        return { scale: 1, offsetX: 0, offsetY: 0 };
      }

      return { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isPanningRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) return;

    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    setState((prev) => {
      if (prev.scale <= 1) return prev;
      return {
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      };
    });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    isPanningRef.current = false;
  }, []);

  const onDoubleClick = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const setZoom = useCallback((scale: number) => {
    const clamped = clampScale(scale);
    setState((prev) => {
      if (clamped <= 1) return INITIAL_STATE;
      return { ...prev, scale: clamped };
    });
  }, []);

  return {
    state,
    handlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onDoubleClick,
    },
    reset,
    setZoom,
  };
}
