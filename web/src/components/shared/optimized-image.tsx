"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getManifestEntry } from "@/lib/image-manifest";

interface OptimizedImageProps {
  /** Original image path relative to `public/` (e.g. `renders/pbrt-v4-cornell-box.png`). */
  src: string;
  /** Required alt text for accessibility. */
  alt: string;
  /** Which size variant to use. Defaults to `"medium"`. */
  size?: "thumb" | "medium" | "large";
  /** True for above-the-fold images — loads eagerly with blur placeholder. */
  priority?: boolean;
  /** Additional CSS class names. */
  className?: string;
  /**
   * Responsive sizes hint for the browser.
   * Falls back to a sensible default based on the `size` prop.
   */
  sizes?: string;
  /** Explicit width override. If omitted, uses the manifest value. */
  width?: number;
  /** Explicit height override. If omitted, uses the manifest value. */
  height?: number;
}

const DEFAULT_SIZES: Record<"thumb" | "medium" | "large", string> = {
  thumb: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  medium: "(max-width: 768px) 100vw, 50vw",
  large: "100vw",
};

/**
 * Optimized image component that resolves WebP variants from the build manifest.
 *
 * - Automatically serves optimized WebP at the requested size.
 * - Shows a CSS blur placeholder while the image loads (for `priority` images).
 * - Falls back to the original source path when no manifest entry exists.
 * - Uses native `<img>` for compatibility with npm package extraction.
 */
export function OptimizedImage({
  src,
  alt,
  size = "medium",
  priority = false,
  className,
  sizes,
  width,
  height,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);

  const entry = getManifestEntry(src);
  const resolvedSrc = entry ? entry[size] : `/${src}`;
  const resolvedWidth = width ?? entry?.width ?? undefined;
  const resolvedHeight = height ?? entry?.height ?? undefined;
  const resolvedSizes = sizes ?? DEFAULT_SIZES[size];
  const blurDataURL = entry?.blurDataURL;

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={
        blurDataURL && !loaded
          ? {
              backgroundImage: `url(${blurDataURL})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={alt}
        width={resolvedWidth}
        height={resolvedHeight}
        sizes={resolvedSizes}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : undefined}
        onLoad={handleLoad}
        className={cn(
          "h-full w-full object-cover",
          blurDataURL && !loaded && "opacity-0",
          blurDataURL && loaded && "opacity-100 transition-opacity duration-300"
        )}
      />
    </div>
  );
}
