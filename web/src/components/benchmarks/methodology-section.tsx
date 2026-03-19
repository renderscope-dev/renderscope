"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MethodologyItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function MethodologyItem({
  title,
  children,
  defaultOpen = false,
}: MethodologyItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-w-prose px-4 pb-4 pt-1 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MethodologySection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        Methodology
      </h2>
      <p className="mb-6 max-w-prose text-sm text-muted-foreground">
        All benchmarks are conducted under standardized conditions to ensure
        fair, reproducible comparisons. Every data point includes the full
        hardware configuration, renderer version, and exact settings used.
      </p>

      <div className="space-y-1 rounded-xl border border-border/50 bg-card/50 py-2">
        <MethodologyItem title="Settings Standardization" defaultOpen>
          <ul className="list-inside list-disc space-y-1.5">
            <li>
              <strong>Resolution:</strong> 1920×1080 for all benchmarks
            </li>
            <li>
              <strong>Samples:</strong> 1024 SPP baseline, with convergence data
              captured at 1, 4, 16, 64, 256, and 1024 SPP
            </li>
            <li>
              <strong>Integrator:</strong> Volumetric path tracer where available
              (most physically accurate option)
            </li>
            <li>
              <strong>Max bounces:</strong> 8 (sufficient for most scenes
              including caustics and multi-bounce GI)
            </li>
            <li>
              <strong>Denoising:</strong> Disabled — raw render quality is
              measured without post-processing
            </li>
            <li>
              Renderer-specific settings are documented per benchmark entry and
              available in the exported data
            </li>
          </ul>
        </MethodologyItem>

        <MethodologyItem title="Fairness Considerations">
          <ul className="list-inside list-disc space-y-1.5">
            <li>
              All renderers are run on the same hardware for each hardware
              profile — no cherry-picked configurations
            </li>
            <li>
              A warm-up run is executed and discarded before the timed run to
              eliminate JIT compilation and caching effects
            </li>
            <li>
              Scene parsing and BVH build time is separated from render time
              where the renderer supports it
            </li>
            <li>
              GPU memory is pre-allocated to avoid allocation overhead during the
              timed portion
            </li>
            <li>
              CPU benchmarks use all available threads (no artificial thread
              limits)
            </li>
            <li>
              Renderers are compared at equivalent settings: same scene, same
              resolution, same sample count
            </li>
          </ul>
        </MethodologyItem>

        <MethodologyItem title="Image Quality Measurement">
          <ul className="list-inside list-disc space-y-1.5">
            <li>
              <strong>Reference image:</strong> Highest-quality render (65,536
              SPP) from the same renderer — each renderer is measured against its
              own converged output
            </li>
            <li>
              <strong>PSNR</strong> (Peak Signal-to-Noise Ratio): Measures
              pixel-level numerical accuracy in dB
            </li>
            <li>
              <strong>SSIM</strong> (Structural Similarity Index): Measures
              perceptual similarity accounting for luminance, contrast, and
              structure
            </li>
            <li>
              <strong>MSE</strong> (Mean Squared Error): Raw numerical error for
              statistical analysis
            </li>
            <li>
              <strong>LPIPS</strong> (Learned Perceptual Image Patch Similarity):
              Deep learning-based perceptual metric — available when the ML
              optional dependency is installed
            </li>
            <li>
              All metrics are computed on the linear HDR image before tone
              mapping to avoid introducing display-dependent artifacts
            </li>
          </ul>
        </MethodologyItem>

        <MethodologyItem title="Reproducibility">
          <ul className="list-inside list-disc space-y-1.5">
            <li>
              All settings, hardware specs, and renderer versions are recorded
              with every benchmark entry
            </li>
            <li>
              Benchmark data files include exact timestamps and system
              configurations
            </li>
            <li>
              The RenderScope CLI tool (
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                pip install renderscope
              </code>
              ) can reproduce any benchmark on your own hardware
            </li>
            <li>
              Raw data is available for download in JSON and CSV formats (see
              the Download section below)
            </li>
            <li>
              Community members can submit their own benchmark results via the
              CLI tool for inclusion in the dataset
            </li>
          </ul>
        </MethodologyItem>
      </div>
    </motion.section>
  );
}
