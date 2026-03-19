"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SampleRender } from "@/types/renderer";

interface GalleryThumbnailProps {
  image: SampleRender;
  onClick: () => void;
  index: number;
}

export function GalleryThumbnail({
  image,
  onClick,
  index,
}: GalleryThumbnailProps) {
  const prefersReducedMotion = useReducedMotion();
  const isSvgPlaceholder = image.src.endsWith(".svg");

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: "easeOut",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group relative block w-full overflow-hidden rounded-lg border border-border/40",
          "aspect-video cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "transition-transform duration-300 hover:scale-[1.02]"
        )}
        aria-label={`View ${image.scene} render by ${image.renderer} in full screen`}
      >
        {/* Image */}
        {isSvgPlaceholder ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt={`${image.renderer} render of ${image.scene}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt={`${image.renderer} render of ${image.scene}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Hover overlay */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-end",
            "bg-gradient-to-t from-black/70 via-black/20 to-transparent",
            "opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            "focus-visible:opacity-100"
          )}
        >
          <div className="flex items-end justify-between p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">{image.scene}</p>
              {image.renderTime !== undefined && (
                <p className="text-xs text-white/70">
                  {image.renderTime.toFixed(1)}s
                </p>
              )}
            </div>
            <Maximize2
              className="h-4 w-4 shrink-0 text-white/80"
              aria-hidden="true"
            />
          </div>
        </div>
      </button>
    </motion.div>
  );
}
