'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ImageMetadataOverlayProps {
  /** Metadata key-value pairs */
  metadata: Record<string, string>;
  /** Which side to position on */
  side: 'left' | 'right';
  /** Whether the overlay is visible */
  visible: boolean;
}

const sideClasses: Record<ImageMetadataOverlayProps['side'], string> = {
  left: 'bottom-3 left-3',
  right: 'bottom-3 right-3',
};

export function ImageMetadataOverlay({ metadata, side, visible }: ImageMetadataOverlayProps) {
  const entries = Object.entries(metadata);

  if (entries.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute z-30 pointer-events-none',
            sideClasses[side],
            'px-3 py-2',
            'bg-background/80 backdrop-blur-md',
            'rounded-md',
            'border border-border/50',
            'max-w-[200px]'
          )}
        >
          <dl className="space-y-0.5">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-muted-foreground whitespace-nowrap">{key}</dt>
                <dd className="text-xs font-medium text-foreground whitespace-nowrap">{value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
