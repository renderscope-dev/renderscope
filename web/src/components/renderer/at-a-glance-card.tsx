"use client";

import {
  Cpu,
  Monitor,
  Calendar,
  Tag,
  FileCode,
  FileOutput,
  Crosshair,
  Scale,
  Layers,
  Sparkles,
} from "lucide-react";
import type { RendererData } from "@/types/renderer";
import { MetadataRow } from "@/components/renderer/metadata-row";
import { PlatformBadge } from "@/components/shared/platform-badge";
import {
  techniqueLabels,
  sceneFormatLabels,
  outputFormatLabels,
  gpuApiLabels,
} from "@/lib/constants";
import { formatDate, formatListWithFallback } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface AtAGlanceCardProps {
  renderer: RendererData;
}

function BooleanIndicator({ value }: { value: boolean }) {
  return value ? (
    <span className="flex items-center gap-1 text-emerald-400">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Yes</span>
    </span>
  ) : (
    <span className="flex items-center gap-1 text-muted-foreground/50">
      <X className="h-3.5 w-3.5" aria-hidden="true" />
      <span>No</span>
    </span>
  );
}

export function AtAGlanceCard({ renderer }: AtAGlanceCardProps) {
  const techniqueList = renderer.technique
    .map((t) => techniqueLabels[t] ?? t)
    .join(", ");

  const gpuDisplay =
    renderer.gpu_support && renderer.gpu_apis && renderer.gpu_apis.length > 0
      ? renderer.gpu_apis.map((api) => gpuApiLabels[api] ?? api).join(", ")
      : null;

  const sceneFormats = formatListWithFallback(
    renderer.scene_formats,
    sceneFormatLabels
  );
  const outputFormats = formatListWithFallback(
    renderer.output_formats,
    outputFormatLabels
  );

  const latestReleaseDisplay = (() => {
    const parts: string[] = [];
    if (renderer.latest_release_version)
      parts.push(renderer.latest_release_version);
    if (renderer.latest_release)
      parts.push(formatDate(renderer.latest_release));
    return parts.length > 0 ? parts.join(" \u2014 ") : null;
  })();

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">At a Glance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <MetadataRow label="Technique" icon={Crosshair}>
            {techniqueList}
          </MetadataRow>

          <MetadataRow label="Language" icon={FileCode}>
            {renderer.language}
          </MetadataRow>

          <MetadataRow label="License" icon={Scale}>
            <span className="font-mono text-xs">{renderer.license}</span>
          </MetadataRow>

          <MetadataRow label="Platforms" icon={Monitor}>
            <div className="flex flex-wrap gap-1.5">
              {renderer.platforms.map((p) => (
                <PlatformBadge key={p} platform={p} />
              ))}
            </div>
          </MetadataRow>

          <MetadataRow label="GPU Support" icon={Layers}>
            {renderer.gpu_support ? (
              <span className="text-emerald-400">
                Yes{gpuDisplay ? ` (${gpuDisplay})` : ""}
              </span>
            ) : (
              <BooleanIndicator value={false} />
            )}
          </MetadataRow>

          <MetadataRow label="CPU Support" icon={Cpu}>
            <BooleanIndicator value={renderer.cpu_support} />
          </MetadataRow>

          {sceneFormats && (
            <MetadataRow label="Scene Formats" icon={FileCode}>
              <span className="leading-relaxed">{sceneFormats}</span>
            </MetadataRow>
          )}

          {outputFormats && (
            <MetadataRow label="Output Formats" icon={FileOutput}>
              <span className="leading-relaxed">{outputFormats}</span>
            </MetadataRow>
          )}

          {renderer.first_release && (
            <MetadataRow label="First Release" icon={Calendar}>
              {formatDate(renderer.first_release)}
            </MetadataRow>
          )}

          {latestReleaseDisplay && (
            <MetadataRow label="Latest Release" icon={Tag}>
              {latestReleaseDisplay}
            </MetadataRow>
          )}

          {renderer.best_for && (
            <MetadataRow
              label="Best For"
              icon={Sparkles}
              className="md:col-span-2"
            >
              <em className="text-foreground/80">{renderer.best_for}</em>
            </MetadataRow>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
