"""Tests for the ``renderscope publish`` command.

This command is the documented last step of contributing a benchmark:
run it, publish it, open a pull request.  The assertions here cover the whole
of that promise — that the files land where the catalog expects them, that they
satisfy the published schema, and that a mistake fails loudly instead of
producing a pull request that breaks the site's build.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pytest

from renderscope.cli.main import app

if TYPE_CHECKING:
    from typer.testing import CliRunner

    from renderscope.models.benchmark import BenchmarkResult

pytestmark = pytest.mark.cli


def _written_records(directory: Path) -> list[dict[str, Any]]:
    """Load every JSON document written into *directory*."""
    return [
        json.loads(path.read_text(encoding="utf-8")) for path in sorted(directory.glob("*.json"))
    ]


def _flat(output: str) -> str:
    """Collapse Rich's line wrapping so phrase assertions survive reflow.

    Rich wraps to the terminal width, which differs between a developer's shell
    and CI. Asserting on the wrapped text would make these tests fail for
    reasons that have nothing to do with the command's behaviour.
    """
    return re.sub(r"\s+", " ", output)


class TestPublishHappyPath:
    def test_writes_one_record_per_run(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        out = tmp_path / "benchmarks"
        result = cli_runner.invoke(
            app, ["publish", str(sample_results_json), "--output-dir", str(out)]
        )

        assert result.exit_code == 0, result.output
        assert len(list(out.glob("*.json"))) == 2

    def test_written_records_satisfy_the_published_schema(
        self,
        cli_runner: CliRunner,
        sample_results_json: Path,
        tmp_path: Path,
        assert_schema_valid: Any,
    ) -> None:
        out = tmp_path / "benchmarks"
        cli_runner.invoke(app, ["publish", str(sample_results_json), "--output-dir", str(out)])

        documents = _written_records(out)
        assert documents
        for document in documents:
            assert_schema_valid(document)

    def test_uses_the_flat_catalog_filename_convention(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        out = tmp_path / "benchmarks"
        cli_runner.invoke(app, ["publish", str(sample_results_json), "--output-dir", str(out)])

        names = sorted(p.name for p in out.glob("*.json"))
        assert names == [
            "cornell-box-mitsuba3-amd-ryzen-9-7950x.json",
            "cornell-box-pbrt-amd-ryzen-9-7950x.json",
        ]

    def test_reports_the_written_paths(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        out = tmp_path / "benchmarks"
        result = cli_runner.invoke(
            app, ["publish", str(sample_results_json), "--output-dir", str(out)]
        )
        assert "cornell-box-pbrt" in _flat(result.output)

    def test_points_at_the_validation_step(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        result = cli_runner.invoke(
            app, ["publish", str(sample_results_json), "--output-dir", str(tmp_path / "out")]
        )
        assert "validate_data.py" in _flat(result.output)

    def test_creates_a_missing_output_directory(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        out = tmp_path / "does" / "not" / "exist"
        result = cli_runner.invoke(
            app, ["publish", str(sample_results_json), "--output-dir", str(out)]
        )
        assert result.exit_code == 0, result.output
        assert out.is_dir()


class TestPublishOptions:
    def test_hardware_overrides_reach_the_record(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        out = tmp_path / "benchmarks"
        result = cli_runner.invoke(
            app,
            [
                "publish",
                str(sample_results_json),
                "--output-dir",
                str(out),
                "--hardware-id",
                "bench-box",
                "--hardware-label",
                "Bench Box #1",
            ],
        )

        assert result.exit_code == 0, result.output
        documents = _written_records(out)
        assert {d["hardware"]["id"] for d in documents} == {"bench-box"}
        assert {d["hardware"]["label"] for d in documents} == {"Bench Box #1"}
        assert all(p.name.endswith("-bench-box.json") for p in out.glob("*.json"))

    def test_attribution_and_notes_reach_the_record(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        out = tmp_path / "benchmarks"
        cli_runner.invoke(
            app,
            [
                "publish",
                str(sample_results_json),
                "--output-dir",
                str(out),
                "--submitted-by",
                "octocat",
                "--notes",
                "Ran with the stock config.",
            ],
        )

        for document in _written_records(out):
            assert document["submitted_by"] == "octocat"
            assert document["notes"] == "Ran with the stock config."


class TestPublishDryRun:
    def test_writes_nothing(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        out = tmp_path / "benchmarks"
        result = cli_runner.invoke(
            app, ["publish", str(sample_results_json), "--output-dir", str(out), "--dry-run"]
        )

        assert result.exit_code == 0, result.output
        assert not out.exists()

    def test_previews_what_would_be_created(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        result = cli_runner.invoke(
            app,
            ["publish", str(sample_results_json), "--output-dir", str(tmp_path / "o"), "--dry-run"],
        )
        assert "Dry run" in _flat(result.output)
        assert "create" in _flat(result.output)

    def test_flags_records_that_would_be_replaced(
        self, cli_runner: CliRunner, sample_results_json: Path, tmp_path: Path
    ) -> None:
        """A contributor must be able to see they are overwriting before it happens."""
        out = tmp_path / "benchmarks"
        cli_runner.invoke(app, ["publish", str(sample_results_json), "--output-dir", str(out)])

        result = cli_runner.invoke(
            app, ["publish", str(sample_results_json), "--output-dir", str(out), "--dry-run"]
        )
        assert "replace" in _flat(result.output)


class TestPublishFailures:
    def test_missing_results_file_exits_nonzero(
        self, cli_runner: CliRunner, tmp_path: Path
    ) -> None:
        result = cli_runner.invoke(
            app, ["publish", str(tmp_path / "absent.json"), "--output-dir", str(tmp_path)]
        )
        assert result.exit_code == 1
        assert "not found" in _flat(result.output)

    def test_missing_results_file_suggests_running_a_benchmark(
        self, cli_runner: CliRunner, tmp_path: Path
    ) -> None:
        result = cli_runner.invoke(app, ["publish", str(tmp_path / "absent.json")])
        assert "renderscope benchmark" in _flat(result.output)

    def test_malformed_json_exits_nonzero(self, cli_runner: CliRunner, tmp_path: Path) -> None:
        broken = tmp_path / "results.json"
        broken.write_text("{not json", encoding="utf-8")
        result = cli_runner.invoke(app, ["publish", str(broken), "--output-dir", str(tmp_path)])
        assert result.exit_code == 1

    def test_empty_results_exits_nonzero(self, cli_runner: CliRunner, tmp_path: Path) -> None:
        empty = tmp_path / "results.json"
        empty.write_text("[]", encoding="utf-8")
        result = cli_runner.invoke(app, ["publish", str(empty), "--output-dir", str(tmp_path)])
        assert result.exit_code == 1
        assert "contains no benchmark results" in _flat(result.output).lower()

    def test_unpublishable_run_writes_nothing(
        self, cli_runner: CliRunner, tmp_path: Path, full_benchmark_result: BenchmarkResult
    ) -> None:
        """A run with no measured time cannot be published; nothing partial is left."""
        render = full_benchmark_result.results.model_copy(update={"render_time_seconds": 0.0})
        broken = full_benchmark_result.model_copy(update={"results": render})

        results = tmp_path / "results.json"
        results.write_text(json.dumps([broken.model_dump(mode="json")]), encoding="utf-8")

        out = tmp_path / "benchmarks"
        result = cli_runner.invoke(app, ["publish", str(results), "--output-dir", str(out)])

        assert result.exit_code == 1
        assert not out.exists()

    def test_duplicate_runs_are_refused_with_guidance(
        self, cli_runner: CliRunner, tmp_path: Path, full_benchmark_result: BenchmarkResult
    ) -> None:
        entry = full_benchmark_result.model_dump(mode="json")
        results = tmp_path / "results.json"
        results.write_text(json.dumps([entry, entry]), encoding="utf-8")

        result = cli_runner.invoke(
            app, ["publish", str(results), "--output-dir", str(tmp_path / "out")]
        )
        assert result.exit_code == 1
        assert "--hardware-id" in _flat(result.output)


class TestPublishRegistration:
    def test_command_is_registered(self, cli_runner: CliRunner) -> None:
        result = cli_runner.invoke(app, ["--help"])
        assert "publish" in _flat(result.output)

    def test_help_describes_the_catalog_destination(self, cli_runner: CliRunner) -> None:
        result = cli_runner.invoke(app, ["publish", "--help"])
        assert result.exit_code == 0
        assert "data/benchmarks" in _flat(result.output)


class TestBenchmarkPublishFlag:
    """`renderscope benchmark --publish-dir` is the one-step version of this flow."""

    def test_flag_is_documented(self, cli_runner: CliRunner) -> None:
        result = cli_runner.invoke(app, ["benchmark", "--help"])
        assert result.exit_code == 0
        assert "--publish-dir" in _flat(result.output)

    def test_publishes_results_produced_by_a_run(
        self, tmp_path: Path, full_benchmark_result: BenchmarkResult, assert_schema_valid: Any
    ) -> None:
        """Exercises the helper the command calls once a run completes."""
        from renderscope.cli.benchmark import _publish_results

        out = tmp_path / "benchmarks"
        assert _publish_results(
            [full_benchmark_result],
            out,
            submitted_by="octocat",
            results_output=tmp_path / "results.json",
        )

        documents = _written_records(out)
        assert len(documents) == 1
        assert documents[0]["submitted_by"] == "octocat"
        assert_schema_valid(documents[0])

    def test_publishing_failure_does_not_discard_the_benchmark(
        self, tmp_path: Path, full_benchmark_result: BenchmarkResult
    ) -> None:
        """Runs are expensive; a publishing problem must be recoverable."""
        from renderscope.cli.benchmark import _publish_results

        render = full_benchmark_result.results.model_copy(update={"render_time_seconds": 0.0})
        broken = full_benchmark_result.model_copy(update={"results": render})
        results_output = tmp_path / "results.json"

        assert not _publish_results(
            [broken],
            tmp_path / "benchmarks",
            submitted_by=None,
            results_output=results_output,
        )
