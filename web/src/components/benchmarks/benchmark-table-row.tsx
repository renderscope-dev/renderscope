"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatRenderTime } from "@/lib/utils";
import { formatMemory, formatPSNR, formatSSIM } from "@/lib/format";
import { techniqueColorMap } from "@/lib/constants";
import type { BenchmarkTableRow as BenchmarkTableRowType } from "@/types/benchmark";

interface BenchmarkTableRowProps {
  row: BenchmarkTableRowType;
  highlightedRowId?: string | null;
}

export function BenchmarkTableRowComponent({
  row,
  highlightedRowId,
}: BenchmarkTableRowProps) {
  const isHighlighted = highlightedRowId === row.id;
  const primaryTechnique = row.rendererTechnique[0];
  const techniqueClass = primaryTechnique
    ? techniqueColorMap[primaryTechnique as keyof typeof techniqueColorMap]
    : undefined;

  return (
    <TableRow
      data-row-id={row.id}
      tabIndex={isHighlighted ? 0 : -1}
      className={cn(
        "transition-all duration-200",
        isHighlighted
          ? "border-l-2 border-l-primary bg-primary/8 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.1)] animate-highlight-pulse"
          : "border-l-2 border-l-transparent"
      )}
    >
      {/* Renderer — sticky on mobile */}
      <TableCell className="sticky left-0 z-10 bg-card font-medium">
        <div className="flex items-center gap-2">
          <Link
            href={`/renderers/${row.renderer}`}
            className="text-foreground hover:text-primary hover:underline"
          >
            {row.rendererName}
          </Link>
          {techniqueClass && (
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[10px]", techniqueClass)}
            >
              {primaryTechnique?.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Scene */}
      <TableCell>
        <Link
          href={`/gallery/${row.scene}`}
          className="text-muted-foreground hover:text-primary hover:underline"
        >
          {row.sceneName}
        </Link>
      </TableCell>

      {/* Render Time */}
      <TableCell className="text-right tabular-nums">
        {formatRenderTime(row.renderTime)}
      </TableCell>

      {/* Peak Memory */}
      <TableCell className="text-right tabular-nums">
        {formatMemory(row.peakMemory)}
      </TableCell>

      {/* PSNR */}
      <TableCell className="text-right tabular-nums">
        {formatPSNR(row.psnr)}
      </TableCell>

      {/* SSIM */}
      <TableCell className="text-right tabular-nums">
        {formatSSIM(row.ssim)}
      </TableCell>

      {/* Hardware */}
      <TableCell className="text-muted-foreground">
        {row.hardwareLabel}
      </TableCell>
    </TableRow>
  );
}
