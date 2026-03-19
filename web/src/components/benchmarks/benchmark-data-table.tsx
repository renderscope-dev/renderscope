"use client";

import { ArrowUp, ArrowDown, ArrowUpDown, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type {
  BenchmarkTableRow,
  SortConfig,
  SortField,
} from "@/types/benchmark";
import { BenchmarkTableRowComponent } from "./benchmark-table-row";

interface ColumnDef {
  key: SortField;
  label: string;
  align: "left" | "right";
}

const COLUMNS: ColumnDef[] = [
  { key: "renderer", label: "Renderer", align: "left" },
  { key: "scene", label: "Scene", align: "left" },
  { key: "renderTime", label: "Render Time", align: "right" },
  { key: "peakMemory", label: "Peak Memory", align: "right" },
  { key: "psnr", label: "PSNR", align: "right" },
  { key: "ssim", label: "SSIM", align: "right" },
  { key: "hardwareLabel", label: "Hardware", align: "left" },
];

interface BenchmarkDataTableProps {
  rows: BenchmarkTableRow[];
  sortConfig: SortConfig;
  onSort: (config: SortConfig) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  highlightedRowId?: string | null;
  onClearHighlight?: () => void;
  onClearFilters?: () => void;
}

function SortIcon({
  field,
  sortConfig,
}: {
  field: SortField;
  sortConfig: SortConfig;
}) {
  if (sortConfig.field !== field) {
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
  }
  return sortConfig.direction === "asc" ? (
    <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
  ) : (
    <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
  );
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

export function BenchmarkDataTable({
  rows,
  sortConfig,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  highlightedRowId = null,
  onClearHighlight,
  onClearFilters,
}: BenchmarkDataTableProps) {
  const handleSort = (field: SortField) => {
    if (sortConfig.field === field) {
      onSort({
        field,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      });
    } else {
      onSort({ field, direction: "asc" });
    }
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card px-6 py-16">
        <Inbox className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <p className="mb-1 text-lg font-medium text-foreground">
          No benchmarks match your current filters
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          Try adjusting your filter criteria to see more results.
        </p>
        {onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div data-testid="benchmark-table" className="space-y-4">
      {/* Highlight dismiss bar */}
      {highlightedRowId && onClearHighlight && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="text-xs text-muted-foreground">
            Highlighted from chart click
          </span>
          <button
            type="button"
            onClick={onClearHighlight}
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scrollable table wrapper */}
      <div
        role="region"
        aria-label="Benchmark results table, scrollable"
        tabIndex={0}
        className="relative overflow-x-auto rounded-xl border border-border/50"
      >
        {/* Right-edge scroll indicator */}
        <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-8 bg-gradient-to-l from-background/80 to-transparent md:hidden" />

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  aria-sort={
                    sortConfig.field === col.key
                      ? sortConfig.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={cn(
                    "whitespace-nowrap",
                    col.key === "renderer" &&
                      "sticky left-0 z-10 bg-card",
                    col.align === "right" && "text-right"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className={cn(
                      "inline-flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-foreground",
                      sortConfig.field === col.key
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {col.label}
                    <SortIcon field={col.key} sortConfig={sortConfig} />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <BenchmarkTableRowComponent
                key={row.id}
                row={row}
                highlightedRowId={highlightedRowId}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={cn(
                  "cursor-pointer",
                  currentPage <= 1 && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>

            {getPageNumbers(currentPage, totalPages).map((page, idx) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === currentPage}
                    onClick={() => onPageChange(page)}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                className={cn(
                  "cursor-pointer",
                  currentPage >= totalPages &&
                    "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
