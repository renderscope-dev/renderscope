"use client";

import { cn } from "@/lib/utils";
import { Camera, Box } from "lucide-react";

interface ScenePlaceholderProps {
  name: string;
  variant?: "scene" | "render";
  rendererName?: string;
  className?: string;
}

export function ScenePlaceholder({
  name,
  variant = "scene",
  rendererName,
  className,
}: ScenePlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden",
        "bg-gradient-to-br from-[hsl(220,15%,10%)] to-[hsl(220,20%,16%)]",
        className
      )}
      aria-hidden="true"
    >
      {/* Faint wireframe grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent via-white/[0.02] to-transparent" />

      {/* Icon */}
      {variant === "scene" ? (
        <Camera className="mb-2 h-8 w-8 text-muted-foreground/20" />
      ) : (
        <Box className="mb-2 h-8 w-8 text-muted-foreground/20" />
      )}

      {/* Label */}
      <p className="text-sm font-medium text-muted-foreground/40">
        {variant === "render" && rendererName ? rendererName : name}
      </p>
      {variant === "render" && (
        <p className="mt-0.5 text-[11px] text-muted-foreground/25">
          Render pending
        </p>
      )}
    </div>
  );
}
