"use client";

import { cn } from "@/lib/utils";
import { ComplexityBadge } from "@/components/gallery/complexity-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SceneData } from "@/types/scene";

interface SceneSelectorProps {
  scenes: SceneData[];
  selectedSceneId: string | null;
  onSceneChange: (sceneId: string) => void;
  className?: string;
}

/**
 * Scene selection dropdown for the Images tab.
 * Lists all available standard scenes with complexity badges
 * and truncated descriptions.
 */
export function SceneSelector({
  scenes,
  selectedSceneId,
  onSceneChange,
  className,
}: SceneSelectorProps) {
  if (scenes.length === 0) {
    return (
      <div
        className={cn(
          "flex h-9 items-center rounded-md border border-border/40 bg-muted/20 px-3",
          "text-sm text-muted-foreground",
          className
        )}
      >
        No scenes available
      </div>
    );
  }

  return (
    <Select value={selectedSceneId ?? undefined} onValueChange={onSceneChange}>
      <SelectTrigger
        className={cn("w-full sm:w-[320px]", className)}
        aria-label="Select a benchmark scene"
      >
        <SelectValue placeholder="Select a scene..." />
      </SelectTrigger>
      <SelectContent>
        {scenes.map((scene) => (
          <SelectItem key={scene.id} value={scene.id}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{scene.name}</span>
              <ComplexityBadge complexity={scene.complexity} />
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {scene.description}
            </p>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
