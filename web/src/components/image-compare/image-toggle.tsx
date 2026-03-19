'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Pause,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ImageToggleProps } from '@/types/image-compare';

type SpeedMultiplier = '0.5' | '1' | '2';

interface ImageState {
  loaded: boolean;
  error: boolean;
  naturalWidth: number;
  naturalHeight: number;
}

export function ImageToggle({
  images,
  interval = 0,
  showLabel = true,
  transitionDuration = 200,
  onImageChange,
  className,
}: ImageToggleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedMultiplier>('1');
  const [imageStates, setImageStates] = useState<ImageState[]>(() =>
    images.map(() => ({
      loaded: false,
      error: false,
      naturalWidth: 0,
      naturalHeight: 0,
    })),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const imageCount = images.length;

  // Derive aspect ratio from the first successfully loaded image
  const firstLoaded = imageStates.find(
    (s) => s.loaded && !s.error && s.naturalWidth > 0,
  );
  const aspectRatio = firstLoaded
    ? firstLoaded.naturalWidth / firstLoaded.naturalHeight
    : 16 / 9;

  const allLoaded = imageStates.every((s) => s.loaded);

  // Reset image states when images array changes
  useEffect(() => {
    setImageStates(
      images.map(() => ({
        loaded: false,
        error: false,
        naturalWidth: 0,
        naturalHeight: 0,
      })),
    );
    setActiveIndex(0);
  }, [images]);

  // --- Navigation ---

  const goTo = useCallback(
    (index: number) => {
      const clamped =
        ((index % imageCount) + imageCount) % imageCount;
      setActiveIndex(clamped);
      onImageChange?.(clamped);
    },
    [imageCount, onImageChange],
  );

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  // --- Auto-toggle ---

  const clearAutoToggle = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoToggle = useCallback(() => {
    clearAutoToggle();
    if (imageCount <= 1) return;

    const speedMultiplier = parseFloat(speed);
    const baseInterval = interval > 0 ? interval : 1000;
    const computedInterval = baseInterval / speedMultiplier;

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % imageCount;
        onImageChange?.(next);
        return next;
      });
    }, computedInterval);
  }, [clearAutoToggle, imageCount, interval, speed, onImageChange]);

  useEffect(() => {
    if (isPlaying && allLoaded) {
      startAutoToggle();
    } else {
      clearAutoToggle();
    }
    return clearAutoToggle;
  }, [isPlaying, allLoaded, startAutoToggle, clearAutoToggle]);

  // Reset auto-toggle timer on manual navigation
  const navigateAndResetTimer = useCallback(
    (navigate: () => void) => {
      navigate();
      if (isPlaying) {
        // Restart the timer from now to prevent jarring double-advance
        startAutoToggle();
      }
    },
    [isPlaying, startAutoToggle],
  );

  // --- Image load handlers ---

  const handleImageLoad = useCallback(
    (index: number) => (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setImageStates((prev) => {
        const next = [...prev];
        next[index] = {
          loaded: true,
          error: false,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        };
        return next;
      });
    },
    [],
  );

  const handleImageError = useCallback(
    (index: number) => () => {
      setImageStates((prev) => {
        const next = [...prev];
        next[index] = {
          loaded: true,
          error: true,
          naturalWidth: 0,
          naturalHeight: 0,
        };
        return next;
      });
    },
    [],
  );

  // --- Keyboard controls ---

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          navigateAndResetTimer(goPrev);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          navigateAndResetTimer(goNext);
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        default: {
          // Number keys 1-9 for direct navigation
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= 9 && num <= imageCount) {
            e.preventDefault();
            goTo(num - 1);
            if (isPlaying) startAutoToggle();
          }
          break;
        }
      }
    },
    [
      navigateAndResetTimer,
      goPrev,
      goNext,
      imageCount,
      goTo,
      isPlaying,
      startAutoToggle,
    ],
  );

  // --- Click on viewport advances ---

  const handleViewportClick = useCallback(() => {
    if (!allLoaded || imageCount <= 1) return;
    navigateAndResetTimer(goNext);
  }, [allLoaded, imageCount, navigateAndResetTimer, goNext]);

  // --- Speed change handler ---

  const handleSpeedChange = useCallback((value: string) => {
    if (value === '0.5' || value === '1' || value === '2') {
      setSpeed(value);
    }
  }, []);

  const currentImage = images[activeIndex];

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Image toggle comparison"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        'outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'rounded-lg',
        className,
      )}
    >
      {/* Image viewport */}
      <div
        className="relative cursor-pointer overflow-hidden rounded-lg border border-border bg-muted"
        style={{ aspectRatio }}
        onClick={handleViewportClick}
      >
        {/* Skeleton loading state */}
        {!allLoaded && (
          <div className="absolute inset-0 z-10 animate-pulse bg-primary/10" />
        )}

        {/* Image stack */}
        {images.map((image, index) => {
          const state = imageStates[index];
          const isActive = index === activeIndex;

          if (state?.error) {
            return (
              <div
                key={`${image.src}-${index}`}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted"
                style={{
                  opacity: isActive ? 1 : 0,
                  transition: `opacity ${transitionDuration}ms ease-in-out`,
                  zIndex: isActive ? 1 : 0,
                }}
              >
                <ImageOff className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">
                  Failed to load: {image.label}
                </span>
              </div>
            );
          }

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${image.src}-${index}`}
              src={image.src}
              alt={image.label}
              draggable={false}
              onLoad={handleImageLoad(index)}
              onError={handleImageError(index)}
              className={cn(
                'absolute inset-0 h-full w-full object-cover',
                !allLoaded && 'invisible',
              )}
              style={{
                opacity: isActive ? 1 : 0,
                transition: `opacity ${transitionDuration}ms ease-in-out`,
                zIndex: isActive ? 1 : 0,
              }}
            />
          );
        })}

        {/* Label overlay */}
        {showLabel && allLoaded && currentImage && (
          <div className="absolute bottom-3 left-3 z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm"
              >
                <span
                  aria-live="polite"
                  className="text-sm font-medium text-white"
                >
                  {currentImage.label}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Image counter */}
        {allLoaded && imageCount > 1 && (
          <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-xs text-white/70">
              {activeIndex + 1} / {imageCount}
            </span>
          </div>
        )}
      </div>

      {/* Toolbar (always shown when there are multiple images) */}
      {allLoaded && imageCount > 1 && (
        <div className="mt-3 flex items-center justify-center">
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-card/80 px-3 py-1.5 backdrop-blur-sm">
            {/* Previous */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigateAndResetTimer(goPrev);
              }}
              aria-label="Previous image"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying((prev) => !prev);
              }}
              aria-label={isPlaying ? 'Pause auto-toggle' : 'Play auto-toggle'}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                isPlaying
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Speed control */}
            <div className="mx-1 h-4 w-px bg-border" />
            <ToggleGroup
              type="single"
              value={speed}
              onValueChange={handleSpeedChange}
              size="sm"
            >
              <ToggleGroupItem
                value="0.5"
                aria-label="Half speed"
                className="h-6 px-1.5 text-[10px]"
              >
                0.5×
              </ToggleGroupItem>
              <ToggleGroupItem
                value="1"
                aria-label="Normal speed"
                className="h-6 px-1.5 text-[10px]"
              >
                1×
              </ToggleGroupItem>
              <ToggleGroupItem
                value="2"
                aria-label="Double speed"
                className="h-6 px-1.5 text-[10px]"
              >
                2×
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="mx-1 h-4 w-px bg-border" />

            {/* Next */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigateAndResetTimer(goNext);
              }}
              aria-label="Next image"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation dot indicators */}
      {allLoaded && imageCount > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          {images.map((image, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goTo(index);
                if (isPlaying) startAutoToggle();
              }}
              aria-label={`View image ${index + 1}: ${image.label}`}
              className={cn(
                'rounded-full transition-all',
                index === activeIndex
                  ? 'h-2 w-2 bg-foreground'
                  : 'h-1.5 w-1.5 bg-foreground/40 hover:bg-foreground/60',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
