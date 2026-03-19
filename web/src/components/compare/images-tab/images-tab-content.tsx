"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQueryState } from "nuqs";
import { motion } from "framer-motion";
import { ImageOff } from "lucide-react";
import {
  compareSceneParser,
  compareModeParser,
  comparePairParser,
} from "@/lib/compare-url-state";
import {
  type CompareMode,
  isPairMode,
  resolveRenderImages,
} from "@/lib/compare-images";
import { SceneSelector } from "./scene-selector";
import { ComparisonModeToolbar } from "./comparison-mode-toolbar";
import { RendererPairPicker } from "./renderer-pair-picker";
import { ComparisonViewport } from "./comparison-viewport";
import { RenderMetadataBar } from "./render-metadata-bar";
import { PlaceholderBadge } from "./placeholder-badge";
import type { RendererData } from "@/types/renderer";
import type { SceneData } from "@/types/scene";
import type { RenderImageMeta } from "@/lib/compare-images";

interface ImagesTabContentProps {
  selectedRenderers: RendererData[];
  scenes: SceneData[];
}

/**
 * Orchestrator for the Images comparison tab.
 *
 * Manages three URL-synced states via nuqs:
 * - `scene` — which benchmark scene to view
 * - `mode` — which comparison mode (slider/diff/heatmap/toggle/zoom)
 * - `pair` — which renderer pair for pairwise modes
 *
 * Composes SceneSelector, ComparisonModeToolbar, RendererPairPicker,
 * ComparisonViewport, and RenderMetadataBar into a cohesive layout.
 */
export function ImagesTabContent({
  selectedRenderers,
  scenes,
}: ImagesTabContentProps) {
  // ── URL state ─────────────────────────────────────────────

  const [sceneId, setSceneId] = useQueryState(
    "scene",
    compareSceneParser.withOptions({ history: "push", shallow: false })
  );

  const [mode, setMode] = useQueryState(
    "mode",
    compareModeParser.withOptions({ history: "push", shallow: false })
  );

  const [pairIds, setPairIds] = useQueryState(
    "pair",
    comparePairParser.withOptions({ history: "push", shallow: false })
  );

  // ── Derived state ─────────────────────────────────────────

  // Resolve selected scene (fall back to first scene if ID is empty/invalid)
  const selectedScene = useMemo(() => {
    if (sceneId) {
      const found = scenes.find((s) => s.id === sceneId);
      if (found) return found;
    }
    return scenes[0] ?? null;
  }, [sceneId, scenes]);

  // Auto-select first scene when URL param is empty or invalid
  useEffect(() => {
    if (selectedScene && sceneId !== selectedScene.id) {
      void setSceneId(selectedScene.id);
    }
  }, [selectedScene, sceneId, setSceneId]);

  // Resolve render images for the selected scene + renderers
  const { images: allImages, isPlaceholder } = useMemo(() => {
    if (!selectedScene) return { images: [] as RenderImageMeta[], isPlaceholder: true };
    return resolveRenderImages(selectedScene, selectedRenderers);
  }, [selectedScene, selectedRenderers]);

  // Derive renderer options for pair picker
  const rendererOptions = useMemo(
    () => selectedRenderers.map((r) => ({ id: r.id, name: r.name })),
    [selectedRenderers]
  );

  // Resolve the pair selection (validate against currently selected renderers)
  const resolvedPair = useMemo((): [string, string] | null => {
    if (selectedRenderers.length < 2) return null;

    const validIds = new Set(selectedRenderers.map((r) => r.id));
    const leftId = pairIds[0];
    const rightId = pairIds[1];

    // Both must be valid and different
    if (
      leftId &&
      rightId &&
      leftId !== rightId &&
      validIds.has(leftId) &&
      validIds.has(rightId)
    ) {
      return [leftId, rightId];
    }

    // Fall back to first two renderers
    const first = selectedRenderers[0];
    const second = selectedRenderers[1];
    if (first && second) {
      return [first.id, second.id];
    }
    return null;
  }, [pairIds, selectedRenderers]);

  // Auto-correct stale pair in URL
  useEffect(() => {
    if (!resolvedPair) return;
    const [resolvedLeft, resolvedRight] = resolvedPair;
    if (pairIds[0] !== resolvedLeft || pairIds[1] !== resolvedRight) {
      void setPairIds([resolvedLeft, resolvedRight]);
    }
  }, [resolvedPair, pairIds, setPairIds]);

  // Get the pair images for pairwise modes
  const pairImages = useMemo((): [RenderImageMeta, RenderImageMeta] | null => {
    if (!resolvedPair) return null;

    const left = allImages.find((img) => img.rendererId === resolvedPair[0]);
    const right = allImages.find((img) => img.rendererId === resolvedPair[1]);

    if (left && right) return [left, right];
    return null;
  }, [resolvedPair, allImages]);

  // Should we show the pair picker?
  const showPairPicker =
    isPairMode(mode) && selectedRenderers.length > 2 && resolvedPair !== null;

  // ── Callbacks ─────────────────────────────────────────────

  const handleSceneChange = useCallback(
    (id: string) => {
      void setSceneId(id);
    },
    [setSceneId]
  );

  const handleModeChange = useCallback(
    (newMode: CompareMode) => {
      void setMode(newMode);
    },
    [setMode]
  );

  const handlePairChange = useCallback(
    (pair: [string, string]) => {
      void setPairIds(pair);
    },
    [setPairIds]
  );

  // ── Empty state: no scenes ────────────────────────────────

  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ImageOff className="mb-3 h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">
          No benchmark scenes are available yet.
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Controls row: scene selector + mode toolbar */}
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <SceneSelector
          scenes={scenes}
          selectedSceneId={selectedScene?.id ?? null}
          onSceneChange={handleSceneChange}
        />
        <ComparisonModeToolbar
          activeMode={mode}
          onModeChange={handleModeChange}
        />
      </motion.div>

      {/* Pair picker (only for pairwise modes with >2 renderers) */}
      {showPairPicker && resolvedPair && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <RendererPairPicker
            renderers={rendererOptions}
            selectedPair={resolvedPair}
            onPairChange={handlePairChange}
          />
        </motion.div>
      )}

      {/* Viewport with placeholder badge */}
      <div className="relative">
        {isPlaceholder && (
          <div className="absolute right-3 top-3 z-10">
            <PlaceholderBadge />
          </div>
        )}
        <ComparisonViewport
          mode={mode}
          allImages={allImages}
          pairImages={pairImages}
          isPlaceholder={isPlaceholder}
        />
      </div>

      {/* Render metadata bar */}
      <RenderMetadataBar images={allImages} isPlaceholder={isPlaceholder} />
    </div>
  );
}
