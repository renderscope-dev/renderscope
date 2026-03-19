"""The ``renderscope report`` command.

Generates comparison reports from benchmark results in HTML, JSON, CSV,
or Markdown formats.
"""

from __future__ import annotations

import sys
import webbrowser
from enum import Enum
from pathlib import Path

import typer

from renderscope.utils.console import console


class ReportFormat(str, Enum):
    """Supported report output formats."""

    html = "html"
    json = "json"
    csv = "csv"
    markdown = "markdown"


def report_cmd(
    results_file: Path = typer.Argument(
        help="Path to the benchmark results JSON file.",
    ),
    output_format: ReportFormat = typer.Option(
        ReportFormat.html,
        "--format",
        "-f",
        help="Output format.",
    ),
    output: Path | None = typer.Option(
        None,
        "--output",
        "-o",
        help="Output file path. Defaults to stdout for text formats, 'report.html' for HTML.",
    ),
    title: str | None = typer.Option(
        None,
        "--title",
        "-t",
        help="Custom report title (HTML format only).",
    ),
    no_images: bool = typer.Option(
        False,
        "--no-images",
        help="Exclude embedded images from HTML report (smaller file size).",
    ),
    open_browser: bool = typer.Option(
        False,
        "--open",
        help="Open the HTML report in the default browser after generation.",
    ),
) -> None:
    """Generate a report from benchmark results.

    Supports HTML (interactive, self-contained), JSON (clean, portable),
    CSV (for spreadsheets), and Markdown (for GitHub/papers) formats.

    \b
    Examples:
        renderscope report results.json
        renderscope report results.json --format csv --output results.csv
        renderscope report results.json --format html --title "PBRT vs Mitsuba" --open
    """
    # Validate input file exists.
    if not results_file.is_file():
        console.print(f"[error]Error:[/error] File not found: {results_file}")
        raise typer.Exit(code=1)

    try:
        if output_format == ReportFormat.html:
            _generate_html(results_file, output, title, no_images, open_browser)
        elif output_format == ReportFormat.json:
            _generate_json(results_file, output)
        elif output_format == ReportFormat.csv:
            _generate_csv(results_file, output)
        elif output_format == ReportFormat.markdown:
            _generate_markdown(results_file, output)
    except FileNotFoundError as exc:
        console.print(f"[error]Error:[/error] {exc}")
        raise typer.Exit(code=1) from None
    except ValueError as exc:
        console.print(f"[error]Error:[/error] Invalid results file: {exc}")
        raise typer.Exit(code=1) from None


def _generate_html(
    results_file: Path,
    output: Path | None,
    title: str | None,
    no_images: bool,
    open_browser: bool,
) -> None:
    """Generate an HTML report."""
    from renderscope.report.html_report import HTMLReportGenerator

    # Default output path for HTML (don't print HTML to stdout).
    if output is None:
        output = Path("report.html")

    kwargs: dict[str, object] = {"include_images": not no_images}
    if title is not None:
        kwargs["title"] = title

    generator = HTMLReportGenerator(results_file, **kwargs)  # type: ignore[arg-type]
    generator.save(output)

    size = output.stat().st_size
    size_str = _fmt_file_size(size)
    console.print(f"[success]\u2713[/success] Report saved to [bold]{output}[/bold] ({size_str})")

    if open_browser:
        url = output.resolve().as_uri()
        webbrowser.open(url)
        console.print("[info]Opened in browser[/info]")


def _generate_json(results_file: Path, output: Path | None) -> None:
    """Generate a JSON export."""
    from renderscope.report.json_export import JSONExporter

    exporter = JSONExporter(results_file)
    text = exporter.export(output)

    if output is None:
        sys.stdout.write(text)
    else:
        size_str = _fmt_file_size(output.stat().st_size)
        console.print(f"[success]\u2713[/success] JSON saved to [bold]{output}[/bold] ({size_str})")


def _generate_csv(results_file: Path, output: Path | None) -> None:
    """Generate a CSV export."""
    from renderscope.report.csv_export import CSVExporter

    exporter = CSVExporter(results_file)
    text = exporter.export(output)

    if output is None:
        sys.stdout.write(text)
    else:
        size_str = _fmt_file_size(output.stat().st_size)
        console.print(f"[success]\u2713[/success] CSV saved to [bold]{output}[/bold] ({size_str})")


def _generate_markdown(results_file: Path, output: Path | None) -> None:
    """Generate a Markdown export."""
    from renderscope.report.markdown_export import MarkdownExporter

    exporter = MarkdownExporter(results_file)
    text = exporter.export(output)

    if output is None:
        sys.stdout.write(text)
    else:
        size_str = _fmt_file_size(output.stat().st_size)
        console.print(
            f"[success]\u2713[/success] Markdown saved to [bold]{output}[/bold] ({size_str})"
        )


def _fmt_file_size(size_bytes: int) -> str:
    """Format a file size in bytes to a human-readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / (1024 * 1024):.1f} MB"
