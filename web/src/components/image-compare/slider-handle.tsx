'use client';

import { ChevronsLeftRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SliderHandleProps {
  /** Position from 0 to 1 */
  position: number;
  /** Orientation of the slider */
  orientation: 'horizontal' | 'vertical';
  /** Whether the handle is currently being dragged */
  isDragging: boolean;
}

export function SliderHandle({ position, orientation, isDragging }: SliderHandleProps) {
  const isHorizontal = orientation === 'horizontal';
  const positionPercent = `${position * 100}%`;

  return (
    <div
      className={cn(
        'absolute z-20 pointer-events-none',
        isHorizontal ? 'inset-y-0' : 'inset-x-0'
      )}
      style={
        isHorizontal
          ? { left: positionPercent }
          : { top: positionPercent }
      }
      aria-hidden="true"
    >
      {/* Divider line */}
      <div
        className={cn(
          'absolute',
          isHorizontal
            ? 'w-0.5 inset-y-0 -translate-x-1/2'
            : 'h-0.5 inset-x-0 -translate-y-1/2',
          'bg-foreground/60',
          'shadow-[0_0_8px_rgba(255,255,255,0.15)]'
        )}
      />

      {/* Circular handle */}
      <div
        className={cn(
          'absolute pointer-events-auto',
          isHorizontal
            ? 'top-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'left-1/2 -translate-x-1/2 -translate-y-1/2',
          'flex items-center justify-center',
          'w-10 h-10 sm:w-11 sm:h-11',
          'rounded-full',
          'bg-background/80 backdrop-blur-sm',
          'border border-border',
          'shadow-lg shadow-black/20',
          'transition-transform duration-150',
          isDragging ? 'scale-110' : 'hover:scale-110',
          isHorizontal ? 'cursor-ew-resize' : 'cursor-ns-resize'
        )}
      >
        {isHorizontal ? (
          <ChevronsLeftRight className="w-5 h-5 text-foreground" />
        ) : (
          <ChevronsUpDown className="w-5 h-5 text-foreground" />
        )}
      </div>
    </div>
  );
}
