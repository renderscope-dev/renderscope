"use client";

import { motion } from "framer-motion";
import type { HardwareProfile, BenchmarkTableRow } from "@/types/benchmark";
import { HardwareProfileCard } from "./hardware-profile-card";

interface HardwareProfilesSectionProps {
  profiles: HardwareProfile[];
  rows: BenchmarkTableRow[];
  activeHardware: string[];
  onToggleHardware: (hwId: string) => void;
}

export function HardwareProfilesSection({
  profiles,
  rows,
  activeHardware,
  onToggleHardware,
}: HardwareProfilesSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        Hardware Profiles
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        All benchmarks are run on standardized hardware. Click a profile to
        filter the table below.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const count = rows.filter(
            (r) => r.hardwareId === profile.id
          ).length;
          return (
            <HardwareProfileCard
              key={profile.id}
              profile={profile}
              benchmarkCount={count}
              isActive={activeHardware.includes(profile.id)}
              onToggle={() => onToggleHardware(profile.id)}
            />
          );
        })}
      </div>
    </motion.section>
  );
}
