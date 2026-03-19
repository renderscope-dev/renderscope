'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { NormalizedRegion } from '@/types/image-compare';

interface ZoomSelectionBoxProps {
  /** Current selection region in normalized coordinates (0-1) */
  region: NormalizedRegion;
  /** Displayed width of the overview container in pixels */
  containerWidth: number;
  /** Displayed height of the overview container in pixels */
  containerHeight: number;
  /** Called when drag starts */
  onDragStart: (clientX: number, clientY: number) => void;
  /** Called during drag movement */
  onDragMove: (clientX: number, clientY: number) => void;
  /** Called when drag ends */
  onDragEnd: () => void;
  /** Whether a drag is currently active */
  isDragging: boolean;
  /** Whether to animate position changes (disabled during drag) */
  animate?: boolean;
}

export function ZoomSelectionBox({
  region,
  containerWidth,
  containerHeight,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  animate = false,
}: ZoomSelectionBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Convert normalized coordinates to pixel positions
  const left = region.x * containerWidth;
  const top = region.y * containerHeight;
  const width = region.width * containerWidth;
  const height = region.height * containerHeight;

  // --- Pointer event handlers ---

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Capture pointer to track drag even when cursor leaves the element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onDragStart(e.clientX, e.clientY);
    },
    [onDragStart],
  );

  // Use window-level listeners for move/up so drag continues outside image bounds
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      onDragMove(e.clientX, e.clientY);
    };

    const handlePointerUp = () => {
      onDragEnd();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, onDragMove, onDragEnd]);

  return (
    <>
      {/* Dimmed overlay regions (spotlight effect) */}
      {/* Top */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 bg-black/25"
        style={{ height: top }}
      />
      {/* Bottom */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/25"
        style={{ height: containerHeight - top - height }}
      />
      {/* Left */}
      <div
        className="pointer-events-none absolute left-0 bg-black/25"
        style={{
          top,
          height,
          width: left,
        }}
      />
      {/* Right */}
      <div
        className="pointer-events-none absolute right-0 bg-black/25"
        style={{
          top,
          height,
          width: containerWidth - left - width,
        }}
      />

      {/* Selection rectangle */}
      <div
        ref={boxRef}
        onPointerDown={handlePointerDown}
        className={cn(
          'absolute z-10 border-2 border-white/80',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          animate && !isDragging && 'transition-all duration-150 ease-out',
        )}
        style={{
          left,
          top,
          width,
          height,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
        }}
        role="slider"
        aria-label="Zoom region selector"
        aria-valuenow={Math.round(region.x * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`Region at ${Math.round(region.x * 100)}%, ${Math.round(region.y * 100)}%`}
      >
        {/* Corner markers */}
        <div className="absolute -left-[2px] -top-[2px] h-[6px] w-[6px] bg-white" />
        <div className="absolute -right-[2px] -top-[2px] h-[6px] w-[6px] bg-white" />
        <div className="absolute -bottom-[2px] -left-[2px] h-[6px] w-[6px] bg-white" />
        <div className="absolute -bottom-[2px] -right-[2px] h-[6px] w-[6px] bg-white" />
      </div>
    </>
  );
}
