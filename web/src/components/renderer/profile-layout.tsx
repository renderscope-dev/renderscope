"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Image,
  BookOpen,
  GitBranch,
  Terminal,
  BarChart3,
} from "lucide-react";
import type { RendererData } from "@/types/renderer";
import { ProfileBreadcrumb } from "@/components/renderer/profile-breadcrumb";
import { ProfileHeader } from "@/components/renderer/profile-header";
import { AtAGlanceCard } from "@/components/renderer/at-a-glance-card";
import { SectionPlaceholder } from "@/components/renderer/section-placeholder";
import { Separator } from "@/components/ui/separator";

interface ProfileLayoutProps {
  renderer: RendererData;
}

export function ProfileLayout({ renderer }: ProfileLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <ProfileBreadcrumb rendererName={renderer.name} />
      </motion.div>

      {/* Profile Header */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <ProfileHeader renderer={renderer} />
      </motion.div>

      <Separator className="my-10 opacity-50" />

      {/* At a Glance Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
      >
        <AtAGlanceCard renderer={renderer} />
      </motion.div>

      {/* Future sections — placeholders with staggered animation */}
      <div className="mt-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
        >
          <SectionPlaceholder
            title="Activity"
            description="GitHub activity sparkline and commit history visualization"
            icon={Activity}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
        >
          <SectionPlaceholder
            title="Gallery"
            description="Sample rendered images from this engine"
            icon={Image}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
        >
          <SectionPlaceholder
            title="Strengths & Limitations"
            description="Editorial analysis of this rendering engine"
            icon={BookOpen}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
        >
          <SectionPlaceholder
            title="Related Renderers"
            description="Similar and related rendering engines"
            icon={GitBranch}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}
        >
          <SectionPlaceholder
            title="Quick Start"
            description="Installation and first render commands"
            icon={Terminal}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
        >
          <SectionPlaceholder
            title="Benchmarks"
            description="Performance benchmark data and comparisons"
            icon={BarChart3}
          />
        </motion.div>
      </div>
    </div>
  );
}
