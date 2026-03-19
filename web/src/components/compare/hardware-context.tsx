"use client";

import { Cpu, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChartHardware } from "@/types/benchmark";

interface HardwareContextProps {
  hardware: ChartHardware;
  className?: string;
}

/**
 * Persistent informational banner showing benchmark hardware specs.
 * Provides essential context for interpreting performance numbers.
 */
export function HardwareContext({ hardware, className }: HardwareContextProps) {
  const parts: string[] = [hardware.cpu];

  if (hardware.gpu) {
    const gpuText = hardware.gpu_vram_gb
      ? `${hardware.gpu} (${hardware.gpu_vram_gb} GB)`
      : hardware.gpu;
    parts.push(gpuText);
  } else {
    parts.push("CPU-only");
  }

  parts.push(`${hardware.ram_gb} GB RAM`);
  parts.push(hardware.os);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3",
        className
      )}
    >
      <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

      <p className="min-w-0 flex-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground/80">Benchmarked on</span>{" "}
        {parts.join(" · ")}
      </p>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mt-0.5 shrink-0 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              aria-label="Benchmark hardware information"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            All benchmarks were run on the same hardware under identical
            conditions for fair comparison.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
