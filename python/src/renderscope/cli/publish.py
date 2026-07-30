"""The ``renderscope publish`` command.

Converts the results file that ``renderscope benchmark`` writes into the
schema-conforming records the RenderScope catalog accepts in ``data/benchmarks/``.

A results file records a *run* — nested render results, adapter internals, the
Python environment — which is what you want when debugging a benchmark, and more
than the catalog publishes.  This command projects each run onto
``schemas/benchmark.schema.json``, writing one file per renderer x scene x
machine so the result can go straight into a pull request.

The command is local and offline: "publish" means "write files ready to submit",
never "upload".
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import typer
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from renderscope.utils.console import console, err_console

if TYPE_CHECKING:
    from renderscope.report.benchmark_export import CanonicalBenchmark

# Where catalog records live in a monorepo checkout.
_DEFAULT_OUTPUT_DIR = Path("data/benchmarks")


def _quality_summary(record: CanonicalBenchmark) -> str:
    """Render a one-cell summary of a record's quality metrics."""
    quality = record.quality_vs_reference
    if quality is None:
        return "[dim]none[/dim]"
    parts: list[str] = []
    if quality.psnr is not None:
        parts.append(f"{quality.psnr:.1f} dB")
    if quality.ssim is not None:
        parts.append(f"SSIM {quality.ssim:.4f}")
    return ", ".join(parts) if parts else "[dim]reference only[/dim]"


def _plan_actions(
    records: list[CanonicalBenchmark],
    output_dir: Path,
) -> list[bool]:
    """Return, per record, whether writing it would replace an existing file.

    Must be evaluated *before* anything is written, so the summary can report
    which contributions were updated rather than newly created.
    """
    from renderscope.report.benchmark_export import canonical_filename

    return [(output_dir / canonical_filename(record)).is_file() for record in records]


def _print_plan(
    records: list[CanonicalBenchmark],
    output_dir: Path,
    replacements: list[bool],
    *,
    dry_run: bool,
) -> None:
    """Print the table of records that will be (or were) written.

    Deliberately narrow: the target filenames are listed under the table rather
    than in a column, so the Action column stays readable in an 80-column
    terminal instead of being truncated away.
    """
    table = Table(show_header=True, header_style="bold", padding=(0, 1))
    table.add_column("Renderer", style="cyan")
    table.add_column("Scene")
    table.add_column("Hardware")
    table.add_column("Quality")
    table.add_column("Action")

    for record, replaces in zip(records, replacements, strict=True):
        if dry_run:
            action = "[warning]replace[/warning]" if replaces else "create"
        else:
            action = "[warning]replaced[/warning]" if replaces else "[success]created[/success]"
        table.add_row(
            record.renderer,
            record.scene,
            record.hardware.label or record.hardware.id or "—",
            _quality_summary(record),
            action,
        )

    title = "Publish Plan (dry run)" if dry_run else "Published Records"
    console.print()
    console.print(Panel(table, title=title, border_style="bright_blue"))


def _print_paths(records: list[CanonicalBenchmark], output_dir: Path) -> None:
    """List the target file paths, for scripting and for pasting into a PR body."""
    from renderscope.report.benchmark_export import canonical_filename

    for record in records:
        console.print(f"[dim]{output_dir / canonical_filename(record)}[/dim]")
    console.print()


def _print_next_steps(output_dir: Path, count: int) -> None:
    """Print the follow-up steps that turn published files into a contribution."""
    steps = Text()
    steps.append("1. ", style="dim")
    steps.append("python scripts/validate_data.py", style="bold")
    steps.append("   verify the records against the schema\n")
    steps.append("2. ", style="dim")
    steps.append(f"git add {output_dir}", style="bold")
    steps.append("   stage the new records\n")
    steps.append("3. ", style="dim")
    steps.append("open a pull request", style="bold")
    steps.append("        CI re-validates on every push")

    console.print()
    console.print(f"[success]✓ {count} record(s) written to [bold]{output_dir}[/bold].[/success]")
    console.print()
    console.print(Panel(steps, title="Next Steps", border_style="bright_black"))
    console.print()


def publish_cmd(
    results_file: Path = typer.Argument(
        help="Benchmark results JSON file written by 'renderscope benchmark --output'.",
    ),
    output_dir: Path = typer.Option(
        _DEFAULT_OUTPUT_DIR,
        "--output-dir",
        "-o",
        help="Directory to write catalog records into.",
    ),
    hardware_id: str | None = typer.Option(
        None,
        "--hardware-id",
        help=(
            "Short slug identifying the machine (e.g. 'ryzen-7950x'). "
            "Derived from the detected CPU/GPU when omitted."
        ),
    ),
    hardware_label: str | None = typer.Option(
        None,
        "--hardware-label",
        help="Human-readable machine name shown in the dashboard's hardware filter.",
    ),
    notes: str | None = typer.Option(
        None,
        "--notes",
        help="Provenance to record with the results — how the reference was produced, "
        "known caveats, non-default configuration.",
    ),
    submitted_by: str | None = typer.Option(
        None,
        "--submitted-by",
        help="GitHub username to credit for the submission.",
    ),
    base_dir: Path | None = typer.Option(
        None,
        "--base-dir",
        help="Directory that output image paths are recorded relative to. "
        "Defaults to trimming at a known output root such as 'renderscope-results/'.",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Show what would be written without writing anything.",
    ),
) -> None:
    """Convert benchmark results into catalog records for data/benchmarks/.

    Writes one schema-conforming JSON file per renderer x scene x machine,
    ready to submit as a pull request. Existing records for the same
    combination are replaced — use --dry-run to preview first.

    \b
    Examples:
        renderscope publish results.json
        renderscope publish results.json --output-dir data/benchmarks --dry-run
        renderscope publish results.json --hardware-id ryzen-7950x --submitted-by octocat
    """
    from renderscope.report.benchmark_export import (
        BenchmarkExportError,
        CanonicalBenchmarkExporter,
        check_against_schema,
        reject_filename_collisions,
    )

    if not results_file.is_file():
        err_console.print(f"[error]Results file not found:[/error] {results_file}")
        err_console.print(
            "\nRun a benchmark first:\n"
            "  renderscope benchmark --scene cornell-box --renderer pbrt --output results.json"
        )
        raise typer.Exit(code=1)

    try:
        exporter = CanonicalBenchmarkExporter(
            results_file,
            hardware_id=hardware_id,
            hardware_label=hardware_label,
            notes=notes,
            submitted_by=submitted_by,
            base_dir=base_dir,
        )
    except (OSError, ValueError) as exc:
        err_console.print(f"[error]Could not read {results_file}:[/error] {exc}")
        raise typer.Exit(code=1) from exc

    if len(exporter) == 0:
        console.print(f"[warning]{results_file} contains no benchmark results.[/warning]")
        raise typer.Exit(code=1)

    try:
        records = exporter.to_canonical()
        # Two runs of the same renderer/scene/machine would land on one file;
        # refuse rather than silently discard a measurement.
        reject_filename_collisions(records)
        check_against_schema(records)
    except BenchmarkExportError as exc:
        err_console.print(f"\n[error]Cannot publish these results.[/error]\n\n{exc}\n")
        raise typer.Exit(code=1) from exc

    # Evaluated before writing so the summary can distinguish new contributions
    # from replaced ones.
    replacements = _plan_actions(records, output_dir)

    if dry_run:
        _print_plan(records, output_dir, replacements, dry_run=True)
        console.print(f"\n[dim]Would write to {output_dir}:[/dim]")
        _print_paths(records, output_dir)
        console.print("[dim]Dry run — nothing written.[/dim]\n")
        raise typer.Exit(code=0)

    try:
        for record in records:
            record.write(output_dir)
    except OSError as exc:
        err_console.print(f"\n[error]Could not write to {output_dir}:[/error] {exc}\n")
        raise typer.Exit(code=1) from exc

    _print_plan(records, output_dir, replacements, dry_run=False)
    _print_next_steps(output_dir, len(records))
    _print_paths(records, output_dir)
