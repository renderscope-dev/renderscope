"""Canonical benchmark export — the contribution format for ``data/benchmarks/``.

``BenchmarkRunner`` records a *run*: everything needed to reproduce and debug
one render, including the full nested :class:`~renderscope.models.benchmark.RenderResult`,
the detected Python environment, and adapter-specific metadata.  The RenderScope
catalog publishes something narrower — one flat, self-describing record per
``renderer x scene x hardware``, defined by ``schemas/benchmark.schema.json`` and
consumed by the web dashboard at build time.

The two shapes are deliberately different, and this module is the only bridge
between them.  :func:`to_canonical` maps a run record onto the published schema;
the ``Canonical*`` models mirror that schema field-for-field with
``extra="forbid"``, so an export that would fail ``scripts/validate_data.py``
cannot be constructed in the first place.  Key differences the mapping resolves:

======================  =========================  ==============================
Run record              Published record           Note
======================  =========================  ==============================
``settings.width/height``  ``settings.resolution``   ``[w, h]`` pair
``settings.samples``       ``settings.samples_per_pixel``
``settings.gpu``           ``settings.gpu_enabled``  *effective*, not requested
``results.output_path``    ``results.output_image``  repo-relative
``hardware.cpu_cores_*``   ``hardware.cpu_cores`` / ``cpu_threads``
(absent)                   ``hardware.id`` / ``label``  derived, see :func:`derive_hardware_id`
(JSON array of runs)       (one JSON object per file)
======================  =========================  ==============================

Nothing here fabricates data.  Fields that cannot be derived from the run record
are omitted rather than guessed, and a value that the schema cannot represent
raises :class:`BenchmarkExportError` instead of being silently coerced.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path, PurePosixPath
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from renderscope.models.benchmark import BenchmarkResult

if TYPE_CHECKING:
    from collections.abc import Iterable, Iterator, Sequence

logger = logging.getLogger(__name__)

__all__ = [
    "BenchmarkExportError",
    "CanonicalBenchmark",
    "CanonicalBenchmarkExporter",
    "CanonicalConvergencePoint",
    "CanonicalHardware",
    "CanonicalQuality",
    "CanonicalResults",
    "CanonicalSettings",
    "canonical_filename",
    "check_against_schema",
    "derive_hardware_id",
    "derive_hardware_label",
    "export_results",
    "iter_published_records",
    "parse_record",
    "reject_filename_collisions",
    "relative_output_path",
    "slugify",
    "to_canonical",
]

# Directory names that mark the start of a portable, repo-relative output path.
_OUTPUT_ROOTS = ("renderscope-results", "assets", "renders", "output", "results")

# SSIM is mathematically bounded at 1.0, but floating-point accumulation in
# scikit-image can overshoot by a few ULPs on near-identical images.  Values
# within this tolerance are snapped; anything beyond it is a real error.
_UNIT_EPSILON = 1e-6

# ``renderer_type`` values the published schema accepts.
_RENDERER_TYPES = frozenset({"path_tracing", "rasterization", "scientific_visualization"})

# OSPRay records its backend in ``metadata["renderer_type"]`` using OSPRay's own
# vocabulary, which belongs in the schema's ``ospray_renderer`` field.  The
# rendering paradigm each backend implements is mapped alongside it.
_OSPRAY_BACKENDS: dict[str, str] = {
    "pathtracer": "path_tracing",
    "scivis": "scientific_visualization",
    "ao": "scientific_visualization",
}


class BenchmarkExportError(Exception):
    """Raised when a run record cannot be expressed in the published schema."""


# ---------------------------------------------------------------------------
# Canonical models — a field-for-field mirror of schemas/benchmark.schema.json
# ---------------------------------------------------------------------------
#
# Every model sets ``extra="forbid"`` so that a field the schema does not define
# is rejected at construction time.  Optional fields default to ``None`` and are
# dropped on serialization (see ``CanonicalBenchmark.to_dict``), because the
# schema types most of them as bare ``number``/``integer``/``string`` — emitting
# an explicit ``null`` would fail validation.


class CanonicalHardware(BaseModel):
    """The ``hardware`` object of a published benchmark record."""

    model_config = ConfigDict(extra="forbid")

    id: str | None = None
    label: str | None = None
    cpu: str
    cpu_cores: int | None = Field(default=None, ge=1)
    cpu_threads: int | None = Field(default=None, ge=1)
    gpu: str | None = None
    gpu_vram_gb: float | None = Field(default=None, ge=0)
    ram_gb: float = Field(ge=0)
    os: str
    driver: str | None = None
    driver_version: str | None = None


class CanonicalSettings(BaseModel):
    """The ``settings`` object of a published benchmark record."""

    model_config = ConfigDict(extra="forbid")

    resolution: tuple[int, int]
    samples_per_pixel: int | None = Field(default=None, ge=1)
    time_budget_seconds: float | None = Field(default=None, ge=0)
    integrator: str | None = None
    max_bounces: int | None = Field(default=None, ge=0)
    threads: int | None = Field(default=None, ge=1)
    gpu_enabled: bool | None = None
    denoiser: str | None = None
    renderer_type: str | None = None
    frame_count: int | None = Field(default=None, ge=1)
    warmup_frames: int | None = Field(default=None, ge=0)
    msaa_samples: int | None = Field(default=None, ge=1)
    ospray_renderer: str | None = None
    extra: dict[str, Any] | None = None


class CanonicalResults(BaseModel):
    """The ``results`` object of a published benchmark record."""

    model_config = ConfigDict(extra="forbid")

    render_time_seconds: float = Field(gt=0)
    peak_memory_mb: float | None = Field(default=None, ge=0)
    output_image: str
    output_image_web: str | None = None
    frame_time_ms_median: float | None = Field(default=None, gt=0)
    frame_time_ms_mean: float | None = Field(default=None, gt=0)
    frame_time_ms_min: float | None = Field(default=None, gt=0)
    frame_time_ms_max: float | None = Field(default=None, gt=0)
    frame_time_ms_p95: float | None = Field(default=None, gt=0)
    frame_count: int | None = Field(default=None, ge=1)


class CanonicalQuality(BaseModel):
    """The ``quality_vs_reference`` object of a published benchmark record."""

    model_config = ConfigDict(extra="forbid")

    reference_renderer: str
    reference_samples: int = Field(ge=1)
    psnr: float | None = None
    ssim: float | None = Field(default=None, ge=0, le=1)
    mse: float | None = Field(default=None, ge=0)
    lpips: float | None = Field(default=None, ge=0, le=1)


class CanonicalConvergencePoint(BaseModel):
    """One point on a published convergence curve."""

    model_config = ConfigDict(extra="forbid")

    samples: int = Field(ge=1)
    time: float | None = Field(default=None, ge=0)
    time_seconds: float | None = Field(default=None, ge=0)
    psnr: float | None = None
    ssim: float | None = Field(default=None, ge=0, le=1)


class CanonicalBenchmark(BaseModel):
    """A single published benchmark record: one renderer, scene, and machine.

    Construction validates against the published schema's structural rules, so
    an instance of this model is always serializable to a file that
    ``scripts/validate_data.py`` accepts.
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9-]+$")
    renderer: str
    renderer_version: str
    scene: str
    timestamp: str
    hardware: CanonicalHardware
    settings: CanonicalSettings
    results: CanonicalResults
    quality_vs_reference: CanonicalQuality | None = None
    convergence: list[CanonicalConvergencePoint] = Field(default_factory=list)
    notes: str | None = None
    submitted_by: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize to the exact JSON structure the published schema defines.

        Unset optional fields are dropped rather than emitted as ``null``: the
        schema types most of them as bare ``number``/``string``, so an explicit
        ``null`` would be rejected.  An empty ``convergence`` list is dropped
        for the same reason of not publishing a value that was never measured.
        """
        data: dict[str, Any] = self.model_dump(mode="json", exclude_none=True)
        if not data.get("convergence"):
            data.pop("convergence", None)
        return data

    def to_json(self) -> str:
        """Serialize to a formatted JSON document with a trailing newline."""
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False) + "\n"

    def write(self, output_dir: Path) -> Path:
        """Write this record to ``<output_dir>/<canonical_filename>``."""
        output_dir.mkdir(parents=True, exist_ok=True)
        path = output_dir / canonical_filename(self)
        path.write_text(self.to_json(), encoding="utf-8")
        return path


def check_against_schema(records: Sequence[CanonicalBenchmark]) -> None:
    """Verify records against ``schemas/benchmark.schema.json`` before writing.

    The ``Canonical*`` models already mirror the schema, so this can only fail
    if the two have drifted apart — which is precisely the failure worth
    catching, since it would otherwise surface as a broken pull request. The
    check is skipped when the optional ``jsonschema`` package is absent.

    Raises:
        BenchmarkExportError: If any record fails validation.
    """
    # Imported lazily: `renderscope.report.__init__` imports this module, so a
    # module-level import would create a cycle.
    from renderscope.report.schema import (
        SchemaNotAvailableError,
        describe_validation_failures,
        validate_benchmark_document,
    )

    failures: list[tuple[str, list[str]]] = []
    for record in records:
        try:
            errors = validate_benchmark_document(record.to_dict())
        except SchemaNotAvailableError as exc:
            logger.warning("Skipping schema check: %s", exc)
            return
        if errors:
            failures.append((record.id, errors))

    if failures:
        msg = (
            "Published records do not match schemas/benchmark.schema.json. This "
            "means the exporter and the schema have drifted apart — please report "
            "it as a bug.\n\n" + describe_validation_failures(failures)
        )
        raise BenchmarkExportError(msg)


# ---------------------------------------------------------------------------
# Identity helpers
# ---------------------------------------------------------------------------


def slugify(value: str) -> str:
    """Reduce a string to the ``^[a-z0-9-]+$`` alphabet used by catalog ids.

    Runs of non-alphanumeric characters collapse to a single hyphen, so
    ``"Apple M5 Max"`` becomes ``"apple-m5-max"`` and ``"cornell_box"`` becomes
    ``"cornell-box"``.
    """
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


# Generic architecture strings that identify a machine no better than "a computer".
# ``platform.processor()`` returns these on several platforms; when that is all
# the run record carries, the GPU name is a more informative machine identity.
_GENERIC_CPU_NAMES = frozenset(
    {"arm", "arm64", "aarch64", "x86", "x86-64", "amd64", "i386", "i686", "unknown-cpu"}
)


def _is_generic(cpu: str) -> bool:
    """Return True if a CPU string names an architecture rather than a chip."""
    return slugify(cpu) in _GENERIC_CPU_NAMES


def derive_hardware_label(cpu: str, gpu: str | None) -> str:
    """Choose the most informative human-readable name for a machine.

    Prefers the CPU model, falling back to the GPU when the CPU string is a
    bare architecture name (``"arm"``, ``"x86_64"``) that identifies nothing.
    """
    if not _is_generic(cpu):
        return cpu
    if gpu:
        return gpu
    return cpu


def derive_hardware_id(cpu: str, gpu: str | None) -> str:
    """Derive a short, stable slug identifying the machine a benchmark ran on.

    The id groups results from equivalent machines in the dashboard's hardware
    filter and distinguishes otherwise-identical submissions from different
    contributors, so it is derived only from durable properties — never from a
    timestamp, hostname, or anything else that varies between runs.
    """
    return slugify(derive_hardware_label(cpu, gpu)) or "unknown-hardware"


def canonical_filename(benchmark: CanonicalBenchmark) -> str:
    """Return the ``data/benchmarks/`` filename for a published record.

    Uses ``<scene>-<renderer>-<hardware>.json``, matching the flat layout the
    web app and the data validator read.  Re-publishing the same
    renderer/scene/machine combination overwrites the previous file instead of
    accumulating dated duplicates.
    """
    parts = [slugify(benchmark.scene), slugify(benchmark.renderer)]
    if benchmark.hardware.id:
        parts.append(benchmark.hardware.id)
    return "-".join(p for p in parts if p) + ".json"


def _canonical_id(scene: str, renderer: str, hardware_id: str, timestamp: str) -> str:
    """Build the record id as ``<scene>-<renderer>-<hardware>-<YYYY-MM-DD>``.

    The hardware component is what keeps two contributors who benchmark the
    same renderer and scene on the same day from colliding on a single id.
    """
    date = timestamp[:10] if len(timestamp) >= 10 else ""
    parts = [slugify(scene), slugify(renderer), hardware_id, slugify(date)]
    return "-".join(p for p in parts if p)


# ---------------------------------------------------------------------------
# Value coercion helpers
# ---------------------------------------------------------------------------


def _opt_int(value: Any, *, minimum: int) -> int | None:
    """Return ``value`` as an int if it is a valid, in-range integer."""
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if value >= minimum else None


def _opt_float(value: Any, *, minimum: float | None = None) -> float | None:
    """Return ``value`` as a float if it is a valid, in-range number."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    if minimum is not None and number < minimum:
        return None
    return number


def _opt_str(value: Any) -> str | None:
    """Return ``value`` as a non-empty string, or ``None``."""
    return value if isinstance(value, str) and value.strip() else None


def _clamp_unit(value: float | None, *, field: str) -> float | None:
    """Snap a [0, 1] metric that floating-point error pushed just out of range.

    Values further outside the range than :data:`_UNIT_EPSILON` indicate a real
    computation problem and are raised rather than hidden.
    """
    if value is None:
        return None
    if 0.0 <= value <= 1.0:
        return value
    if 1.0 < value <= 1.0 + _UNIT_EPSILON:
        return 1.0
    if -_UNIT_EPSILON <= value < 0.0:
        return 0.0
    msg = f"{field} is {value}, which is outside the range [0, 1] the schema allows."
    raise BenchmarkExportError(msg)


def relative_output_path(raw: str, *, base: Path | None = None) -> str:
    """Convert a render's output path into a portable, repo-relative POSIX path.

    Absolute paths written on the contributor's machine leak local directory
    layout into published data, so they are trimmed to start at a recognized
    output root (``renderscope-results/``, ``assets/``, ...) or, failing that,
    made relative to *base*.
    """
    text = raw.strip()
    if not text:
        msg = "Run record has an empty output path; nothing to publish as 'output_image'."
        raise BenchmarkExportError(msg)

    path = Path(text)
    if base is not None:
        try:
            return str(PurePosixPath(path.resolve().relative_to(base.resolve())))
        except (ValueError, OSError):
            pass

    parts = path.parts
    for index, part in enumerate(parts):
        if part in _OUTPUT_ROOTS:
            return str(PurePosixPath(*parts[index:]))

    if path.is_absolute():
        # No recognizable root: keep the last two segments so the record still
        # names the scene directory and file without exposing the full path.
        return str(PurePosixPath(*parts[-2:])) if len(parts) > 2 else path.name

    return str(PurePosixPath(*parts))


# ---------------------------------------------------------------------------
# Sub-object mapping
# ---------------------------------------------------------------------------


def _map_hardware(
    result: BenchmarkResult,
    *,
    hardware_id: str | None,
    hardware_label: str | None,
) -> CanonicalHardware:
    """Project the run record's environment capture onto the published shape.

    ``python_version``, ``renderscope_version``, and ``optional_deps`` describe
    the tool that measured the render rather than the machine that ran it, so
    they are intentionally not published.
    """
    hw = result.hardware
    resolved_id = hardware_id or derive_hardware_id(hw.cpu, hw.gpu)
    resolved_label = hardware_label or derive_hardware_label(hw.cpu, hw.gpu)
    return CanonicalHardware(
        id=slugify(resolved_id) or None,
        label=resolved_label,
        cpu=hw.cpu,
        cpu_cores=_opt_int(hw.cpu_cores_physical, minimum=1),
        cpu_threads=_opt_int(hw.cpu_cores_logical, minimum=1),
        gpu=hw.gpu,
        gpu_vram_gb=_opt_float(hw.gpu_vram_gb, minimum=0.0),
        ram_gb=hw.ram_gb,
        os=hw.os,
    )


def _effective_gpu_enabled(requested: bool, metadata: dict[str, Any]) -> bool:
    """Report whether the GPU was *used*, not merely requested.

    Several adapters accept a GPU request and silently fall back to CPU — Cycles
    records this as ``gpu_backend: "CPU (fallback)"``.  Publishing the request
    would misattribute CPU timings to a GPU run.
    """
    metadata_flag = metadata.get("gpu_enabled")
    enabled = bool(metadata_flag) if isinstance(metadata_flag, bool) else requested
    backend = _opt_str(metadata.get("gpu_backend"))
    if enabled and backend and "cpu" in backend.lower():
        return False
    return enabled


def _map_settings(result: BenchmarkResult) -> CanonicalSettings:
    """Project render settings and adapter metadata onto the published shape."""
    settings = result.settings
    extra = settings.extra
    metadata = result.results.metadata

    renderer_type = _opt_str(metadata.get("renderer_type"))
    ospray_renderer: str | None = None
    if renderer_type is not None and renderer_type not in _RENDERER_TYPES:
        # OSPRay reports its own backend vocabulary here (pathtracer/scivis/ao).
        ospray_renderer = renderer_type if renderer_type in _OSPRAY_BACKENDS else None
        renderer_type = _OSPRAY_BACKENDS.get(renderer_type)

    return CanonicalSettings(
        resolution=(settings.width, settings.height),
        samples_per_pixel=_opt_int(settings.samples, minimum=1),
        time_budget_seconds=_opt_float(settings.time_budget, minimum=0.0),
        integrator=_opt_str(metadata.get("integrator")) or _opt_str(extra.get("integrator")),
        max_bounces=_opt_int(extra.get("max_bounces"), minimum=0),
        threads=_opt_int(settings.threads, minimum=1),
        gpu_enabled=_effective_gpu_enabled(settings.gpu, metadata),
        denoiser=_opt_str(metadata.get("denoiser")) or _opt_str(extra.get("denoiser")),
        renderer_type=renderer_type,
        frame_count=_opt_int(metadata.get("frame_count"), minimum=1),
        warmup_frames=_opt_int(metadata.get("warmup_frames"), minimum=0),
        msaa_samples=_opt_int(metadata.get("msaa_samples"), minimum=1),
        ospray_renderer=ospray_renderer,
    )


def _map_results(result: BenchmarkResult, *, base: Path | None) -> CanonicalResults:
    """Project measured timings and output paths onto the published shape."""
    render = result.results
    metadata = render.metadata

    if render.render_time_seconds <= 0:
        msg = (
            f"Run '{result.id}' reports a render time of "
            f"{render.render_time_seconds}s. The schema requires a positive "
            "measurement, so this run cannot be published."
        )
        raise BenchmarkExportError(msg)

    return CanonicalResults(
        render_time_seconds=render.render_time_seconds,
        peak_memory_mb=_opt_float(render.peak_memory_mb, minimum=0.0),
        output_image=relative_output_path(render.output_path, base=base),
        output_image_web=_opt_str(metadata.get("output_image_web")),
        frame_time_ms_median=_opt_float(metadata.get("frame_time_ms_median")),
        frame_time_ms_mean=_opt_float(metadata.get("frame_time_ms_mean")),
        frame_time_ms_min=_opt_float(metadata.get("frame_time_ms_min")),
        frame_time_ms_max=_opt_float(metadata.get("frame_time_ms_max")),
        frame_time_ms_p95=_opt_float(metadata.get("frame_time_ms_p95")),
        frame_count=_opt_int(metadata.get("frame_count"), minimum=1),
    )


def _map_quality(result: BenchmarkResult) -> CanonicalQuality | None:
    """Project quality metrics onto the published shape.

    Returns ``None`` when the run has no reference to compare against — the
    schema requires ``reference_renderer`` and ``reference_samples``, so a
    partial quality block cannot be published.
    """
    quality = result.quality_vs_reference
    if quality is None:
        return None

    reference_renderer = _opt_str(quality.reference_renderer)
    reference_samples = _opt_int(quality.reference_samples, minimum=1)
    if reference_renderer is None or reference_samples is None:
        if quality.psnr is not None or quality.ssim is not None:
            logger.warning(
                "Run '%s' has quality metrics but no reference renderer/sample count; "
                "omitting 'quality_vs_reference' because the schema requires both.",
                result.id,
            )
        return None

    return CanonicalQuality(
        reference_renderer=reference_renderer,
        reference_samples=reference_samples,
        psnr=_opt_float(quality.psnr),
        ssim=_clamp_unit(_opt_float(quality.ssim), field="quality_vs_reference.ssim"),
        mse=_opt_float(quality.mse, minimum=0.0),
        lpips=_clamp_unit(_opt_float(quality.lpips), field="quality_vs_reference.lpips"),
    )


def _map_convergence(result: BenchmarkResult) -> list[CanonicalConvergencePoint]:
    """Project the convergence series onto the published shape."""
    points: list[CanonicalConvergencePoint] = []
    for point in result.convergence:
        samples = _opt_int(point.samples, minimum=1)
        if samples is None:
            logger.warning(
                "Run '%s' has a convergence point with sample count %r; skipping it.",
                result.id,
                point.samples,
            )
            continue
        points.append(
            CanonicalConvergencePoint(
                samples=samples,
                time=_opt_float(point.time, minimum=0.0),
                psnr=_opt_float(point.psnr),
                ssim=_clamp_unit(_opt_float(point.ssim), field="convergence.ssim"),
            )
        )
    return points


# ---------------------------------------------------------------------------
# Public conversion API
# ---------------------------------------------------------------------------


def to_canonical(
    result: BenchmarkResult,
    *,
    hardware_id: str | None = None,
    hardware_label: str | None = None,
    notes: str | None = None,
    submitted_by: str | None = None,
    base_dir: Path | None = None,
) -> CanonicalBenchmark:
    """Convert one benchmark run record into a publishable catalog record.

    Args:
        result: The run record produced by ``BenchmarkRunner``.
        hardware_id: Override the derived machine slug.  Useful when a
            contributor benchmarks several machines whose CPU strings collide.
        hardware_label: Override the derived human-readable machine name.
        notes: Free-form provenance to attach to the published record — how the
            reference was produced, known caveats, non-default configuration.
        submitted_by: GitHub username to credit for the submission.
        base_dir: Directory that ``results.output_path`` should be made relative
            to.  Defaults to trimming the path at a recognized output root.

    Returns:
        A validated :class:`CanonicalBenchmark`.

    Raises:
        BenchmarkExportError: If the run cannot be expressed in the published
            schema — for example a non-positive render time, or a metric outside
            the range the schema permits.
    """
    hardware = _map_hardware(result, hardware_id=hardware_id, hardware_label=hardware_label)
    record_id = _canonical_id(result.scene, result.renderer, hardware.id or "", result.timestamp)

    try:
        return CanonicalBenchmark(
            id=record_id,
            renderer=result.renderer,
            renderer_version=result.renderer_version,
            scene=result.scene,
            timestamp=result.timestamp,
            hardware=hardware,
            settings=_map_settings(result),
            results=_map_results(result, base=base_dir),
            quality_vs_reference=_map_quality(result),
            convergence=_map_convergence(result),
            notes=notes,
            submitted_by=submitted_by,
        )
    except ValidationError as exc:
        msg = f"Run '{result.id}' cannot be published as a catalog record:\n{exc}"
        raise BenchmarkExportError(msg) from exc


def parse_record(entry: dict[str, Any]) -> BenchmarkResult | CanonicalBenchmark:
    """Interpret one JSON object as either a run record or a published record.

    ``renderscope publish`` is idempotent: re-running it over a directory that
    already holds published records passes them through unchanged instead of
    failing or double-converting.

    Raises:
        BenchmarkExportError: If the object matches neither shape.
    """
    try:
        return BenchmarkResult.model_validate(entry)
    except ValidationError as run_error:
        try:
            return CanonicalBenchmark.model_validate(entry)
        except ValidationError:
            entry_id = entry.get("id", "<no id>")
            msg = (
                f"Entry '{entry_id}' is neither a benchmark run record nor a published "
                f"catalog record.\n\nAs a run record it fails with:\n{run_error}"
            )
            raise BenchmarkExportError(msg) from run_error


# ---------------------------------------------------------------------------
# Exporter
# ---------------------------------------------------------------------------


class CanonicalBenchmarkExporter:
    """Convert a benchmark results file into publishable catalog records.

    Mirrors the other exporters in :mod:`renderscope.report`, but writes one
    file per run rather than a single document, because the catalog stores one
    JSON object per ``renderer x scene x hardware`` combination.

    Example:
        >>> exporter = CanonicalBenchmarkExporter(Path("results.json"))
        >>> written = exporter.export(Path("data/benchmarks"))
    """

    def __init__(
        self,
        results_path: Path,
        *,
        hardware_id: str | None = None,
        hardware_label: str | None = None,
        notes: str | None = None,
        submitted_by: str | None = None,
        base_dir: Path | None = None,
    ) -> None:
        """Load run records from *results_path*.

        Raises:
            FileNotFoundError: If *results_path* does not exist.
            ValueError: If the file is not a readable results document.
        """
        from renderscope.report._loader import load_results_raw

        self._results_path = results_path
        self._raw = load_results_raw(results_path)
        self._hardware_id = hardware_id
        self._hardware_label = hardware_label
        self._notes = notes
        self._submitted_by = submitted_by
        self._base_dir = base_dir

    @property
    def results_path(self) -> Path:
        """The results file these records were loaded from."""
        return self._results_path

    def __len__(self) -> int:
        """Number of entries in the source results file."""
        return len(self._raw)

    def to_canonical(self) -> list[CanonicalBenchmark]:
        """Convert every entry, preserving already-published records as-is.

        Raises:
            BenchmarkExportError: If any entry cannot be published.  Conversion
                is all-or-nothing so a partially written directory is never
                left behind.
        """
        records: list[CanonicalBenchmark] = []
        for index, entry in enumerate(self._raw):
            try:
                parsed = parse_record(entry)
            except BenchmarkExportError as exc:
                msg = f"{self._results_path} (entry {index}): {exc}"
                raise BenchmarkExportError(msg) from exc

            if isinstance(parsed, CanonicalBenchmark):
                logger.debug("Entry %d is already a published record; passing through.", index)
                records.append(parsed)
                continue

            records.append(
                to_canonical(
                    parsed,
                    hardware_id=self._hardware_id,
                    hardware_label=self._hardware_label,
                    notes=self._notes,
                    submitted_by=self._submitted_by,
                    base_dir=self._base_dir,
                )
            )
        return records

    def export(self, output_dir: Path, *, validate: bool = True) -> list[Path]:
        """Write one published record per run into *output_dir*.

        Every record is converted and checked before anything is written, so a
        failure cannot leave a half-published directory behind.

        Args:
            output_dir: Directory to write published records into.
            validate: Check each record against the published JSON Schema
                before writing.  Requires ``jsonschema``; skipped when absent.

        Returns:
            The paths written, in source order.

        Raises:
            BenchmarkExportError: If any entry cannot be published, if two
                entries would be written to the same filename, or if a record
                fails schema validation.
        """
        records = self.to_canonical()
        reject_filename_collisions(records)
        if validate:
            check_against_schema(records)

        written: list[Path] = []
        for record in records:
            path = record.write(output_dir)
            logger.info("Published %s -> %s", record.id, path)
            written.append(path)
        return written


def reject_filename_collisions(records: Sequence[CanonicalBenchmark]) -> None:
    """Fail if two records in one batch would overwrite each other.

    Two runs of the same renderer, scene, and machine differ only in when they
    ran; silently keeping the last one would discard a measurement the
    contributor asked to publish.

    Raises:
        BenchmarkExportError: If two records share a target filename.
    """
    seen: dict[str, str] = {}
    for record in records:
        name = canonical_filename(record)
        if name in seen:
            msg = (
                f"Runs '{seen[name]}' and '{record.id}' both publish to '{name}'. "
                "They cover the same renderer, scene, and machine — keep the run "
                "you want to publish, or pass a distinct --hardware-id."
            )
            raise BenchmarkExportError(msg)
        seen[name] = record.id


def iter_published_records(directory: Path) -> Iterator[tuple[Path, CanonicalBenchmark]]:
    """Yield every published record in *directory*, newest timestamp first.

    Files and subdirectories whose name starts with ``_`` are skipped, matching
    the convention the web loader and data validator use for non-catalog files.
    """
    if not directory.is_dir():
        return

    paths = [
        path
        for path in sorted(directory.rglob("*.json"))
        if not any(part.startswith("_") for part in path.relative_to(directory).parts)
    ]

    loaded: list[tuple[Path, CanonicalBenchmark]] = []
    for path in paths:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            loaded.append((path, CanonicalBenchmark.model_validate(data)))
        except (json.JSONDecodeError, OSError, ValidationError) as exc:
            logger.warning("Skipping %s: %s", path, exc)

    loaded.sort(key=lambda item: item[1].timestamp, reverse=True)
    yield from loaded


def export_results(
    results: Iterable[BenchmarkResult],
    output_dir: Path,
    *,
    validate: bool = True,
    **kwargs: Any,
) -> list[Path]:
    """Publish in-memory run records directly, without a results file.

    Used by ``renderscope benchmark --publish-dir`` so a benchmark run produces
    contribution-ready files in one step.

    Raises:
        BenchmarkExportError: If any run cannot be published or fails schema
            validation.
    """
    records = [to_canonical(result, **kwargs) for result in results]
    reject_filename_collisions(records)
    if validate:
        check_against_schema(records)
    return [record.write(output_dir) for record in records]
