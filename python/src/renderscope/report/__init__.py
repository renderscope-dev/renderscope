"""Report generation for RenderScope benchmark results.

Supports four output formats:

* **HTML** — self-contained, dark-themed, interactive report
* **JSON** — clean, portable JSON with sorted keys and relative paths
* **CSV** — flat table for spreadsheet import
* **Markdown** — tables for GitHub issues, README files, and paper drafts
"""

from __future__ import annotations

from renderscope.report.csv_export import CSVExporter
from renderscope.report.html_report import HTMLReportGenerator
from renderscope.report.json_export import JSONExporter
from renderscope.report.markdown_export import MarkdownExporter

__all__ = [
    "CSVExporter",
    "HTMLReportGenerator",
    "JSONExporter",
    "MarkdownExporter",
]
