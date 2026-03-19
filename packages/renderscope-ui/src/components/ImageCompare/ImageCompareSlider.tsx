/**
 * A draggable before/after slider for comparing two images.
 *
 * Two images are stacked; CSS clip-path reveals the left image up to the
 * slider position and the right image from the slider position onward.
 * A glassmorphism handle sits at the divider line.
 *
 * Fully standalone — no Next.js, Tailwind, shadcn/ui, or framer-motion.
 */

import { useState, useCallback, useRef, memo } from "react";
import { cx } from "../../utils/classnames";
import { useSliderDrag } from "../../hooks/useSliderDrag";
import {
  ChevronsHorizontalIcon,
  ChevronsVerticalIcon,
} from "../common/InlineSvgIcons";
import type { ComparisonImage, SliderOrientation } from "../../types/image-compare";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImageCompareSliderProps {
  /** Left (or top) image — revealed by moving the slider right/down. */
  left: ComparisonImage;
  /** Right (or bottom) image — revealed by moving the slider left/up. */
  right: ComparisonImage;
  /** Initial slider position from 0 (fully left) to 1 (fully right). Default: 0.5 */
  initialPosition?: number;
  /** Show image labels at the top of each side. Default: true */
  showLabels?: boolean;
  /** Show metadata overlays on hover. Default: false */
  showMetadata?: boolean;
  /** Slider divider orientation. Default: 'horizontal' */
  orientation?: SliderOrientation;
  /** Callback when slider position changes. */
  onPositionChange?: (position: number) => void;
  /** Additional CSS class name for the container. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SliderLabel = memo(function SliderLabel({
  label,
  side,
}: {
  label: string;
  side: "left" | "right" | "top" | "bottom";
}) {
  return (
    <div className={cx("rs-slider-label", `rs-slider-label--${side}`)}>
      {label}
    </div>
  );
});

const MetadataOverlay = memo(function MetadataOverlay({
  metadata,
  side,
  visible,
}: {
  metadata: Record<string, string>;
  side: "left" | "right";
  visible: boolean;
}) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return null;

  return (
    <div
      className={cx(
        "rs-slider-metadata",
        `rs-slider-metadata--${side}`,
        visible && "rs-slider-metadata--visible",
      )}
    >
      {entries.map(([key, value]) => (
        <div key={key} className="rs-slider-metadata__row">
          <span className="rs-slider-metadata__key">{key}</span>
          <span className="rs-slider-metadata__value">{value}</span>
        </div>
      ))}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ImageCompareSlider({
  left,
  right,
  initialPosition = 0.5,
  showLabels = true,
  showMetadata = false,
  orientation = "horizontal",
  onPositionChange,
  className,
}: ImageCompareSliderProps) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [imagesLoaded, setImagesLoaded] = useState({
    left: false,
    right: false,
  });
  const [imageErrors, setImageErrors] = useState({
    left: false,
    right: false,
  });
  const [isHovering, setIsHovering] = useState(false);
  const aspectRatioSet = useRef(false);

  const { position, isDragging, containerRef, handlers, handleKeyDown } =
    useSliderDrag({
      initialPosition,
      orientation,
      onPositionChange,
    });

  const bothLoaded = imagesLoaded.left && imagesLoaded.right;
  const isHorizontal = orientation === "horizontal";

  const handleImageLoad = useCallback(
    (side: "left" | "right") =>
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (!aspectRatioSet.current) {
          setAspectRatio(img.naturalWidth / img.naturalHeight);
          aspectRatioSet.current = true;
        }
        setImagesLoaded((prev) => ({ ...prev, [side]: true }));
      },
    [],
  );

  const handleImageError = useCallback(
    (side: "left" | "right") => () => {
      setImageErrors((prev) => ({ ...prev, [side]: true }));
      setImagesLoaded((prev) => ({ ...prev, [side]: true }));
    },
    [],
  );

  const clipPath = isHorizontal
    ? `inset(0 0 0 ${position * 100}%)`
    : `inset(${position * 100}% 0 0 0)`;

  const leftLabelSide = isHorizontal ? "left" : "top";
  const rightLabelSide = isHorizontal ? "right" : "bottom";
  const positionPercent = `${position * 100}%`;

  return (
    <div
      ref={containerRef}
      className={cx(
        "rs-slider",
        isDragging &&
          (isHorizontal ? "rs-slider--dragging-h" : "rs-slider--dragging-v"),
        className,
      )}
      style={{ aspectRatio }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...handlers}
    >
      {/* Skeleton loading state */}
      {!bothLoaded && (
        <div
          className="rs-skeleton"
          style={{ position: "absolute", inset: 0, zIndex: 10 }}
        />
      )}

      {/* Left/before image (bottom layer) */}
      {!imageErrors.left ? (
        <img
          src={left.src}
          alt={left.label}
          onLoad={handleImageLoad("left")}
          onError={handleImageError("left")}
          draggable={false}
          className={cx(
            "rs-slider__image",
            !bothLoaded && "rs-slider__image--hidden",
          )}
        />
      ) : (
        <div className="rs-slider__error">
          <span>Image unavailable</span>
        </div>
      )}

      {/* Right/after image (top layer — clipped) */}
      {!imageErrors.right ? (
        <img
          src={right.src}
          alt={right.label}
          onLoad={handleImageLoad("right")}
          onError={handleImageError("right")}
          draggable={false}
          className={cx(
            "rs-slider__image",
            !bothLoaded && "rs-slider__image--hidden",
          )}
          style={{ clipPath }}
        />
      ) : (
        <div className="rs-slider__error" style={{ clipPath }}>
          <span>Image unavailable</span>
        </div>
      )}

      {/* Interactive elements — only after images load */}
      {bothLoaded && (
        <>
          {/* Visual handle */}
          <div
            className={cx(
              "rs-slider-handle",
              isHorizontal ? "rs-slider-handle--h" : "rs-slider-handle--v",
            )}
            style={
              isHorizontal
                ? { left: positionPercent }
                : { top: positionPercent }
            }
            aria-hidden="true"
          >
            <div
              className={cx(
                "rs-slider-handle__line",
                isHorizontal
                  ? "rs-slider-handle__line--h"
                  : "rs-slider-handle__line--v",
              )}
            />
            <div
              className={cx(
                "rs-slider-handle__knob",
                isHorizontal
                  ? "rs-slider-handle__knob--h"
                  : "rs-slider-handle__knob--v",
                isDragging && "rs-slider-handle__knob--active",
              )}
            >
              {isHorizontal ? (
                <ChevronsHorizontalIcon />
              ) : (
                <ChevronsVerticalIcon />
              )}
            </div>
          </div>

          {/* Keyboard-accessible handle */}
          <div
            role="slider"
            tabIndex={0}
            aria-valuenow={Math.round(position * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Image comparison slider between ${left.label} and ${right.label}`}
            aria-orientation={isHorizontal ? "horizontal" : "vertical"}
            onKeyDown={handleKeyDown}
            className="rs-slider-focus-target"
            style={
              isHorizontal
                ? {
                    left: positionPercent,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }
                : {
                    top: positionPercent,
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }
            }
          />

          {/* Labels */}
          {showLabels && (
            <>
              <SliderLabel label={left.label} side={leftLabelSide} />
              <SliderLabel label={right.label} side={rightLabelSide} />
            </>
          )}

          {/* Metadata overlays */}
          {showMetadata && left.metadata && (
            <MetadataOverlay
              metadata={left.metadata}
              side="left"
              visible={isHovering && !isDragging}
            />
          )}
          {showMetadata && right.metadata && (
            <MetadataOverlay
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
