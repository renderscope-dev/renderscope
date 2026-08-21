"""Tests for converting benchmark run records into published catalog records.

The load-bearing assertion in this module is that exported documents satisfy
``schemas/benchmark.schema.json`` — the same file ``scripts/validate_data.py``
and the CI data-validation job read.  Before this conversion existed, the output
of ``renderscope benchmark`` failed that schema outright and crashed the web
app's build, so these tests exist to keep the contribution path working.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from renderscope.models.benchmark import (
    BenchmarkResult,
    ConvergencePoint,
    QualityMetrics,
    RenderResult,
)
from renderscope.models.hardware import HardwareInfo
from renderscope.models.settings import RenderSettings
from renderscope.report.benchmark_export import (
    BenchmarkExportError,
    CanonicalBenchmark,
    CanonicalBenchmarkExporter,
    canonical_filename,
    check_against_schema,
    derive_hardware_id,
    derive_hardware_label,
    export_results,
    iter_published_records,
    parse_record,
    relative_output_path,
    slugify,
    to_canonical,
)

# ---------------------------------------------------------------------------
# Schema conformance — the contract this module exists to keep
# ---------------------------------------------------------------------------


class TestSchemaConformance:
    def test_full_record_satisfies_published_schema(
        self,
        full_benchmark_result: BenchmarkResult,
        assert_schema_valid: Any,
    ) -> None:
        assert_schema_valid(to_canonical(full_benchmark_result).to_dict())

    def test_minimal_record_satisfies_published_schema(
        self,
        sample_benchmark_results: list[BenchmarkResult],
        assert_schema_valid: Any,
    ) -> None:
        """A run with no quality metrics and no convergence is still publishable."""
        for result in sample_benchmark_results:
            assert_schema_valid(to_canonical(result).to_dict())

    def test_time_budget_record_satisfies_published_schema(
        self,
        full_benchmark_result: BenchmarkResult,
        assert_schema_valid: Any,
    ) -> None:
        """A time-budgeted run has no sample count; the schema allows its absence."""
        settings = full_benchmark_result.settings.model_copy(
            update={"samples": None, "time_budget": 120.0}
        )
        result = full_benchmark_result.model_copy(update={"settings": settings})
        document = to_canonical(result).to_dict()

        assert "samples_per_pixel" not in document["settings"]
        assert document["settings"]["time_budget_seconds"] == 120.0
        assert_schema_valid(document)

    def test_check_against_schema_accepts_valid_records(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        check_against_schema([to_canonical(full_benchmark_result)])

    def test_check_against_schema_catches_drift(
        self, full_benchmark_result: BenchmarkResult, monkeypatch: Any
    ) -> None:
        """A schema change the exporter has not followed must fail loudly.

        Simulated by tightening the schema underneath a known-good record.
        """
        from renderscope.report import schema as schema_module

        tightened = schema_module.load_benchmark_schema()
        tightened["required"] = [*tightened["required"], "a_field_that_does_not_exist"]
        monkeypatch.setattr(schema_module, "load_benchmark_schema", lambda: tightened)

        with pytest.raises(BenchmarkExportError, match="drifted apart"):
            check_against_schema([to_canonical(full_benchmark_result)])

    def test_check_against_schema_skips_when_schema_is_missing(
        self, full_benchmark_result: BenchmarkResult, monkeypatch: Any
    ) -> None:
        """A packaging problem must not block a contributor from publishing."""
        from renderscope.report import schema as schema_module

        def _unavailable() -> dict[str, Any]:
            raise schema_module.SchemaNotAvailableError("simulated")

        monkeypatch.setattr(schema_module, "load_benchmark_schema", _unavailable)
        check_against_schema([to_canonical(full_benchmark_result)])

    def test_raw_runner_output_would_fail_the_schema(
        self,
        full_benchmark_result: BenchmarkResult,
        schema_validator: Any,
    ) -> None:
        """Guards the premise: the run record shape is not the published shape.

        If this ever passes, the two formats have converged and the conversion
        layer is redundant — which is worth noticing deliberately rather than
        discovering through silent drift.
        """
        raw = full_benchmark_result.model_dump(mode="json")
        assert list(schema_validator.iter_errors(raw)), (
            "Run records are expected to violate the published schema; "
            "if they no longer do, revisit whether this module is still needed."
        )


# ---------------------------------------------------------------------------
# Field mapping
# ---------------------------------------------------------------------------


class TestFieldMapping:
    def test_maps_dimensions_to_resolution_pair(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        document = to_canonical(full_benchmark_result).to_dict()
        assert document["settings"]["resolution"] == [1920, 1080]

    def test_maps_samples_to_samples_per_pixel(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        document = to_canonical(full_benchmark_result).to_dict()
        assert document["settings"]["samples_per_pixel"] == 1024

    def test_maps_output_path_to_output_image(self, full_benchmark_result: BenchmarkResult) -> None:
        document = to_canonical(full_benchmark_result).to_dict()
        assert document["results"]["output_image"] == (
            "renderscope-results/cornell-box/pbrt_1024spp.exr"
        )

    def test_splits_core_counts_into_cores_and_threads(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        hardware = to_canonical(full_benchmark_result).to_dict()["hardware"]
        assert hardware["cpu_cores"] == 16
        assert hardware["cpu_threads"] == 32

    def test_drops_tooling_environment_fields(self, full_benchmark_result: BenchmarkResult) -> None:
        """python_version and friends describe the measuring tool, not the machine."""
        hardware = to_canonical(full_benchmark_result).to_dict()["hardware"]
        for field in ("python_version", "renderscope_version", "optional_deps"):
            assert field not in hardware

    def test_preserves_measured_values_exactly(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        document = to_canonical(full_benchmark_result).to_dict()
        assert document["results"]["render_time_seconds"] == 47.3
        assert document["results"]["peak_memory_mb"] == 1240.5
        assert document["quality_vs_reference"]["psnr"] == 38.12
        assert document["quality_vs_reference"]["mse"] == 0.000154

    def test_carries_notes_and_attribution(self, full_benchmark_result: BenchmarkResult) -> None:
        document = to_canonical(
            full_benchmark_result, notes="CPU-only run", submitted_by="octocat"
        ).to_dict()
        assert document["notes"] == "CPU-only run"
        assert document["submitted_by"] == "octocat"

    def test_reads_integrator_from_adapter_metadata(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        document = to_canonical(full_benchmark_result).to_dict()
        assert document["settings"]["integrator"] == "volpath"


# ---------------------------------------------------------------------------
# Optional fields must be omitted, never emitted as null
# ---------------------------------------------------------------------------


class TestNullHandling:
    """The schema types most optional fields as bare `number`/`string`.

    An explicit `null` is a validation error, so unmeasured values have to be
    absent from the document rather than present-and-empty.
    """

    def test_omits_unset_hardware_fields(
        self, sample_hardware_info: HardwareInfo, full_benchmark_result: BenchmarkResult
    ) -> None:
        hardware = sample_hardware_info.model_copy(update={"gpu": None, "gpu_vram_gb": None})
        result = full_benchmark_result.model_copy(update={"hardware": hardware})
        document = to_canonical(result).to_dict()
        assert "gpu_vram_gb" not in document["hardware"]
        assert "gpu" not in document["hardware"]

    def test_omits_unset_thread_count(self, full_benchmark_result: BenchmarkResult) -> None:
        settings = full_benchmark_result.settings.model_copy(update={"threads": None})
        result = full_benchmark_result.model_copy(update={"settings": settings})
        assert "threads" not in to_canonical(result).to_dict()["settings"]

    def test_omits_quality_block_when_no_reference_exists(
        self, full_benchmark_result: BenchmarkResult, assert_schema_valid: Any
    ) -> None:
        result = full_benchmark_result.model_copy(update={"quality_vs_reference": None})
        document = to_canonical(result).to_dict()
        assert "quality_vs_reference" not in document
        assert_schema_valid(document)

    def test_omits_quality_block_when_reference_is_incomplete(
        self, full_benchmark_result: BenchmarkResult, assert_schema_valid: Any
    ) -> None:
        """Partial quality data cannot be published: the schema requires both keys."""
        quality = QualityMetrics(psnr=30.0, ssim=0.9)
        result = full_benchmark_result.model_copy(update={"quality_vs_reference": quality})
        document = to_canonical(result).to_dict()
        assert "quality_vs_reference" not in document
        assert_schema_valid(document)

    def test_omits_unmeasured_convergence_metrics(
        self, full_benchmark_result: BenchmarkResult, assert_schema_valid: Any
    ) -> None:
        """This is the exact shape the repo's committed run records had."""
        points = [ConvergencePoint(samples=n, time=float(n)) for n in (1, 4, 16)]
        result = full_benchmark_result.model_copy(update={"convergence": points})
        document = to_canonical(result).to_dict()

        assert len(document["convergence"]) == 3
        for point in document["convergence"]:
            assert "psnr" not in point
            assert "ssim" not in point
            assert point["time"] is not None
        assert_schema_valid(document)

    def test_omits_empty_convergence_array(self, full_benchmark_result: BenchmarkResult) -> None:
        result = full_benchmark_result.model_copy(update={"convergence": []})
        assert "convergence" not in to_canonical(result).to_dict()


# ---------------------------------------------------------------------------
# GPU reporting
# ---------------------------------------------------------------------------


class TestEffectiveGpuReporting:
    """`gpu_enabled` must describe what ran, not what was asked for."""

    def test_gpu_request_honoured_when_backend_is_a_gpu(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        metadata = {"gpu_enabled": True, "gpu_backend": "OptiX"}
        render = full_benchmark_result.results.model_copy(update={"metadata": metadata})
        result = full_benchmark_result.model_copy(update={"results": render})
        assert to_canonical(result).to_dict()["settings"]["gpu_enabled"] is True

    def test_cpu_fallback_is_reported_as_cpu(self, full_benchmark_result: BenchmarkResult) -> None:
        """Cycles accepts --gpu and silently falls back; timings are CPU timings."""
        metadata = {"gpu_enabled": True, "gpu_backend": "CPU (fallback)"}
        render = full_benchmark_result.results.model_copy(update={"metadata": metadata})
        result = full_benchmark_result.model_copy(update={"results": render})
        assert to_canonical(result).to_dict()["settings"]["gpu_enabled"] is False

    def test_falls_back_to_requested_setting_without_metadata(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        render = full_benchmark_result.results.model_copy(update={"metadata": {}})
        result = full_benchmark_result.model_copy(update={"results": render})
        assert to_canonical(result).to_dict()["settings"]["gpu_enabled"] is True


class TestRendererTypeMapping:
    def test_passes_through_schema_vocabulary(
        self, full_benchmark_result: BenchmarkResult, assert_schema_valid: Any
    ) -> None:
        """Filament reports 'rasterization', which the schema's enum accepts."""
        render = full_benchmark_result.results.model_copy(
            update={"metadata": {"renderer_type": "rasterization"}}
        )
        result = full_benchmark_result.model_copy(update={"results": render})
        document = to_canonical(result).to_dict()
        assert document["settings"]["renderer_type"] == "rasterization"
        assert_schema_valid(document)

    @pytest.mark.parametrize(
        ("backend", "paradigm"),
        [
            ("pathtracer", "path_tracing"),
            ("scivis", "scientific_visualization"),
            ("ao", "scientific_visualization"),
        ],
    )
    def test_translates_ospray_backend_vocabulary(
        self,
        full_benchmark_result: BenchmarkResult,
        assert_schema_valid: Any,
        backend: str,
        paradigm: str,
    ) -> None:
        """OSPRay's own backend names belong in `ospray_renderer`, not `renderer_type`."""
        render = full_benchmark_result.results.model_copy(
            update={"metadata": {"renderer_type": backend}}
        )
        result = full_benchmark_result.model_copy(update={"results": render})
        document = to_canonical(result).to_dict()

        assert document["settings"]["ospray_renderer"] == backend
        assert document["settings"]["renderer_type"] == paradigm
        assert_schema_valid(document)

    def test_drops_unrecognized_renderer_type(
        self, full_benchmark_result: BenchmarkResult, assert_schema_valid: Any
    ) -> None:
        render = full_benchmark_result.results.model_copy(
            update={"metadata": {"renderer_type": "something-new"}}
        )
        result = full_benchmark_result.model_copy(update={"results": render})
        document = to_canonical(result).to_dict()
        assert "renderer_type" not in document["settings"]
        assert_schema_valid(document)


# ---------------------------------------------------------------------------
# Identity: slugs, ids, filenames
# ---------------------------------------------------------------------------


class TestSlugify:
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("Apple M5 Max", "apple-m5-max"),
            ("cornell_box", "cornell-box"),
            ("AMD Ryzen 9 7950X", "amd-ryzen-9-7950x"),
            ("  spaced  out  ", "spaced-out"),
            ("NVIDIA GeForce RTX 4090 (24GB)", "nvidia-geforce-rtx-4090-24gb"),
            ("---", ""),
        ],
    )
    def test_produces_catalog_id_alphabet(self, raw: str, expected: str) -> None:
        assert slugify(raw) == expected


class TestHardwareIdentity:
    def test_prefers_a_real_cpu_model(self) -> None:
        assert derive_hardware_label("AMD Ryzen 9 7950X", "RTX 4090") == "AMD Ryzen 9 7950X"
        assert derive_hardware_id("AMD Ryzen 9 7950X", "RTX 4090") == "amd-ryzen-9-7950x"

    @pytest.mark.parametrize("architecture", ["arm", "x86_64", "aarch64", "AMD64"])
    def test_falls_back_to_gpu_for_architecture_only_cpus(self, architecture: str) -> None:
        """`platform.processor()` returns an architecture on several platforms."""
        assert derive_hardware_label(architecture, "Apple M5 Max") == "Apple M5 Max"
        assert derive_hardware_id(architecture, "Apple M5 Max") == "apple-m5-max"

    def test_keeps_architecture_when_there_is_no_gpu(self) -> None:
        assert derive_hardware_id("arm", None) == "arm"

    def test_never_returns_an_empty_id(self) -> None:
        assert derive_hardware_id("???", None) == "unknown-hardware"

    def test_explicit_overrides_win(self, full_benchmark_result: BenchmarkResult) -> None:
        record = to_canonical(
            full_benchmark_result, hardware_id="Bench Box 1", hardware_label="Bench Box #1"
        )
        assert record.hardware.id == "bench-box-1"
        assert record.hardware.label == "Bench Box #1"

    def test_cpu_string_is_preserved_verbatim(self, full_benchmark_result: BenchmarkResult) -> None:
        """Deriving a nicer label must not rewrite what was actually measured."""
        hardware = full_benchmark_result.hardware.model_copy(update={"cpu": "arm"})
        result = full_benchmark_result.model_copy(update={"hardware": hardware})
        document = to_canonical(result).to_dict()
        assert document["hardware"]["cpu"] == "arm"
        assert document["hardware"]["label"] == "NVIDIA GeForce RTX 4090"


class TestRecordIdentity:
    def test_id_includes_scene_renderer_hardware_and_date(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        record = to_canonical(full_benchmark_result, hardware_id="ryzen-7950x")
        assert record.id == "cornell-box-pbrt-ryzen-7950x-2026-05-01"

    def test_hardware_in_id_prevents_same_day_collisions(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        """Two contributors, same renderer/scene/day, different machines."""
        first = to_canonical(full_benchmark_result, hardware_id="ryzen-7950x")
        second = to_canonical(full_benchmark_result, hardware_id="apple-m5-max")
        assert first.id != second.id
        assert canonical_filename(first) != canonical_filename(second)

    def test_id_is_slugified_from_awkward_scene_names(
        self, sample_benchmark_results: list[BenchmarkResult]
    ) -> None:
        """The fixture uses `cornell_box`; ids may only contain [a-z0-9-]."""
        record = to_canonical(sample_benchmark_results[0])
        assert "_" not in record.id
        assert record.id.startswith("cornell-box-pbrt-")

    def test_filename_follows_the_flat_catalog_convention(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        record = to_canonical(full_benchmark_result, hardware_id="ryzen-7950x")
        assert canonical_filename(record) == "cornell-box-pbrt-ryzen-7950x.json"


# ---------------------------------------------------------------------------
# Output path portability
# ---------------------------------------------------------------------------


class TestOutputPathRelativization:
    def test_trims_absolute_path_at_a_known_output_root(self) -> None:
        assert (
            relative_output_path("/home/x/proj/renderscope-results/sponza/pbrt.exr")
            == "renderscope-results/sponza/pbrt.exr"
        )

    def test_uses_explicit_base_directory(self, tmp_path: Path) -> None:
        target = tmp_path / "out" / "sponza" / "pbrt.exr"
        target.parent.mkdir(parents=True)
        target.touch()
        assert relative_output_path(str(target), base=tmp_path) == "out/sponza/pbrt.exr"

    def test_keeps_relative_paths_unchanged(self) -> None:
        assert relative_output_path("out/sponza/pbrt.exr") == "out/sponza/pbrt.exr"

    def test_truncates_unrecognized_absolute_paths(self) -> None:
        """Local directory layout must not leak into published data."""
        result = relative_output_path("/Users/someone/private/work/sponza/pbrt.exr")
        assert result == "sponza/pbrt.exr"
        assert "someone" not in result

    def test_rejects_an_empty_path(self) -> None:
        with pytest.raises(BenchmarkExportError, match="empty output path"):
            relative_output_path("   ")


# ---------------------------------------------------------------------------
# Refusals: data the schema cannot represent
# ---------------------------------------------------------------------------


class TestRefusals:
    def test_rejects_non_positive_render_time(self, full_benchmark_result: BenchmarkResult) -> None:
        render = full_benchmark_result.results.model_copy(update={"render_time_seconds": 0.0})
        result = full_benchmark_result.model_copy(update={"results": render})
        with pytest.raises(BenchmarkExportError, match="render time"):
            to_canonical(result)

    def test_snaps_float_noise_just_above_one(self, full_benchmark_result: BenchmarkResult) -> None:
        """scikit-image can return SSIM a few ULPs over 1.0 on identical images."""
        quality = QualityMetrics(
            reference_renderer="pbrt", reference_samples=1024, ssim=1.0 + 1e-12
        )
        result = full_benchmark_result.model_copy(update={"quality_vs_reference": quality})
        assert to_canonical(result).to_dict()["quality_vs_reference"]["ssim"] == 1.0

    def test_rejects_genuinely_out_of_range_metrics(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        quality = QualityMetrics(reference_renderer="pbrt", reference_samples=1024, ssim=1.5)
        result = full_benchmark_result.model_copy(update={"quality_vs_reference": quality})
        with pytest.raises(BenchmarkExportError, match=r"outside the range"):
            to_canonical(result)

    def test_rejects_two_runs_that_publish_to_one_file(
        self, full_benchmark_result: BenchmarkResult, tmp_path: Path
    ) -> None:
        with pytest.raises(BenchmarkExportError, match="both publish to"):
            export_results([full_benchmark_result, full_benchmark_result], tmp_path / "out")

    def test_collision_check_leaves_no_partial_output(
        self, full_benchmark_result: BenchmarkResult, tmp_path: Path
    ) -> None:
        out = tmp_path / "out"
        with pytest.raises(BenchmarkExportError):
            export_results([full_benchmark_result, full_benchmark_result], out)
        assert not out.exists() or not list(out.glob("*.json"))


# ---------------------------------------------------------------------------
# Reading records back
# ---------------------------------------------------------------------------


class TestParseRecord:
    def test_recognizes_a_run_record(self, full_benchmark_result: BenchmarkResult) -> None:
        parsed = parse_record(full_benchmark_result.model_dump(mode="json"))
        assert isinstance(parsed, BenchmarkResult)

    def test_recognizes_an_already_published_record(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        parsed = parse_record(to_canonical(full_benchmark_result).to_dict())
        assert isinstance(parsed, CanonicalBenchmark)

    def test_rejects_an_unrecognizable_object(self) -> None:
        with pytest.raises(BenchmarkExportError, match="neither"):
            parse_record({"id": "nope", "unexpected": True})


class TestIterPublishedRecords:
    def test_reads_records_newest_first(
        self, full_benchmark_result: BenchmarkResult, tmp_path: Path
    ) -> None:
        older = full_benchmark_result.model_copy(update={"timestamp": "2024-01-01T00:00:00+00:00"})
        to_canonical(full_benchmark_result, hardware_id="new-box").write(tmp_path)
        to_canonical(older, hardware_id="old-box").write(tmp_path)

        timestamps = [record.timestamp for _, record in iter_published_records(tmp_path)]
        assert timestamps == sorted(timestamps, reverse=True)

    def test_skips_underscore_prefixed_paths(
        self, full_benchmark_result: BenchmarkResult, tmp_path: Path
    ) -> None:
        """Raw run records live under `_raw/` and are not catalog data."""
        to_canonical(full_benchmark_result).write(tmp_path)
        raw_dir = tmp_path / "_raw" / "cornell-box"
        raw_dir.mkdir(parents=True)
        (raw_dir / "pbrt.json").write_text(
            json.dumps([full_benchmark_result.model_dump(mode="json")]), encoding="utf-8"
        )

        assert len(list(iter_published_records(tmp_path))) == 1

    def test_returns_nothing_for_a_missing_directory(self, tmp_path: Path) -> None:
        assert list(iter_published_records(tmp_path / "absent")) == []

    def test_skips_unreadable_files_without_failing(
        self, full_benchmark_result: BenchmarkResult, tmp_path: Path
    ) -> None:
        """One bad file in data/benchmarks/ must not hide every good one."""
        to_canonical(full_benchmark_result).write(tmp_path)
        (tmp_path / "broken.json").write_text("{ not json", encoding="utf-8")
        (tmp_path / "wrong-shape.json").write_text('{"id": "x"}', encoding="utf-8")

        assert len(list(iter_published_records(tmp_path))) == 1


class TestConvergenceSanitizing:
    def test_skips_points_with_an_unusable_sample_count(
        self, full_benchmark_result: BenchmarkResult, assert_schema_valid: Any
    ) -> None:
        """The schema requires samples >= 1; a zero-sample point cannot be published."""
        points = [
            ConvergencePoint(samples=0, time=0.1),
            ConvergencePoint(samples=16, time=1.0, psnr=22.0, ssim=0.8),
        ]
        result = full_benchmark_result.model_copy(update={"convergence": points})
        document = to_canonical(result).to_dict()

        assert [p["samples"] for p in document["convergence"]] == [16]
        assert_schema_valid(document)


# ---------------------------------------------------------------------------
# The exporter
# ---------------------------------------------------------------------------


class TestCanonicalBenchmarkExporter:
    def test_publishes_every_run_in_a_results_file(
        self, sample_results_json: Path, tmp_path: Path, assert_schema_valid: Any
    ) -> None:
        out = tmp_path / "benchmarks"
        written = CanonicalBenchmarkExporter(sample_results_json).export(out)

        assert len(written) == 2
        for path in written:
            assert path.parent == out
            assert_schema_valid(json.loads(path.read_text(encoding="utf-8")))

    def test_each_file_holds_one_object_not_an_array(
        self, sample_results_json: Path, tmp_path: Path
    ) -> None:
        """The array shape is what broke the web app's build."""
        written = CanonicalBenchmarkExporter(sample_results_json).export(tmp_path / "out")
        for path in written:
            assert isinstance(json.loads(path.read_text(encoding="utf-8")), dict)

    def test_files_end_with_a_newline(self, sample_results_json: Path, tmp_path: Path) -> None:
        written = CanonicalBenchmarkExporter(sample_results_json).export(tmp_path / "out")
        assert written[0].read_text(encoding="utf-8").endswith("\n")

    def test_publishing_is_idempotent(self, sample_results_json: Path, tmp_path: Path) -> None:
        out = tmp_path / "out"
        first = CanonicalBenchmarkExporter(sample_results_json).export(out)
        contents = [p.read_text(encoding="utf-8") for p in first]

        second = CanonicalBenchmarkExporter(sample_results_json).export(out)
        assert [p.name for p in second] == [p.name for p in first]
        assert [p.read_text(encoding="utf-8") for p in second] == contents

    def test_republishing_published_records_changes_nothing(
        self, sample_results_json: Path, tmp_path: Path
    ) -> None:
        """Round-trip: publish, feed the output back in, expect the same bytes."""
        out = tmp_path / "out"
        original = CanonicalBenchmarkExporter(sample_results_json).export(out)[0]
        before = original.read_text(encoding="utf-8")

        round_trip = tmp_path / "round-trip.json"
        round_trip.write_text(before, encoding="utf-8")
        republished = CanonicalBenchmarkExporter(round_trip).export(tmp_path / "again")[0]

        assert republished.read_text(encoding="utf-8") == before

    def test_reports_length_of_source_file(self, sample_results_json: Path) -> None:
        assert len(CanonicalBenchmarkExporter(sample_results_json)) == 2

    def test_applies_metadata_to_every_record(
        self, sample_results_json: Path, tmp_path: Path
    ) -> None:
        written = CanonicalBenchmarkExporter(
            sample_results_json, submitted_by="octocat", notes="from CI"
        ).export(tmp_path / "out")
        for path in written:
            document = json.loads(path.read_text(encoding="utf-8"))
            assert document["submitted_by"] == "octocat"
            assert document["notes"] == "from CI"

    def test_raises_for_a_missing_results_file(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            CanonicalBenchmarkExporter(tmp_path / "nope.json")

    def test_names_the_offending_entry_on_failure(self, tmp_path: Path) -> None:
        results = tmp_path / "results.json"
        results.write_text(json.dumps([{"id": "broken"}]), encoding="utf-8")
        with pytest.raises(BenchmarkExportError, match="entry 0"):
            CanonicalBenchmarkExporter(results).to_canonical()


class TestExportResults:
    def test_publishes_in_memory_records(
        self, full_benchmark_result: BenchmarkResult, tmp_path: Path, assert_schema_valid: Any
    ) -> None:
        written = export_results([full_benchmark_result], tmp_path / "out")
        assert len(written) == 1
        assert_schema_valid(json.loads(written[0].read_text(encoding="utf-8")))

    def test_creates_the_output_directory(
        self, full_benchmark_result: BenchmarkResult, tmp_path: Path
    ) -> None:
        out = tmp_path / "deeply" / "nested"
        export_results([full_benchmark_result], out)
        assert out.is_dir()


# ---------------------------------------------------------------------------
# Regression: the repo's own historical run records
# ---------------------------------------------------------------------------


def _legacy_run_record() -> BenchmarkResult:
    """Reconstructs a run record in the shape the repo committed before this fix.

    Every quality field is empty, the CPU is an architecture name, and a GPU run
    silently fell back to CPU — the combination that made these files both
    schema-invalid and misleading.
    """
    hardware = HardwareInfo(
        cpu="arm",
        cpu_cores_physical=18,
        cpu_cores_logical=18,
        ram_gb=64.0,
        gpu="Apple M5 Max",
        gpu_vram_gb=None,
        os="macOS 26.3.1",
        python_version="3.14.3",
        renderscope_version="0.1.0",
        optional_deps=[],
    )
    settings = RenderSettings(
        width=1920, height=1080, samples=1024, gpu=True, extra={"max_bounces": 8}
    )
    render = RenderResult(
        renderer="blender-cycles",
        scene="sponza",
        output_path="renderscope-results/sponza/blender-cycles_1024spp_1024spp.exr",
        render_time_seconds=174.16167945800044,
        peak_memory_mb=2184.59375,
        settings=settings,
        hardware=hardware,
        timestamp="2026-03-21T23:48:47.974194+00:00",
        metadata={"gpu_backend": "CPU (fallback)", "gpu_enabled": True, "exit_code": 0},
    )
    return BenchmarkResult(
        id="sponza-blender-cycles-2026-03-21",
        renderer="blender-cycles",
        renderer_version="4.4.3",
        scene="sponza",
        timestamp="2026-03-21T23:48:47.974569+00:00",
        hardware=hardware,
        settings=settings,
        results=render,
        quality_vs_reference=None,
        convergence=[ConvergencePoint(samples=n, time=float(n)) for n in (1, 4, 16, 64)],
    )


class TestHistoricalRunRecord:
    def test_becomes_publishable(self, assert_schema_valid: Any) -> None:
        assert_schema_valid(to_canonical(_legacy_run_record()).to_dict())

    def test_recovers_a_usable_machine_identity(self) -> None:
        record = to_canonical(_legacy_run_record())
        assert record.hardware.id == "apple-m5-max"
        assert record.hardware.label == "Apple M5 Max"

    def test_corrects_the_gpu_claim(self) -> None:
        """The run requested GPU and got CPU; publishing must say CPU."""
        assert to_canonical(_legacy_run_record()).settings.gpu_enabled is False


class TestNonFiniteMetrics:
    """Infinity and NaN are not representable in JSON.

    A render matching its reference exactly has an MSE of zero and therefore an
    infinite PSNR. Python's `json` writes that as a bare `Infinity`, which
    `json.load` and `scripts/validate_data.py` both accept but `JSON.parse`
    rejects — so the record would pass every Python-side check and then crash
    the web build.
    """

    def test_infinite_psnr_is_omitted(
        self, full_benchmark_result: BenchmarkResult, assert_schema_valid: Any
    ) -> None:
        quality = QualityMetrics(
            reference_renderer="pbrt",
            reference_samples=65536,
            psnr=float("inf"),
            ssim=1.0,
            mse=0.0,
        )
        result = full_benchmark_result.model_copy(update={"quality_vs_reference": quality})
        document = to_canonical(result).to_dict()

        assert "psnr" not in document["quality_vs_reference"]
        assert document["quality_vs_reference"]["mse"] == 0.0
        assert_schema_valid(document)

    def test_the_serialized_record_is_parseable_json(
        self, full_benchmark_result: BenchmarkResult
    ) -> None:
        quality = QualityMetrics(
            reference_renderer="pbrt", reference_samples=65536, psnr=float("inf")
        )
        result = full_benchmark_result.model_copy(update={"quality_vs_reference": quality})
        raw = to_canonical(result).to_json()

        assert "Infinity" not in raw
        assert "NaN" not in raw
        json.loads(raw)  # strict parse, as the web loader does

    @pytest.mark.parametrize("bad", [float("inf"), float("-inf"), float("nan")])
    def test_non_finite_convergence_metrics_are_omitted(
        self, full_benchmark_result: BenchmarkResult, bad: float
    ) -> None:
        points = [ConvergencePoint(samples=16, time=1.0, psnr=bad)]
        result = full_benchmark_result.model_copy(update={"convergence": points})
        document = to_canonical(result).to_dict()
        assert "psnr" not in document["convergence"][0]
