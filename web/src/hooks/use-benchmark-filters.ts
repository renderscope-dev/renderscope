"use client";

import { useQueryState } from "nuqs";
import { useMemo, useCallback } from "react";
import type {
  BenchmarkTableRow,
  SortField,
  SortDirection,
  SortConfig,
} from "@/types/benchmark";
import {
  benchRendererParser,
  benchSceneParser,
  benchHardwareParser,
  benchSortParser,
  benchSortDirParser,
  benchPageParser,
  BENCH_PAGE_SIZE,
} from "@/lib/benchmark-url-state";

/**
 * useBenchmarkFilters — manages the full filter/sort/paginate pipeline
 * for the benchmark data table.
 *
 * Reads URL params (renderer, scene, hw, sort, dir, page) via nuqs.
 * Returns filtered + sorted + paginated rows, along with setter functions.
 */
export function useBenchmarkFilters(allRows: BenchmarkTableRow[]) {
  // ─── URL State ───────────────────────────────────────────
  const [rendererFilter, setRendererFilter] = useQueryState(
    "renderer",
    benchRendererParser
  );
  const [sceneFilter, setSceneFilter] = useQueryState(
    "scene",
    benchSceneParser
  );
  const [hardwareFilter, setHardwareFilter] = useQueryState(
    "hw",
    benchHardwareParser
  );
  const [sortField, setSortField] = useQueryState("sort", benchSortParser);
  const [sortDir, setSortDir] = useQueryState("dir", benchSortDirParser);
  const [currentPage, setCurrentPage] = useQueryState("page", benchPageParser);

  // ─── Filter ──────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (rendererFilter.length > 0) {
      rows = rows.filter((r) => rendererFilter.includes(r.renderer));
    }
    if (sceneFilter.length > 0) {
      rows = rows.filter((r) => sceneFilter.includes(r.scene));
    }
    if (hardwareFilter.length > 0) {
      rows = rows.filter((r) => hardwareFilter.includes(r.hardwareId));
    }

    return rows;
  }, [allRows, rendererFilter, sceneFilter, hardwareFilter]);

  // ─── Sort ────────────────────────────────────────────────
  const sortConfig: SortConfig = useMemo(
    () => ({
      field: sortField as SortField,
      direction: sortDir as SortDirection,
    }),
    [sortField, sortDir]
  );

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    const { field, direction } = sortConfig;
    const mult = direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      switch (field) {
        case "renderer":
          return mult * a.rendererName.localeCompare(b.rendererName);
        case "scene":
          return mult * a.sceneName.localeCompare(b.sceneName);
        case "renderTime":
          return mult * (a.renderTime - b.renderTime);
        case "peakMemory":
          return mult * (a.peakMemory - b.peakMemory);
        case "psnr":
          return mult * (a.psnr - b.psnr);
        case "ssim":
          return mult * (a.ssim - b.ssim);
        case "hardwareLabel":
          return mult * a.hardwareLabel.localeCompare(b.hardwareLabel);
        default:
          return 0;
      }
    });

    return sorted;
  }, [filteredRows, sortConfig]);

  // ─── Paginate ────────────────────────────────────────────
  const totalPages = Math.max(
    1,
    Math.ceil(sortedRows.length / BENCH_PAGE_SIZE)
  );
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * BENCH_PAGE_SIZE;
    return sortedRows.slice(start, start + BENCH_PAGE_SIZE);
  }, [sortedRows, safePage]);

  // ─── Setters ─────────────────────────────────────────────
  const handleSetRendererFilter = useCallback(
    (values: string[]) => {
      void setRendererFilter(values.length > 0 ? values : null);
      void setCurrentPage(1);
    },
    [setRendererFilter, setCurrentPage]
  );

  const handleSetSceneFilter = useCallback(
    (values: string[]) => {
      void setSceneFilter(values.length > 0 ? values : null);
      void setCurrentPage(1);
    },
    [setSceneFilter, setCurrentPage]
  );

  const handleSetHardwareFilter = useCallback(
    (values: string[]) => {
      void setHardwareFilter(values.length > 0 ? values : null);
      void setCurrentPage(1);
    },
    [setHardwareFilter, setCurrentPage]
  );

  const handleSetSortConfig = useCallback(
    (config: SortConfig) => {
      void setSortField(config.field);
      void setSortDir(config.direction);
    },
    [setSortField, setSortDir]
  );

  const handleSetPage = useCallback(
    (page: number) => {
      void setCurrentPage(page);
    },
    [setCurrentPage]
  );

  const clearAllFilters = useCallback(() => {
    void setRendererFilter(null);
    void setSceneFilter(null);
    void setHardwareFilter(null);
    void setCurrentPage(1);
  }, [setRendererFilter, setSceneFilter, setHardwareFilter, setCurrentPage]);

  const hasActiveFilters =
    rendererFilter.length > 0 ||
    sceneFilter.length > 0 ||
    hardwareFilter.length > 0;

  return {
    filteredRows: sortedRows,
    paginatedRows,
    totalPages,
    currentPage: safePage,
    sortConfig,
    activeFilters: {
      renderers: rendererFilter,
      scenes: sceneFilter,
      hardware: hardwareFilter,
    },
    setRendererFilter: handleSetRendererFilter,
    setSceneFilter: handleSetSceneFilter,
    setHardwareFilter: handleSetHardwareFilter,
    setSortConfig: handleSetSortConfig,
    setPage: handleSetPage,
    clearAllFilters,
    hasActiveFilters,
  };
}
