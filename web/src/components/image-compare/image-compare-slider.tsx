'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSliderDrag } from '@/hooks/use-slider-drag';
import { SliderHandle } from './slider-handle';
import { ImageLabel } from './image-label';
import { ImageMetadataOverlay } from './image-metadata-overlay';

export interface CompareImage {
  /** Image source URL */
  src: string;
  /** Display label (e.g., renderer name) */
  label: string;
  /** Optional metadata key-value pairs (e.g., { "Render Time": "12.4s", "Samples": "1024" }) */
  metadata?: Record<string, string>;
  /** Alt text for accessibility (defaults to label if not provided) */
  alt?: string;
}

export interface ImageCompareSliderProps {
  /** Left/before image (bottom layer for horizontal, top layer for vertical) */
  left: CompareImage;
  /** Right/after image (top layer for horizontal, bottom layer for vertical) */
  right: CompareImage;
  /** Initial slider position from 0 (fully left) to 1 (fully right). Default: 0.5 */
  initialPosition?: number;
  /** Show renderer name labels at top corners. Default: true */
  showLabels?: boolean;
  /** Show metadata overlay panel on hover. Default: false */
  showMetadata?: boolean;
  /** Slider orientation. Default: 'horizontal' (left-right divider) */
  orientation?: 'horizontal' | 'vertical';
  /** Callback fired when slider position changes */
  onPositionChange?: (position: number) => void;
  /** Additional CSS classes for the outer container */
  className?: string;
}

export function ImageCompareSlider({
  left,
  right,
  initialPosition = 0.5,
  showLabels = true,
  showMetadata = false,
  orientation = 'horizontal',
  onPositionChange,
  className,
}: ImageCompareSliderProps) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [imagesLoaded, setImagesLoaded] = useState({ left: false, right: false });
  const [imageErrors, setImageErrors] = useState({ left: false, right: false });
  const [isHovering, setIsHovering] = useState(false);
  const aspectRatioSet = useRef(false);
  const handleRef = useRef<HTMLDivElement>(null);

  const { position, isDragging, containerRef, handlers, handleKeyDown } =
    useSliderDrag({
      initialPosition,
      orientation,
      onPositionChange,
    });

  const bothLoaded = imagesLoaded.left && imagesLoaded.right;
  const isHorizontal = orientation === 'horizontal';

  const handleImageLoad = useCallback(
    (side: 'left' | 'right') => (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (!aspectRatioSet.current) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
        aspectRatioSet.current = true;
      }
      setImagesLoaded((prev) => ({ ...prev, [side]: true }));
    },
    []
  );

  const handleImageError = useCallback(
    (side: 'left' | 'right') => () => {
      setImageErrors((prev) => ({ ...prev, [side]: true }));
      // Mark as "loaded" so UI doesn't stay in skeleton state forever
      setImagesLoaded((prev) => ({ ...prev, [side]: true }));
    },
    []
  );

  // Build clip-path for the right (top) image
  const clipPath = isHorizontal
    ? `inset(0 0 0 ${position * 100}%)`
    : `inset(${position * 100}% 0 0 0)`;

  // Determine label sides based on orientation
  const leftLabelSide = isHorizontal ? 'left' : 'top';
  const rightLabelSide = isHorizontal ? 'right' : 'bottom';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden select-none',
        'rounded-lg border border-border',
        'bg-muted',
        isDragging
          ? isHorizontal
            ? 'cursor-ew-resize'
            : 'cursor-ns-resize'
          : 'cursor-default',
        className
      )}
      style={{ aspectRatio }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...handlers}
    >
      {/* Skeleton loading state */}
      {!bothLoaded && (
        <div className="absolute inset-0 z-10 animate-pulse bg-muted" />
      )}

      {/* Left/before image (bottom layer — always fully visible) */}
      {/* Using native <img> deliberately: this component will be extracted to the renderscope-ui npm package and must not depend on Next.js */}
      {!imageErrors.left ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={left.src}
          alt={left.alt ?? left.label}
          onLoad={handleImageLoad('left')}
          onError={handleImageError('left')}
          draggable={false}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            !bothLoaded && 'invisible'
          )}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-sm text-muted-foreground">Image unavailable</span>
        </div>
      )}

      {/* Right/after image (top layer — clipped) */}
      {!imageErrors.right ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={right.src}
          alt={right.alt ?? right.label}
          onLoad={handleImageLoad('right')}
          onError={handleImageError('right')}
          draggable={false}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            !bothLoaded && 'invisible'
          )}
          style={{ clipPath }}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted/80"
          style={{ clipPath }}
        >
          <span className="text-sm text-muted-foreground">Image unavailable</span>
        </div>
      )}

      {/* Interactive elements — only visible once images are loaded */}
      {bothLoaded && (
        <>
          {/* Slider handle */}
          <SliderHandle
            position={position}
            orientation={orientation}
            isDragging={isDragging}
          />

          {/* Focusable handle for keyboard accessibility */}
          <div
            ref={handleRef}
            role="slider"
            tabIndex={0}
            aria-valuenow={Math.round(position * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Image comparison slider between ${left.label} and ${right.label}`}
            aria-orientation={isHorizontal ? 'horizontal' : 'vertical'}
            onKeyDown={handleKeyDown}
            className={cn(
              'absolute z-30',
              'w-10 h-10',
              'opacity-0',
              'focus-visible:opacity-100',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'rounded-full',
              isHorizontal
                ? 'top-1/2 -translate-x-1/2 -translate-y-1/2'
                : 'left-1/2 -translate-x-1/2 -translate-y-1/2'
            )}
            style={
              isHorizontal
                ? { left: `${position * 100}%` }
                : { top: `${position * 100}%` }
            }
          />

          {/* Labels */}
          {showLabels && (
            <>
              <ImageLabel label={left.label} side={leftLabelSide} />
              <ImageLabel label={right.label} side={rightLabelSide} />
            </>
          )}

          {/* Metadata overlays */}
          {showMetadata && left.metadata && (
            <ImageMetadataOverlay
              metadata={left.metadata}
              side="left"
              visible={isHovering && !isDragging}
            />
          )}
          {showMetadata && right.metadata && (
            <ImageMetadataOverlay
              metadata={right.metadata}
              side="right"
              visible={isHovering && !isDragging}
            />
          )}
        </>
      )}
    </div>
  );
}
