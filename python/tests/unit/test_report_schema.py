"""Tests for locating and applying the published benchmark JSON Schema.

The package writes catalog data against ``schemas/benchmark.schema.json``. If it
cannot find that file, or finds a stale copy, published records drift from what
CI validates — so resolution and agreement are worth asserting directly.
"""

from __future__ import annotations

import builtins
import json
from pathlib import Path
from typing import Any

import pytest

from renderscope.report.schema import (
    BENCHMARK_SCHEMA_FILENAME,
    SchemaNotAvailableError,
    describe_validation_failures,
    jsonschema_available,
    load_benchmark_schema,
    validate_benchmark_document,
)

REPO_SCHEMA = Path(__file__).resolve().parents[3] / "schemas" / BENCHMARK_SCHEMA_FILENAME


class TestLoadBenchmarkSchema:
    def test_loads_a_draft_2020_12_schema(self) -> None:
        schema = load_benchmark_schema()
        assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
        assert schema["title"] == "RenderScope Benchmark Result"

    def test_describes_a_single_record_not_a_collection(self) -> None:
        """One file, one benchmark — the array shape is what broke the web build."""
        assert load_benchmark_schema()["type"] == "object"

    def test_matches_the_monorepo_source_of_truth(self) -> None:
        """The package must not carry a copy that has drifted from schemas/."""
        if not REPO_SCHEMA.is_file():  # pragma: no cover - monorepo always has it
            pytest.skip("Not running from a monorepo checkout")
        assert load_benchmark_schema() == json.loads(REPO_SCHEMA.read_text(encoding="utf-8"))

    def test_reports_a_clear_error_when_unavailable(self, monkeypatch: Any) -> None:
        from renderscope.report import schema as schema_module

        monkeypatch.setattr(
            schema_module, "_monorepo_schema_path", lambda name: Path("/nonexistent") / name
        )
        monkeypatch.setattr(
            schema_module.importlib.resources,
            "files",
            lambda package: (_ for _ in ()).throw(ModuleNotFoundError(package)),
        )

        with pytest.raises(SchemaNotAvailableError, match="Could not locate"):
            schema_module.load_benchmark_schema()

    def test_rejects_a_malformed_schema_file(self, monkeypatch: Any, tmp_path: Path) -> None:
        from renderscope.report import schema as schema_module

        broken = tmp_path / BENCHMARK_SCHEMA_FILENAME
        broken.write_text("{ not json", encoding="utf-8")
        monkeypatch.setattr(schema_module, "_monorepo_schema_path", lambda name: broken)
        monkeypatch.setattr(
            schema_module.importlib.resources,
            "files",
            lambda package: (_ for _ in ()).throw(ModuleNotFoundError(package)),
        )

        with pytest.raises(SchemaNotAvailableError, match="not valid JSON"):
            schema_module.load_benchmark_schema()


class TestValidateBenchmarkDocument:
    def test_accepts_a_published_record(self, full_benchmark_result: Any) -> None:
        from renderscope.report.benchmark_export import to_canonical

        assert validate_benchmark_document(to_canonical(full_benchmark_result).to_dict()) == []

    def test_reports_located_errors(self) -> None:
        errors = validate_benchmark_document({"id": "x", "settings": {"resolution": "1920x1080"}})
        assert errors
        assert any("settings.resolution" in error for error in errors)

    def test_rejects_the_raw_runner_shape(self, full_benchmark_result: Any) -> None:
        """The premise of this whole module, asserted against the real schema."""
        assert validate_benchmark_document(full_benchmark_result.model_dump(mode="json"))


class TestOptionalDependency:
    def test_reports_availability(self) -> None:
        assert jsonschema_available() is True

    def test_validation_is_skipped_without_jsonschema(self, monkeypatch: Any) -> None:
        """Publishing must never require an optional development dependency."""
        real_import = builtins.__import__

        def _no_jsonschema(name: str, *args: Any, **kwargs: Any) -> Any:
            if name == "jsonschema":
                raise ImportError("simulated missing jsonschema")
            return real_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, "__import__", _no_jsonschema)

        assert jsonschema_available() is False
        assert validate_benchmark_document({"totally": "invalid"}) == []

    def test_export_still_succeeds_without_jsonschema(
        self, monkeypatch: Any, full_benchmark_result: Any, tmp_path: Path
    ) -> None:
        from renderscope.report.benchmark_export import export_results

        real_import = builtins.__import__

        def _no_jsonschema(name: str, *args: Any, **kwargs: Any) -> Any:
            if name == "jsonschema":
                raise ImportError("simulated missing jsonschema")
            return real_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, "__import__", _no_jsonschema)

        written = export_results([full_benchmark_result], tmp_path / "out")
        assert len(written) == 1
        assert written[0].is_file()


class TestDescribeValidationFailures:
    def test_groups_errors_under_their_file(self) -> None:
        text = describe_validation_failures([("a.json", ["x: bad"]), ("b.json", ["y: worse"])])
        assert "a.json:" in text
        assert "  - x: bad" in text
        assert "b.json:" in text

    def test_returns_empty_string_for_no_failures(self) -> None:
        assert describe_validation_failures([]) == ""
