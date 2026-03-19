"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  id: string;
  name: string;
}

interface BenchmarkTableFiltersProps {
  availableRenderers: FilterOption[];
  availableScenes: FilterOption[];
  availableHardware: FilterOption[];
  activeRenderers: string[];
  activeScenes: string[];
  activeHardware: string[];
  onRendererChange: (values: string[]) => void;
  onSceneChange: (values: string[]) => void;
  onHardwareChange: (values: string[]) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  filteredCount: number;
  totalCount: number;
}

export function BenchmarkTableFilters({
  availableRenderers,
  availableScenes,
  availableHardware,
  activeRenderers,
  activeScenes,
  activeHardware,
  onRendererChange,
  onSceneChange,
  onHardwareChange,
  onClearAll,
  hasActiveFilters,
  filteredCount,
  totalCount,
}: BenchmarkTableFiltersProps) {
  const handleToggle = (
    current: string[],
    value: string,
    onChange: (v: string[]) => void
  ) => {
    if (current.includes(value)) {
      onChange(current.filter((v) => v !== value));
    } else {
      onChange([...current, value]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Renderer filter */}
        <Select
          value=""
          onValueChange={(value) =>
            handleToggle(activeRenderers, value, onRendererChange)
          }
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter by renderer">
            <SelectValue
              placeholder={
                activeRenderers.length > 0
                  ? `${activeRenderers.length} renderer${activeRenderers.length > 1 ? "s" : ""}`
                  : "All Renderers"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableRenderers.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                <span className="flex items-center gap-2">
                  {activeRenderers.includes(r.id) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  {r.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Scene filter */}
        <Select
          value=""
          onValueChange={(value) =>
            handleToggle(activeScenes, value, onSceneChange)
          }
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter by scene">
            <SelectValue
              placeholder={
                activeScenes.length > 0
                  ? `${activeScenes.length} scene${activeScenes.length > 1 ? "s" : ""}`
                  : "All Scenes"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableScenes.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  {activeScenes.includes(s.id) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Hardware filter */}
        <Select
          value=""
          onValueChange={(value) =>
            handleToggle(activeHardware, value, onHardwareChange)
          }
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter by hardware profile">
            <SelectValue
              placeholder={
                activeHardware.length > 0
                  ? `${activeHardware.length} profile${activeHardware.length > 1 ? "s" : ""}`
                  : "All Hardware"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableHardware.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                <span className="flex items-center gap-2">
                  {activeHardware.includes(h.id) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  {h.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Result count */}
      <p className="text-sm tabular-nums text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{filteredCount}</span> of{" "}
        <span className="font-medium text-foreground">{totalCount}</span>{" "}
        results
      </p>
    </div>
  );
}
