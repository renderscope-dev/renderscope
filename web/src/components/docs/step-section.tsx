"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  content: React.ReactNode;
}

interface StepSectionProps {
  steps: Step[];
  className?: string;
}

export function StepSection({ steps, className }: StepSectionProps) {
  return (
    <div className={cn("relative", className)}>
      {steps.map((step, index) => (
        <motion.div
          key={index}
          className="relative flex gap-4 pb-8 last:pb-0"
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
        >
          {/* Vertical connector line */}
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-sm font-semibold text-sky-400">
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="mt-2 w-px flex-1 bg-border/50" />
            )}
          </div>

          {/* Step content */}
          <div className="flex-1 pb-2 pt-1">
            <h4 className="mb-2 text-base font-semibold text-foreground">
              {step.title}
            </h4>
            <div className="text-sm leading-relaxed text-muted-foreground">
              {step.content}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
