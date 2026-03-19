"use client";

import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RendererOption {
  id: string;
  name: string;
}

interface RendererPairPickerProps {
  renderers: RendererOption[];
  selectedPair: [string, string];
  onPairChange: (pair: [string, string]) => void;
  className?: string;
}

/**
 * Compact pair selector for pairwise comparison modes (Slider, Diff, Heatmap).
 * Shows two dropdowns (Left/Reference and Right/Test) with a swap button.
 * Only displayed when >2 renderers are selected.
 */
export function RendererPairPicker({
  renderers,
  selectedPair,
  onPairChange,
  className,
}: RendererPairPickerProps) {
  const handleLeftChange = (id: string) => {
    onPairChange([id, selectedPair[1]]);
  };

  const handleRightChange = (id: string) => {
    onPairChange([selectedPair[0], id]);
  };

  const handleSwap = () => {
    onPairChange([selectedPair[1], selectedPair[0]]);
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-border/40 bg-muted/20 p-3",
        "sm:flex-row sm:gap-3",
        className
      )}
    >
      {/* Left / Reference */}
      <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-1">
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Left
        </span>
        <Select value={selectedPair[0]} onValueChange={handleLeftChange}>
          <SelectTrigger
            className="w-full sm:w-[180px]"
            aria-label="Left renderer (reference)"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {renderers
              .filter((r) => r.id !== selectedPair[1])
              .map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Swap button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSwap}
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Swap left and right renderers"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </Button>

      {/* Right / Test */}
      <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-1">
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Right
        </span>
        <Select value={selectedPair[1]} onValueChange={handleRightChange}>
          <SelectTrigger
            className="w-full sm:w-[180px]"
            aria-label="Right renderer (test)"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {renderers
              .filter((r) => r.id !== selectedPair[0])
              .map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
