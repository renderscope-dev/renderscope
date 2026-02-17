"use client";

import { Cpu, Gpu } from "lucide-react";
import type { RendererData } from "@/types/renderer";
import { TechniqueBadge } from "@/components/shared/technique-badge";
import { StatusIndicator } from "@/components/shared/status-indicator";
import { StarRating } from "@/components/shared/star-rating";
import { ExternalLinks } from "@/components/renderer/external-links";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { gpuApiLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ProfileHeaderProps {
  renderer: RendererData;
}

export function ProfileHeader({ renderer }: ProfileHeaderProps) {
  const gpuSummary =
    renderer.gpu_support && renderer.gpu_apis && renderer.gpu_apis.length > 0
      ? renderer.gpu_apis
          .slice(0, 3)
          .map((api) => gpuApiLabels[api] ?? api)
          .join(", ")
      : null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      {/* Left column: Name, description, badges */}
      <div className="flex-1 space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {renderer.name}
          </h1>
          {renderer.version && (
            <span className="mt-1 inline-block text-sm font-mono text-muted-foreground">
              v{renderer.version}
            </span>
          )}
        </div>

        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {renderer.description}
        </p>

        {/* Badge row */}
        <div className="flex flex-wrap items-center gap-2">
          {renderer.technique.map((t) => (
            <TechniqueBadge key={t} technique={t} size="md" />
          ))}

          <Badge
            variant="secondary"
            className="text-xs font-medium"
          >
            {renderer.language}
          </Badge>

          <Badge
            variant="outline"
            className="text-xs font-mono"
          >
            {renderer.license}
          </Badge>

          <StatusIndicator status={renderer.status} size="sm" />

          {renderer.gpu_support && (
            <Badge
              variant="secondary"
              className={cn(
                "gap-1 text-xs font-medium",
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}
            >
              <Gpu className="h-3 w-3" aria-hidden="true" />
              GPU{gpuSummary ? `: ${gpuSummary}` : ""}
            </Badge>
          )}

          {renderer.cpu_support && (
            <Badge
              variant="secondary"
              className="gap-1 text-xs font-medium"
            >
              <Cpu className="h-3 w-3" aria-hidden="true" />
              CPU
            </Badge>
          )}
        </div>
      </div>

      {/* Right column: Links and stats */}
      <div className="flex w-full shrink-0 flex-col gap-5 lg:w-72">
        <ExternalLinks renderer={renderer} />

        {/* Compact stats */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
          {renderer.github_stars !== undefined && renderer.github_stars > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Stars</span>
              <StarRating stars={renderer.github_stars} showBar={false} />
            </div>
          )}

          {renderer.latest_release_version && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Latest Release
              </span>
              <span className="text-sm font-medium text-foreground/80">
                {renderer.latest_release_version}
              </span>
            </div>
          )}

          {renderer.latest_release && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Release Date
              </span>
              <span className="text-sm text-foreground/70">
                {formatDate(renderer.latest_release)}
              </span>
            </div>
          )}

          {renderer.contributor_count !== undefined &&
            renderer.contributor_count > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Contributors
                </span>
                <span className="text-sm font-medium text-foreground/80">
                  {renderer.contributor_count}
                </span>
              </div>
            )}

          {renderer.fork_count !== undefined && renderer.fork_count > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Forks</span>
              <span className="text-sm font-medium text-foreground/80">
                {renderer.fork_count.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
