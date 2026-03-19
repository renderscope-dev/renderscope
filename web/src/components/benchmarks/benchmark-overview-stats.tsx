"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { Activity, Cpu, Layers, Monitor } from "lucide-react";
import type { BenchmarkOverviewData } from "@/types/benchmark";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  delay: number;
}

function AnimatedCounter({ value, delay }: { value: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, value, {
        duration: 1.2,
        delay,
        ease: "easeOut",
      });
      return controls.stop;
    }
  }, [isInView, motionValue, value, delay]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent = v.toLocaleString("en-US");
      }
    });
    return unsubscribe;
  }, [rounded]);

  return <span ref={ref}>0</span>;
}

function StatCard({ icon, value, label, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="group rounded-xl border border-border/50 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-lg hover:shadow-black/10"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
        <AnimatedCounter value={value} delay={delay} />
      </p>
    </motion.div>
  );
}

interface BenchmarkOverviewStatsProps {
  overview: BenchmarkOverviewData;
}

export function BenchmarkOverviewStats({
  overview,
}: BenchmarkOverviewStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        icon={<Activity className="h-5 w-5" />}
        value={overview.totalBenchmarks}
        label="Benchmark Runs"
        delay={0}
      />
      <StatCard
        icon={<Cpu className="h-5 w-5" />}
        value={overview.renderersCount}
        label="Renderers Tested"
        delay={0.1}
      />
      <StatCard
        icon={<Layers className="h-5 w-5" />}
        value={overview.scenesCount}
        label="Test Scenes"
        delay={0.2}
      />
      <StatCard
        icon={<Monitor className="h-5 w-5" />}
        value={overview.hardwareProfilesCount}
        label="Hardware Profiles"
        delay={0.3}
      />
    </div>
  );
}
