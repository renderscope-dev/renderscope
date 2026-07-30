"""Report generation and catalog publishing for RenderScope benchmark results.

Two distinct outputs live here:

**Reports** — human-facing summaries of a benchmark run, in four formats:

* **HTML** — self-contained, dark-themed, interactive report
* **JSON** — clean, portable JSON with sorted keys and relative paths
* **CSV** — flat table for spreadsheet import
* **Markdown** — tables for GitHub issues, README files, and paper drafts

**Published records** — machine-facing catalog data.
:class:`~renderscope.report.benchmark_export.CanonicalBenchmarkExporter` converts
a run into the schema-conforming files that ``data/benchmarks/`` accepts, which
is what makes a benchmark contributable rather than merely readable.
"""

from __future__ import annotations

from renderscope.report.benchmark_export import (
    BenchmarkExportError,
    CanonicalBenchmark,
    CanonicalBenchmarkExporter,
    to_canonical,
)
from renderscope.report.csv_export import CSVExporter
from renderscope.report.html_report import HTMLReportGenerator
from renderscope.report.json_export import JSONExporter
from renderscope.report.markdown_export import MarkdownExporter

__all__ = [
    "BenchmarkExportError",
    "CSVExporter",
    "CanonicalBenchmark",
    "CanonicalBenchmarkExporter",
    "HTMLReportGenerator",
    "JSONExporter",
    "MarkdownExporter",
    "to_canonical",
]
