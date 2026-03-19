"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { announceToScreenReader } from "@/lib/a11y-utils";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Monitor,
  Clock,
  Layers,
  Settings,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LightboxImage } from "@/types/renderer";

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const returnFocusRef = useRef<Element | null>(null);

  // Sync currentIndex when initialIndex changes or lightbox opens
  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement;
      setCurrentIndex(initialIndex);
      setImageError(false);
    }
  }, [initialIndex, isOpen]);

  const hasMultipleImages = images.length > 1;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = (prev - 1 + images.length) % images.length;
      const img = images[next];
      if (img) {
        announceToScreenReader(
          `Image ${next + 1} of ${images.length}: ${img.renderer} render of ${img.scene}`
        );
      }
      return next;
    });
    setImageError(false);
  }, [images]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = (prev + 1) % images.length;
      const img = images[next];
      if (img) {
        announceToScreenReader(
          `Image ${next + 1} of ${images.length}: ${img.renderer} render of ${img.scene}`
        );
      }
      return next;
    });
    setImageError(false);
  }, [images]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goToPrevious, goToNext]);

  if (images.length === 0) return null;

  const current = images[currentIndex % images.length]!;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = current.src;
    link.download = `${current.renderer}-${current.scene}`.replace(/\s+/g, "-").toLowerCase();
    link.click();
  };

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.97 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.97 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        // Restore focus to the element that opened the lightbox
        requestAnimationFrame(() => {
          (returnFocusRef.current as HTMLElement)?.focus?.();
          returnFocusRef.current = null;
        });
      }
    }}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/90",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />

        {/* Content */}
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none lg:flex-row"
          aria-label="Image viewer"
          aria-modal="true"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Accessible title (visually hidden) */}
          <DialogPrimitive.Title className="sr-only">
            {current.renderer} render of {current.scene}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Full-screen image viewer showing rendered output
          </DialogPrimitive.Description>

          {/* ── Top toolbar ── */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-3">
            {/* Image counter */}
            {hasMultipleImages && (
              <span
                className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium tabular-nums text-white/80 backdrop-blur-sm"
                aria-live="polite"
                aria-atomic="true"
              >
                {currentIndex + 1} / {images.length}
              </span>
            )}
            {!hasMultipleImages && <span />}

            {/* Close button */}
            <DialogPrimitive.Close
              className={cn(
                "rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-sm",
                "transition-colors hover:bg-black/70 hover:text-white",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              )}
              aria-label="Close image viewer"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* ── Image zone ── */}
          <div className="relative flex flex-1 items-center justify-center px-4 py-16 lg:px-16">
            {/* Previous button */}
            {hasMultipleImages && (
              <button
                type="button"
                onClick={goToPrevious}
                className={cn(
                  "absolute left-3 z-10 rounded-full bg-black/40 p-2",
                  "text-white/60 transition-all hover:bg-black/60 hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  "lg:left-4 lg:p-2.5"
                )}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5 lg:h-6 lg:w-6" />
              </button>
            )}

            {/* Image with crossfade */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                className="flex h-full w-full items-center justify-center"
                {...motionProps}
              >
                {imageError ? (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 opacity-40" />
                    <p className="text-sm">Image could not be loaded</p>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.src}
                    alt={current.alt}
                    className="max-h-full max-w-full object-contain"
                    onError={() => setImageError(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Next button */}
            {hasMultipleImages && (
              <button
                type="button"
                onClick={goToNext}
                className={cn(
                  "absolute right-3 z-10 rounded-full bg-black/40 p-2",
                  "text-white/60 transition-all hover:bg-black/60 hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  "lg:right-4 lg:p-2.5"
                )}
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5 lg:h-6 lg:w-6" />
              </button>
            )}
          </div>

          {/* ── Metadata panel ── */}
          <div
            className={cn(
              "shrink-0 border-t border-white/10 bg-black/60 backdrop-blur-md",
              "px-6 py-4",
              "lg:w-80 lg:border-l lg:border-t-0 lg:py-16"
            )}
          >
            <div className="flex flex-col gap-5">
              {/* Renderer & scene */}
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {current.renderer}
                </h3>
                <p className="mt-0.5 text-sm text-white/60">
                  {current.scene}
                </p>
              </div>

              {/* Metadata items */}
              <div className="space-y-3">
                {(current.width !== undefined && current.height !== undefined) && (
                  <MetadataItem
                    icon={<Monitor className="h-4 w-4" aria-hidden="true" />}
                    label="Resolution"
                    value={`${current.width} \u00D7 ${current.height}`}
                  />
                )}
                {current.spp !== undefined && (
                  <MetadataItem
                    icon={<Layers className="h-4 w-4" aria-hidden="true" />}
                    label="Samples"
                    value={`${current.spp.toLocaleString()} spp`}
                  />
                )}
                {current.renderTime !== undefined && (
                  <MetadataItem
                    icon={<Clock className="h-4 w-4" aria-hidden="true" />}
                    label="Render Time"
                    value={formatRenderTime(current.renderTime)}
                  />
                )}
                {current.settings && (
                  <MetadataItem
                    icon={<Settings className="h-4 w-4" aria-hidden="true" />}
                    label="Settings"
                    value={current.settings}
                  />
                )}
              </div>

              {/* Download button */}
              <button
                type="button"
                onClick={handleDownload}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg",
                  "border border-white/20 bg-white/10 px-4 py-2.5",
                  "text-sm font-medium text-white/90",
                  "transition-colors hover:bg-white/20 hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                )}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Internal helpers ──

function MetadataItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-white/40">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-white/40">
          {label}
        </p>
        <p className="truncate text-sm text-white/80" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function formatRenderTime(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (remaining === 0) return `${minutes}m`;
  return `${minutes}m ${remaining.toFixed(0)}s`;
}
