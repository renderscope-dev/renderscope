'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ImageLabelProps {
  /** Label text (e.g., "PBRT v4") */
  label: string;
  /** Which side of the image this label is on */
  side: 'left' | 'right' | 'top' | 'bottom';
  /** Additional class names */
  className?: string;
}

const positionClasses: Record<ImageLabelProps['side'], string> = {
  left: 'top-3 left-3',
  right: 'top-3 right-3',
  top: 'top-3 left-1/2 -translate-x-1/2',
  bottom: 'bottom-3 left-1/2 -translate-x-1/2',
};

export function ImageLabel({ label, side, className }: ImageLabelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: 0.3 }}
      className={cn(
        'absolute z-30 pointer-events-none select-none',
        positionClasses[side],
        'px-2.5 py-1',
        'bg-background/70 backdrop-blur-sm',
        'rounded-sm',
        'text-sm font-medium text-foreground',
        'border border-border/50',
        className
      )}
    >
      {label}
    </motion.div>
  );
}
