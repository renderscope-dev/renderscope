'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseSliderDragOptions {
  /** Initial position (0-1). Default: 0.5 */
  initialPosition?: number;
  /** Orientation of the slider. Default: 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
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
  orientation = 'horizontal',
  onPositionChange,
}: UseSliderDragOptions = {}): UseSliderDragReturn {
  const [position, setPositionState] = useState(clamp(initialPosition, 0, 1));
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const onPositionChangeRef = useRef(onPositionChange);

  // Keep callback ref up to date without causing re-renders
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

      if (orientation === 'horizontal') {
        return (clientX - rect.left) / rect.width;
      } else {
        return (clientY - rect.top) / rect.height;
      }
    },
    [orientation]
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
    [calculatePosition, updatePosition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;

      const newPosition = calculatePosition(e.clientX, e.clientY);
      updatePosition(newPosition);
    },
    [calculatePosition, updatePosition]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;

      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      isDraggingRef.current = false;
      setIsDragging(false);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newPosition: number | null = null;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          newPosition = position - (e.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          newPosition = position + (e.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP);
          break;
        case 'Home':
          e.preventDefault();
          newPosition = 0;
          break;
        case 'End':
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
    [position, updatePosition]
  );

  const setPosition = useCallback(
    (newPosition: number) => {
      updatePosition(newPosition);
    },
    [updatePosition]
  );

  return {
    position,
    isDragging,
    containerRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
    handleKeyDown,
    setPosition,
  };
}
