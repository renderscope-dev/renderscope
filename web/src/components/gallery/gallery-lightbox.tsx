"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Monitor,
  Clock,
  Layers,
  Cpu,
  ImageIcon,
} from "lucide-react";
import { cn, formatRenderTime } from "@/lib/utils";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import type { SceneRender } from "@/types/scene";
import type { RendererData } from "@/types/renderer";

interface GalleryLightboxEntry {
  render: SceneRender;
  renderer: RendererData;
}

interface GalleryLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  renders: GalleryLightboxEntry[];
  initialIndex: number;
  sceneName: string;
}

export function GalleryLightbox({
  isOpen,
  onClose,
  renders,
  initialIndex,
  sceneName,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const triggerRef = useRef<Element | null>(null);

  // Capture the element that triggered the lightbox
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      setCurrentIndex(initialIndex);
      setImageError(false);
    }
  }, [initialIndex, isOpen]);

  const hasMultiple = renders.length > 1;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + renders.length) % renders.length);
    setImageError(false);
  }, [renders.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % renders.length);
    setImageError(false);
  }, [renders.length]);

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

  // Return focus on close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
        // Restore focus to trigger element
        requestAnimationFrame(() => {
          if (triggerRef.current instanceof HTMLElement) {
            triggerRef.current.focus();
          }
        });
      }
    },
    [onClose]
  );

  if (renders.length === 0) return null;

  const current = renders[currentIndex % renders.length]!;
  const hasImage = !!current.render.image_web;

  const handleDownload = () => {
    if (!current.render.image_web) return;
    const link = document.createElement("a");
    link.href = current.render.image_web;
    link.download = `${current.renderer.name}-${sceneName}`
      .replace(/\s+/g, "-")
      .toLowerCase();
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
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
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
          data-testid="lightbox"
          className="fixed inset-0 z-50 flex flex-col outline-none lg:flex-row"
          aria-label="Image viewer"
          aria-modal="true"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Accessible title (visually hidden) */}
          <DialogPrimitive.Title className="sr-only">
            {current.renderer.name} render of {sceneName}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Full-screen image viewer showing {sceneName} rendered by{" "}
            {current.renderer.name}
          </DialogPrimitive.Description>

          {/* ── Top toolbar ── */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-3">
            {/* Image counter */}
            {hasMultiple && (
              <span
                className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium tabular-nums text-white/80 backdrop-blur-sm"
                aria-live="polite"
              >
                {currentIndex + 1} of {renders.length}
              </span>
            )}
            {!hasMultiple && <span />}

            {/* Close button */}
            <DialogPrimitive.Close
              className={cn(
                "rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-sm",
                "transition-colors hover:bg-black/70 hover:text-white",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              )}
              aria-label="Close image viewer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* ── Image zone ── */}
          <div className="relative flex flex-1 items-center justify-center px-4 py-16 lg:px-16">
            {/* Previous button */}
            {hasMultiple && (
              <button
                type="button"
                onClick={goToPrevious}
                className={cn(
                  "absolute left-3 z-10 rounded-full bg-black/40 p-2",
                  "text-white/60 transition-all hover:bg-black/60 hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  "lg:left-4 lg:p-2.5"
                )}
                aria-label="Previous render"
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
                {!hasImage ? (
                  <div className="flex flex-col items-center gap-3 text-white/60">
                    <ImageIcon className="h-12 w-12 opacity-40" />
                    <p className="text-sm">
                      This render is being prepared. Check back soon!
                    </p>
                    <p className="text-xs text-white/40">
                      {current.renderer.name} &middot; {sceneName}
                    </p>
                  </div>
                ) : imageError ? (
                  <div className="flex flex-col items-center gap-3 text-white/60">
                    <ImageIcon className="h-12 w-12 opacity-40" />
                    <p className="text-sm">Image could not be loaded</p>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.render.image_web!}
                    alt={`${sceneName} rendered by ${current.renderer.name}`}
                    className="max-h-full max-w-full object-contain"
                    onError={() => setImageError(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Next button */}
            {hasMultiple && (
              <button
                type="button"
                onClick={goToNext}
                className={cn(
                  "absolute right-3 z-10 rounded-full bg-black/40 p-2",
                  "text-white/60 transition-all hover:bg-black/60 hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  "lg:right-4 lg:p-2.5"
                )}
                aria-label="Next render"
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
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {current.renderer.name}
                  </h3>
                  {current.renderer.technique[0] && (
                    <TechniqueBadge
                      technique={current.renderer.technique[0]}
                      size="sm"
                    />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-white/60">{sceneName}</p>
              </div>

              {/* Metadata items */}
              <div className="space-y-3">
                {current.render.render_time_seconds !== null && (
                  <MetadataItem
                    icon={<Clock className="h-4 w-4" />}
                    label="Render Time"
                    value={formatRenderTime(current.render.render_time_seconds)}
                  />
                )}
                {current.render.samples_per_pixel !== null &&
                  current.render.samples_per_pixel !== undefined && (
                    <MetadataItem
                      icon={<Layers className="h-4 w-4" />}
                      label="Samples"
                      value={`${current.render.samples_per_pixel.toLocaleString()} spp`}
                    />
                  )}
                {current.render.integrator && (
                  <MetadataItem
                    icon={<Cpu className="h-4 w-4" />}
                    label="Integrator"
                    value={current.render.integrator}
                  />
                )}
                <MetadataItem
                  icon={<Monitor className="h-4 w-4" />}
                  label="Counter"
                  value={`${currentIndex + 1} of ${renders.length}`}
                />
              </div>

              {/* Download button */}
              {hasImage && (
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
              )}
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
