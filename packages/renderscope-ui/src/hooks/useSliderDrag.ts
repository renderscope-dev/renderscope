/**
 * Pointer Events API drag logic for the image comparison slider.
 *
 * Handles mouse, touch, and pen dragging with keyboard support
 * (arrow keys ±1%, Shift+arrow ±10%, Home/End).
 *
 * @internal Not part of the public API — used by ImageCompareSlider.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { SliderOrientation } from "../types/image-compare";

export interface UseSliderDragOptions {
  /** Initial position (0-1). Default: 0.5 */
  initialPosition?: number;
  /** Slider orientation. Default: 'horizontal' */
  orientation?: SliderOrientation;
  /** Callback on position change */
  onPositionChange?: (position: number) => void;
}

export interface UseSliderDragReturn {
  /** Current slider position (0-1) */
  position: number;
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Pointer event handlers to attach to the draggable area */
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
  /** Keyboard event handler to attach to the handle element */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Programmatically set position */
  setPosition: (position: number) => void;
}

const KEYBOARD_STEP = 0.01;
const KEYBOARD_LARGE_STEP = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useSliderDrag({
  initialPosition = 0.5,
  orientation = "horizontal",
  onPositionChange,
}: UseSliderDragOptions = {}): UseSliderDragReturn {
  const [position, setPositionState] = useState(clamp(initialPosition, 0, 1));
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const onPositionChangeRef = useRef(onPositionChange);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  const updatePosition = useCallback((newPosition: number) => {
    const clamped = clamp(newPosition, 0, 1);
    setPositionState(clamped);
    onPositionChangeRef.current?.(clamped);
  }, []);

  const calculatePosition = useCallback(
    (clientX: number, clientY: number): number => {
      const container = containerRef.current;
      if (!container) return 0.5;

      const rect = container.getBoundingClientRect();

      if (orientation === "horizontal") {
        return (clientX - rect.left) / rect.width;
      } else {
        return (clientY - rect.top) / rect.height;
      }
    },
    [orientation],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      setIsDragging(true);

      const newPosition = calculatePosition(e.clientX, e.clientY);
      updatePosition(newPosition);
    },
    [calculatePosition, updatePosition],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;

      const newPosition = calculatePosition(e.clientX, e.clientY);
      updatePosition(newPosition);
    },
    [calculatePosition, updatePosition],
  );

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const target = e.currentTarget as HTMLElement;
    // A cancelled pointer has already lost capture, and releasing one that was
    // never held throws NotFoundError in Firefox.
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  const onPointerUp = endDrag;

  /**
   * The browser can take a gesture away mid-drag.
   *
   * A touch the compositor decides is a scroll fires `pointercancel` instead of
   * further `pointermove`s, and no `pointerup` follows. Without this the slider
   * stayed stuck in its dragging state: the resize cursor latched on, the
   * metadata overlay stayed suppressed, and a later hover-move was treated as a
   * continuing drag. `.rs-slider` sets `touch-action: none` so the compositor
   * does not claim horizontal drags; this handles the cancellations it cannot
   * prevent, such as a system interruption.
   */
  const onPointerCancel = endDrag;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newPosition: number | null = null;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          newPosition =
            position - (e.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP);
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          newPosition =
            position + (e.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP);
          break;
        case "Home":
          e.preventDefault();
          newPosition = 0;
          break;
        case "End":
          e.preventDefault();
          newPosition = 1;
          break;
        default:
          return;
      }

      if (newPosition !== null) {
        updatePosition(newPosition);
      }
    },
    [position, updatePosition],
  );

  const setPosition = useCallback(
    (newPosition: number) => {
      updatePosition(newPosition);
    },
    [updatePosition],
  );

  return {
    position,
    isDragging,
    containerRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    handleKeyDown,
    setPosition,
  };
}
