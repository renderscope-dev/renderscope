"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Github, FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import type { BenchmarkEntry, BenchmarkTableRow } from "@/types/benchmark";
import { siteConfig } from "@/lib/constants";

interface DownloadDataSectionProps {
  filteredRows: BenchmarkTableRow[];
  rawBenchmarks: BenchmarkEntry[];
  activeRenderers: string[];
  activeScenes: string[];
  activeHardware: string[];
}

export function DownloadDataSection({
  filteredRows,
  rawBenchmarks,
  activeRenderers,
  activeScenes,
  activeHardware,
}: DownloadDataSectionProps) {
  const hasFilters =
    activeRenderers.length > 0 ||
    activeScenes.length > 0 ||
    activeHardware.length > 0;

  // Get the filtered raw benchmarks matching current filters
  const filteredBenchmarks = hasFilters
    ? rawBenchmarks.filter((b) => {
        if (activeRenderers.length > 0 && !activeRenderers.includes(b.renderer))
          return false;
        if (activeScenes.length > 0 && !activeScenes.includes(b.scene))
          return false;
        if (
          activeHardware.length > 0 &&
          !activeHardware.includes(b.hardware.id)
        )
          return false;
        return true;
      })
    : rawBenchmarks;

  const downloadBlob = useCallback((content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportJSON = useCallback(() => {
    const json = JSON.stringify(filteredBenchmarks, null, 2);
    downloadBlob(json, "renderscope-benchmarks.json", "application/json");
  }, [filteredBenchmarks, downloadBlob]);

  const handleExportCSV = useCallback(() => {
    const csvData = filteredBenchmarks.map((b) => ({
      Renderer: b.renderer,
      "Renderer Version": b.renderer_version,
      Scene: b.scene,
      "Render Time (s)": b.results.render_time_seconds,
      "Peak Memory (MB)": b.results.peak_memory_mb,
      "PSNR (dB)": b.quality_vs_reference.psnr,
      SSIM: b.quality_vs_reference.ssim,
      SPP: b.settings.samples_per_pixel,
      Resolution: `${b.settings.resolution[0]}x${b.settings.resolution[1]}`,
      Hardware: b.hardware.label,
      CPU: b.hardware.cpu,
      GPU: b.hardware.gpu,
      "RAM (GB)": b.hardware.ram_gb,
      OS: b.hardware.os,
      Timestamp: b.timestamp,
    }));

    const csv = Papa.unparse(csvData);
    downloadBlob(csv, "renderscope-benchmarks.csv", "text/csv;charset=utf-8");
  }, [filteredBenchmarks, downloadBlob]);

  const count = filteredRows.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        Download Data
      </h2>
      <p className="mb-6 max-w-prose text-sm text-muted-foreground">
        Export the benchmark dataset for your own analysis, academic papers, or
        integration into your workflow. Raw numeric values are preserved for
        maximum flexibility.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleExportJSON} className="gap-2">
          <FileJson className="h-4 w-4" />
          Export {count} {count === 1 ? "entry" : "entries"} as JSON
        </Button>

        <Button onClick={handleExportCSV} variant="secondary" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Export {count} {count === 1 ? "entry" : "entries"} as CSV
        </Button>

        <Button variant="outline" className="gap-2" asChild>
          <a
            href={`${siteConfig.github}/tree/main/data/benchmarks`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </Button>
      </div>

      {hasFilters && (
        <p className="mt-3 text-xs text-muted-foreground">
          <Download className="mr-1 inline h-3 w-3" />
          Exports include only the currently filtered data ({count}{" "}
          {count === 1 ? "entry" : "entries"}).
        </p>
      )}
    </motion.section>
  );
}
