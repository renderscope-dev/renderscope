"use client";

import { motion } from "framer-motion";
import { Activity, ImageIcon } from "lucide-react";
import type { RendererData, SampleRender } from "@/types/renderer";
import type { BenchmarkEntry } from "@/types/benchmark";
import { ProfileBreadcrumb } from "@/components/renderer/profile-breadcrumb";
import { ProfileHeader } from "@/components/renderer/profile-header";
import { AtAGlanceCard } from "@/components/renderer/at-a-glance-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { ActivitySparkline } from "@/components/renderer/activity-sparkline";
import { ActivityStats } from "@/components/renderer/activity-stats";
import { SampleGallery } from "@/components/renderer/sample-gallery";
import { EditorialSection } from "@/components/renderer/editorial-section";
import { QuickStart } from "@/components/renderer/quick-start";
import { RelatedRenderers } from "@/components/renderer/related-renderers";
import { CommunityLinks } from "@/components/renderer/community-links";
import { BenchmarkSummary } from "@/components/renderer/benchmark-summary";
import { Separator } from "@/components/ui/separator";
import { placeholderRenders } from "@/lib/constants";

interface ProfileLayoutProps {
  renderer: RendererData;
  relatedRenderers: RendererData[];
  highlightedInstallHtml?: string;
  benchmarks?: BenchmarkEntry[];
  sceneSampleImages?: SampleRender[];
}

function prepareSampleRenders(
  renderer: RendererData,
  sceneSampleImages?: SampleRender[],
): SampleRender[] {
  // Prefer scene-derived sample images (real rendered images from benchmarks)
  if (sceneSampleImages && sceneSampleImages.length > 0) {
    return sceneSampleImages;
  }

  // Fall back to renderer-specified sample_renders
  if (renderer.sample_renders && renderer.sample_renders.length > 0) {
    return renderer.sample_renders.map((src, i) => ({
      src,
      scene: `Sample ${i + 1}`,
      renderer: renderer.name,
    }));
  }

  // Final fallback: placeholder SVGs
  return placeholderRenders.map((p) => ({
    src: p.src,
    scene: p.scene,
    renderer: renderer.name,
  }));
}

export function ProfileLayout({
  renderer,
  relatedRenderers,
  highlightedInstallHtml,
  benchmarks = [],
  sceneSampleImages,
}: ProfileLayoutProps) {
  const sampleImages = prepareSampleRenders(renderer, sceneSampleImages);

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

      {/* ── Development Activity ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <SectionHeading
          title="Development Activity"
          icon={<Activity className="h-5 w-5" />}
          id="activity"
        />
        <div className="space-y-4 rounded-xl border border-border/50 bg-card/50 p-6">
          <ActivitySparkline
            commitActivity={renderer.commit_activity_52w ?? []}
          />
          <ActivityStats
            stars={renderer.github_stars}
            starsTrend={renderer.github_stars_trend}
            latestRelease={renderer.latest_release}
            latestReleaseVersion={renderer.latest_release_version}
            contributors={renderer.contributor_count}
            repositoryUrl={renderer.repository}
          />
        </div>
      </motion.div>

      {/* ── Sample Renders ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <SectionHeading
          title="Sample Renders"
          icon={<ImageIcon className="h-5 w-5" />}
          id="gallery"
        />
        <SampleGallery
          rendererName={renderer.name}
          images={sampleImages}
        />
      </motion.div>

      {/* ── Editorial Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <EditorialSection
          strengths={renderer.strengths}
          limitations={renderer.limitations}
          bestFor={renderer.best_for}
          notIdealFor={renderer.not_ideal_for}
          longDescription={renderer.long_description}
        />
      </motion.div>

      {/* ── Quick Start ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <QuickStart
          installCommand={renderer.install_command}
          highlightedInstallHtml={highlightedInstallHtml}
          repository={renderer.repository}
          documentation={renderer.documentation}
          name={renderer.name}
        />
      </motion.div>

      {/* ── Related Renderers (conditional) ── */}
      {relatedRenderers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <RelatedRenderers
            renderers={relatedRenderers}
            currentRendererId={renderer.id}
          />
        </motion.div>
      )}

      {/* ── Community Links (self-guards: returns null if no data) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <CommunityLinks
          communityLinks={renderer.community_links}
          paper={renderer.paper}
          paperBibtex={renderer.paper_bibtex}
          citations={renderer.citations}
          tutorials={renderer.tutorials}
        />
      </motion.div>

      {/* ── Benchmark Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <BenchmarkSummary
          rendererName={renderer.name}
          rendererId={renderer.id}
          benchmarks={benchmarks}
        />
      </motion.div>
    </div>
  );
}
