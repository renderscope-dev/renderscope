/**
 * Multi-image toggle with click-to-advance and auto-play.
 *
 * Images are stacked with CSS opacity transitions for smooth crossfade.
 * Supports keyboard navigation, play/pause, and speed controls.
 *
 * Fully standalone — no framer-motion, lucide-react, or shadcn/ui.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "../../utils/classnames";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  ImageOffIcon,
} from "../common/InlineSvgIcons";
import type { ComparisonImage } from "../../types/image-compare";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImageToggleProps {
  /** Array of images to toggle between (minimum 2). */
  images: ComparisonImage[];
  /** Auto-toggle interval in ms. 0 = manual only. Default: 0 */
  interval?: number;
  /** Show the current image's label. Default: true */
  showLabel?: boolean;
  /** Show navigation indicators (dots). Default: true */
  showIndicators?: boolean;
  /** Transition duration in ms. Default: 200 */
  transitionDuration?: number;
  /** Callback when the active image changes. */
  onImageChange?: (index: number) => void;
  /** Additional CSS class name. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type SpeedMultiplier = "0.5" | "1" | "2";

interface ImageState {
  loaded: boolean;
  error: boolean;
  naturalWidth: number;
  naturalHeight: number;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ImageToggle({
  images,
  interval = 0,
  showLabel = true,
  showIndicators = true,
  transitionDuration = 200,
  onImageChange,
  className,
}: ImageToggleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedMultiplier>("1");
  const [imageStates, setImageStates] = useState<ImageState[]>(() =>
    images.map(() => ({
      loaded: false,
      error: false,
      naturalWidth: 0,
      naturalHeight: 0,
    })),
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageCount = images.length;

  const firstLoaded = imageStates.find(
    (s) => s.loaded && !s.error && s.naturalWidth > 0,
  );
  const aspectRatio = firstLoaded
    ? firstLoaded.naturalWidth / firstLoaded.naturalHeight
    : 16 / 9;

  const allLoaded = imageStates.every((s) => s.loaded);

  // Reset when images array changes
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
      const clamped = ((index % imageCount) + imageCount) % imageCount;
      setActiveIndex(clamped);
      onImageChange?.(clamped);
    },
    [imageCount, onImageChange],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

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

  const navigateAndResetTimer = useCallback(
    (navigate: () => void) => {
      navigate();
      if (isPlaying) startAutoToggle();
    },
    [isPlaying, startAutoToggle],
  );

  // --- Image load handlers ---

  const handleImageLoad = useCallback(
    (index: number) =>
      (e: React.SyntheticEvent<HTMLImageElement>) => {
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
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          navigateAndResetTimer(goPrev);
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          navigateAndResetTimer(goNext);
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        default: {
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
    [navigateAndResetTimer, goPrev, goNext, imageCount, goTo, isPlaying, startAutoToggle],
  );

  const handleViewportClick = useCallback(() => {
    if (!allLoaded || imageCount <= 1) return;
    navigateAndResetTimer(goNext);
  }, [allLoaded, imageCount, navigateAndResetTimer, goNext]);

  const currentImage = images[activeIndex];

  return (
    <div
      role="group"
      aria-label="Image toggle comparison"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cx("rs-toggle", className)}
    >
      {/* Image viewport */}
      <div
        className="rs-toggle__viewport"
        style={{ aspectRatio }}
        onClick={handleViewportClick}
      >
        {/* Skeleton */}
        {!allLoaded && (
          <div
            className="rs-skeleton"
            style={{ position: "absolute", inset: 0, zIndex: 10 }}
          />
        )}

        {/* Image stack */}
        {images.map((image, index) => {
          const state = imageStates[index];
          const isActive = index === activeIndex;

          if (state?.error) {
            return (
              <div
                key={`${image.src}-${index}`}
                className="rs-toggle__error-panel"
                style={{
                  opacity: isActive ? 1 : 0,
                  transition: `opacity ${transitionDuration}ms ease-in-out`,
                  zIndex: isActive ? 1 : 0,
                }}
              >
                <ImageOffIcon />
                <span>Failed to load: {image.label}</span>
              </div>
            );
          }

          return (
            <img
              key={`${image.src}-${index}`}
              src={image.src}
              alt={image.label}
              draggable={false}
              onLoad={handleImageLoad(index)}
              onError={handleImageError(index)}
              className={cx(
                "rs-toggle__image",
                !allLoaded && "rs-toggle__image--hidden",
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
          <div className="rs-toggle__label">
            <span className="rs-toggle__label-badge" aria-live="polite">
              {currentImage.label}
            </span>
          </div>
        )}

        {/* Counter */}
        {allLoaded && imageCount > 1 && (
          <div className="rs-toggle__counter">
            {activeIndex + 1} / {imageCount}
          </div>
        )}
      </div>

      {/* Toolbar */}
      {allLoaded && imageCount > 1 && (
        <div className="rs-toggle__toolbar">
          <div className="rs-toggle__toolbar-inner">
            {/* Previous */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigateAndResetTimer(goPrev);
              }}
              aria-label="Previous image"
              className="rs-toggle__btn"
            >
              <ChevronLeftIcon />
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying((prev) => !prev);
              }}
              aria-label={isPlaying ? "Pause auto-toggle" : "Play auto-toggle"}
              className={cx(
                "rs-toggle__btn",
                isPlaying && "rs-toggle__btn--active",
              )}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <div className="rs-toggle__divider" />

            {/* Speed controls */}
            {(["0.5", "1", "2"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSpeed(s);
                }}
                aria-label={`${s}× speed`}
                className={cx(
                  "rs-toggle__speed-btn",
                  speed === s && "rs-toggle__speed-btn--active",
                )}
              >
                {s}\u00D7
              </button>
            ))}

            <div className="rs-toggle__divider" />

            {/* Next */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigateAndResetTimer(goNext);
              }}
              aria-label="Next image"
              className="rs-toggle__btn"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}

      {/* Dot indicators */}
      {showIndicators && allLoaded && imageCount > 1 && (
        <div className="rs-toggle__dots">
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
              className={cx(
                "rs-toggle__dot",
                index === activeIndex && "rs-toggle__dot--active",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
