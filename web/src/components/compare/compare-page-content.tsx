"use client";

import { useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQueryState } from "nuqs";
import { motion } from "framer-motion";
import { GitCompareArrows } from "lucide-react";
import {
  compareRenderersParser,
  compareTabParser,
  MIN_COMPARE_RENDERERS,
  type CompareTab,
} from "@/lib/compare-url-state";
import { RendererPicker } from "./renderer-picker";
import { CompareTabNav } from "./compare-tab-nav";
import { CompareEmptyState } from "./compare-empty-state";
import { CompareShareButton } from "./compare-share-button";
import { FeatureMatrix } from "./feature-matrix";
import { ImagesTabContent } from "./images-tab";
import { PerformanceTabSkeleton } from "./performance-tab-skeleton";
import type { RendererData } from "@/types/renderer";
import type { SceneData } from "@/types/scene";

/**
 * Dynamically import the Recharts-heavy PerformanceTab.
 * This keeps Recharts out of the Compare page's initial chunk
 * and loads it only when the user switches to the Performance tab.
 */
const PerformanceTab = dynamic(
  () => import("./performance-tab").then((mod) => mod.PerformanceTab),
  {
    ssr: true,
    loading: () => <PerformanceTabSkeleton />,
  }
);

interface ComparePageContentProps {
  renderers: RendererData[];
  scenes: SceneData[];
}

/**
 * Top-level client component for the Compare page.
 *
 * Manages all interactive state via URL params (nuqs):
 * - `r` — selected renderer IDs (comma-separated)
 * - `tab` — active comparison tab
 *
 * The entire page state is a function of its URL, making it
 * fully shareable and bookmarkable.
 */
export function ComparePageContent({ renderers, scenes }: ComparePageContentProps) {
  // ── URL state ─────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useQueryState(
    "r",
    compareRenderersParser.withOptions({ history: "push", shallow: false })
  );

  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    compareTabParser.withOptions({ history: "push", shallow: false })
  );

  // ── Derived state ─────────────────────────────────────────

  // Resolve IDs to full renderer objects (silently drops invalid IDs)
  const selectedRenderers = useMemo(
    () =>
      selectedIds
        .map((id) => renderers.find((r) => r.id === id))
        .filter((r): r is RendererData => r != null),
    [selectedIds, renderers]
  );

  // Clean invalid IDs from the URL
  useEffect(() => {
    const validIds = selectedRenderers.map((r) => r.id);
    // Deduplicate
    const dedupedIds = [...new Set(validIds)];
    if (
      dedupedIds.length !== selectedIds.length ||
      dedupedIds.some((id, i) => id !== selectedIds[i])
    ) {
      void setSelectedIds(dedupedIds.length > 0 ? dedupedIds : null);
    }
  }, [selectedRenderers, selectedIds, setSelectedIds]);

  const isComparisonReady = selectedRenderers.length >= MIN_COMPARE_RENDERERS;

  // ── Callbacks ─────────────────────────────────────────────

  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      void setSelectedIds(ids.length > 0 ? ids : null);
    },
    [setSelectedIds]
  );

  const handleTabChange = useCallback(
    (tab: CompareTab) => {
      void setActiveTab(tab);
    },
    [setActiveTab]
  );

  const handleAddRenderer = useCallback(
    (id: string) => {
      if (!selectedIds.includes(id)) {
        void setSelectedIds([...selectedIds, id]);
      }
    },
    [selectedIds, setSelectedIds]
  );

  const handleRemoveRenderer = useCallback(
    (id: string) => {
      const next = selectedIds.filter((rid) => rid !== id);
      void setSelectedIds(next.length > 0 ? next : null);
    },
    [selectedIds, setSelectedIds]
  );

  // ── Dynamic subtitle ─────────────────────────────────────

  const subtitle = useMemo(() => {
    if (selectedRenderers.length === 0) return "Select 2\u20135 renderers to compare";
    if (selectedRenderers.length === 1) return "Select one more renderer";
    return `Comparing ${selectedRenderers.length} renderers`;
  }, [selectedRenderers.length]);

  // ── Tab content map (easy replacement for sessions 11.2\u201311.4) ──

  const tabContent: Record<CompareTab, React.ReactNode> = {
    features: (
      <FeatureMatrix
        renderers={selectedRenderers}
        onRemoveRenderer={handleRemoveRenderer}
      />
    ),
    images: (
      <ImagesTabContent
        selectedRenderers={selectedRenderers}
        scenes={scenes}
      />
    ),
    performance: (
      <PerformanceTab
        selectedRendererIds={selectedRenderers.map((r) => r.id)}
      />
    ),
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 text-purple-500/60">
              <GitCompareArrows className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Compare Renderers
            </h1>
            <p className="mt-2 text-base text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          </div>

          {isComparisonReady && <CompareShareButton className="mt-2" />}
        </div>
      </motion.div>

      {/* Renderer Picker */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      >
        <RendererPicker
          allRenderers={renderers}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
        />
      </motion.div>

      {/* Tab navigation + content — or empty state */}
      {isComparisonReady ? (
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <CompareTabNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          <div className="mt-6">{tabContent[activeTab]}</div>
        </motion.div>
      ) : (
        <div className="mt-8">
          <CompareEmptyState
            selectedRenderer={
              selectedRenderers.length === 1
                ? selectedRenderers[0]
                : undefined
            }
            allRenderers={renderers}
            onAddRenderer={handleAddRenderer}
          />
        </div>
      )}

      {/* Bottom spacing */}
      <div className="pb-20" />
    </div>
  );
}
