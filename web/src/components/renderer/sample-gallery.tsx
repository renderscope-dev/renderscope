"use client";

import { useState, useCallback } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SampleRender, LightboxImage } from "@/types/renderer";
import { GalleryThumbnail } from "@/components/renderer/gallery-thumbnail";
import { ImageLightbox } from "@/components/renderer/image-lightbox";

interface SampleGalleryProps {
  rendererName: string;
  images: SampleRender[];
  className?: string;
}

export function SampleGallery({
  rendererName,
  images,
  className,
}: SampleGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const isLightboxOpen = lightboxIndex >= 0;

  const handleOpenLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxIndex(-1);
  }, []);

  // Empty state
  if (!images || images.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed border-border/40 bg-card/30 px-6 py-8",
          className
        )}
      >
        <Camera
          className="h-5 w-5 shrink-0 text-muted-foreground/40"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground/60">
          Sample renders are not yet available for this renderer.
        </p>
      </div>
    );
  }

  // Convert SampleRender[] to LightboxImage[]
  const lightboxImages: LightboxImage[] = images.map((img) => ({
    src: img.src,
    alt: `${rendererName} render of ${img.scene}`,
    scene: img.scene,
    renderer: rendererName,
    width: img.width,
    height: img.height,
    spp: img.spp,
    renderTime: img.renderTime,
    settings: img.settings,
  }));

  return (
    <div className={className}>
      {/* Thumbnail grid */}
      <div
        className={cn(
          "grid gap-4",
          images.length === 1 && "grid-cols-1",
          images.length === 2 && "grid-cols-1 sm:grid-cols-2",
          images.length >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          images.length >= 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        )}
      >
        {images.map((image, index) => (
          <GalleryThumbnail
            key={`${image.src}-${index}`}
            image={image}
            onClick={() => handleOpenLightbox(index)}
            index={index}
          />
        ))}
      </div>

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
        isOpen={isLightboxOpen}
        onClose={handleCloseLightbox}
      />
    </div>
  );
}
