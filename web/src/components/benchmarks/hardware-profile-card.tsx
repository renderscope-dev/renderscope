"use client";

import { Cpu, Monitor, HardDrive, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HardwareProfile } from "@/types/benchmark";

interface HardwareProfileCardProps {
  profile: HardwareProfile;
  benchmarkCount: number;
  isActive: boolean;
  onToggle: () => void;
}

export function HardwareProfileCard({
  profile,
  benchmarkCount,
  isActive,
  onToggle,
}: HardwareProfileCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isActive}
      className={cn(
        "w-full rounded-xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
          : "border-border/50 bg-card hover:border-border hover:shadow-lg hover:shadow-black/10"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {profile.label}
        </h3>
        <Badge
          variant="secondary"
          className="tabular-nums text-xs"
        >
          {benchmarkCount} benchmarks
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2.5 text-sm">
          <Monitor className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-medium text-foreground">{profile.gpu}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Cpu className="h-4 w-4 shrink-0" />
          <span>{profile.cpu}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <HardDrive className="h-4 w-4 shrink-0" />
          <span>{profile.ram_gb} GB RAM</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Server className="h-4 w-4 shrink-0" />
          <span>
            {profile.os}
            {profile.driver ? ` · ${profile.driver}` : ""}
          </span>
        </div>
      </div>
    </button>
  );
}
