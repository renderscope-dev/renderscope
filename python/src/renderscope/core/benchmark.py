"""Benchmark orchestration engine.

Coordinates renderer adapters, scene management, timing, image quality
metrics, and result collection into a single automated pipeline.

The ``BenchmarkRunner`` is designed to work both as a library (imported
directly) and as the backend for the ``renderscope benchmark`` CLI command.
All progress/UI output is gated behind optional callbacks — the runner
itself communicates exclusively via return values, exceptions, and logging.
"""

from __future__ import annotations

import contextlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any

from renderscope.models.benchmark import (
    BenchmarkResult,
    ConvergencePoint,
    QualityMetrics,
    RenderResult,
)
from renderscope.utils.hardware import detect_hardware

if TYPE_CHECKING:
    from collections.abc import Callable

    from renderscope.adapters.base import RendererAdapter
    from renderscope.core.registry import AdapterRegistry
    from renderscope.core.scene import SceneManager
    from renderscope.models.hardware import HardwareInfo
    from renderscope.models.settings import RenderSettings

logger = logging.getLogger(__name__)

# Sample counts used for convergence tracking.
CONVERGENCE_CHECKPOINTS: list[int] = [1, 4, 16, 64, 256, 1024]

# Default warm-up sample count (very low, just to prime caches/kernels).
_WARMUP_SAMPLES = 1


# ---------------------------------------------------------------------------
# Helper: format time/memory for logging
# ---------------------------------------------------------------------------


def _fmt_time(seconds: float) -> str:
    """Format seconds into a human-readable string."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes}m {secs:.0f}s"


def _fmt_memory(mb: float) -> str:
    """Format megabytes into a human-readable string."""
    if mb >= 1024:
        return f"{mb / 1024:.1f} GB"
    return f"{mb:.0f} MB"


# ---------------------------------------------------------------------------
# BenchmarkRunner
# ---------------------------------------------------------------------------


class BenchmarkRunner:
    """Orchestrates benchmark execution across renderers and scenes.

    Coordinates the full benchmark lifecycle:

    1. Scene resolution and format compatibility checking
    2. Renderer warm-up runs for fair timing
    3. Timed render execution via adapters
    4. Image quality assessment via metrics
    5. Optional convergence tracking at multiple sample counts
    6. Structured result collection and serialization
    """

    def __init__(
        self,
        scene_manager: SceneManager,
        registry: AdapterRegistry,
        output_dir: Path | None = None,
    ) -> None:
        self._scene_manager = scene_manager
        self._registry = registry
        self._output_dir = output_dir or Path("renderscope-results")

    @property
    def output_dir(self) -> Path:
        """Directory where rendered images and artifacts are stored."""
        return self._output_dir

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def run(
        self,
        scenes: list[str],
        renderers: list[str],
        settings: RenderSettings,
        *,
        convergence: bool = False,
        warmup: bool = True,
        skip_existing: bool = False,
        progress_callback: Callable[[str, int, int], None] | None = None,
    ) -> list[BenchmarkResult]:
        """Execute benchmarks for all renderer x scene combinations.

        Args:
            scenes: Scene IDs, or ``["all"]`` for all downloaded scenes.
            renderers: Renderer adapter names, or ``["all"]`` for all installed.
            settings: Render configuration (resolution, samples, etc.).
            convergence: Capture quality at multiple sample checkpoints.
            warmup: Perform a throwaway warm-up render before timing.
            skip_existing: Skip combinations that already have result files.
            progress_callback: Called with ``(status_message, current, total)``
                for each benchmark step.

        Returns:
            List of ``BenchmarkResult`` models (one per successful run).
        """
        # 1. Resolve scene and renderer lists.
        resolved_scenes = self._resolve_scenes(scenes)
        resolved_adapters = self._resolve_renderers(renderers)

        if not resolved_scenes:
            logger.warning("No scenes available for benchmarking.")
            return []
        if not resolved_adapters:
            logger.warning("No renderers available for benchmarking.")
            return []

        # 2. Build the run matrix — filter incompatible pairs.
        run_matrix = self._build_run_matrix(resolved_scenes, resolved_adapters)
        if not run_matrix:
            logger.warning("No compatible renderer x scene pairs found.")
            return []

        logger.info(
            "Benchmark plan: %d runs (%d renderers x %d scenes, %d compatible)",
            len(run_matrix),
            len(resolved_adapters),
            len(resolved_scenes),
            len(run_matrix),
        )

        # 3. Detect hardware once for all results.
        hardware = detect_hardware()

        # 4. Execute benchmarks.
        results: list[BenchmarkResult] = []
        total = len(run_matrix)

        for idx, (adapter, scene_id, fmt) in enumerate(run_matrix, start=1):
            label = f"{adapter.display_name} x {scene_id}"

            if progress_callback is not None:
                progress_callback(label, idx, total)

            # Skip if result already exists.
            if skip_existing:
                output_img = self._output_image_path(scene_id, adapter.name, settings)
                if output_img.is_file():
                    logger.info("[%d/%d] Skipping %s (output exists)", idx, total, label)
                    continue

            logger.info("[%d/%d] Running %s", idx, total, label)

            try:
                scene_path = self._scene_manager.get_scene_path(scene_id, fmt)

                # Inject camera info from manifest into settings.extra
                # so adapters (e.g. Cycles) can position the camera for
                # imported mesh scenes (OBJ, STL, etc.) that lack cameras.
                run_settings = settings
                scene_info = self._scene_manager.get_scene(scene_id)
                if scene_info.camera is not None:
                    extra_with_camera = dict(settings.extra)
                    extra_with_camera["camera_position"] = scene_info.camera.position
                    extra_with_camera["camera_target"] = scene_info.camera.target
                    extra_with_camera["camera_up"] = scene_info.camera.up
                    extra_with_camera["camera_fov"] = scene_info.camera.fov
                    run_settings = settings.model_copy(update={"extra": extra_with_camera})

                result = self._run_single(
                    adapter=adapter,
                    scene_id=scene_id,
                    scene_path=scene_path,
                    settings=run_settings,
                    hardware=hardware,
                    convergence=convergence,
                    warmup=warmup,
                )
                results.append(result)
                logger.info(
                    "[%d/%d] %s completed: %s, %s",
                    idx,
                    total,
                    label,
                    _fmt_time(result.results.render_time_seconds),
                    _fmt_memory(result.results.peak_memory_mb),
                )
            except KeyboardInterrupt:
                logger.warning(
                    "Benchmark interrupted. %d of %d runs completed.", len(results), total
                )
                break
            except Exception:
                logger.exception("[%d/%d] %s FAILED", idx, total, label)
                # Continue with remaining benchmarks.

        return results

    def build_run_matrix(
        self,
        scenes: list[str],
        renderers: list[str],
    ) -> list[tuple[str, str, str, str]]:
        """Build and return the run matrix as serializable tuples.

        Returns:
            List of ``(renderer_name, display_name, scene_id, format)`` tuples.
        """
        resolved_scenes = self._resolve_scenes(scenes)
        resolved_adapters = self._resolve_renderers(renderers)
        matrix = self._build_run_matrix(resolved_scenes, resolved_adapters)
        return [
            (adapter.name, adapter.display_name, scene_id, fmt) for adapter, scene_id, fmt in matrix
        ]

    # ------------------------------------------------------------------
    # Single benchmark execution
    # ------------------------------------------------------------------

    def _run_single(
        self,
        adapter: RendererAdapter,
        scene_id: str,
        scene_path: Path,
        settings: RenderSettings,
        hardware: HardwareInfo,
        *,
        convergence: bool = False,
        warmup: bool = True,
    ) -> BenchmarkResult:
        """Execute a single renderer x scene benchmark.

        This is the core execution method that handles warm-up, timed
        rendering, output verification, quality assessment, and
        convergence tracking.
        """
        output_path = self._output_image_path(scene_id, adapter.name, settings)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Detect renderer version.
        version = adapter.detect() or "unknown"

        # Warm-up run (discard result).
        if warmup:
            logger.debug("Warming up %s...", adapter.display_name)
            warmup_settings = settings.model_copy(update={"samples": _WARMUP_SAMPLES})
            warmup_output = output_path.with_name(f"{output_path.stem}_warmup{output_path.suffix}")
            try:
                adapter.render(scene_path, warmup_output, warmup_settings)
            except Exception:
                logger.debug("Warm-up render failed (non-critical)", exc_info=True)
            finally:
                # Clean up warm-up output.
                if warmup_output.is_file():
                    with contextlib.suppress(OSError):
                        warmup_output.unlink()

        # Convergence tracking or single render.
        convergence_points: list[ConvergencePoint] = []

        if convergence:
            render_result, convergence_points = self._run_convergence(
                adapter=adapter,
                scene_id=scene_id,
                scene_path=scene_path,
                base_settings=settings,
                hardware=hardware,
            )
        else:
            # Single timed render.
            render_result = adapter.render(scene_path, output_path, settings)

        # Verify output.
        actual_output = Path(render_result.output_path)
        if not actual_output.is_file() or actual_output.stat().st_size == 0:
            msg = (
                f"Render completed but no output file was produced.\n"
                f"Expected output at: {actual_output}"
            )
            raise FileNotFoundError(msg)

        # Quality assessment against reference.
        quality: QualityMetrics | None = None
        reference_path = self._scene_manager.get_reference_path(scene_id)
        if reference_path is not None:
            quality = self._compute_quality(
                output_path=actual_output,
                reference_path=reference_path,
                scene_id=scene_id,
            )

        # Assemble result.
        result_id = self._generate_id(scene_id, adapter.name)
        timestamp = datetime.now(tz=timezone.utc).isoformat()

        return BenchmarkResult(
            id=result_id,
            renderer=adapter.name,
            renderer_version=version,
            scene=scene_id,
            timestamp=timestamp,
            hardware=hardware,
            settings=settings,
            results=render_result,
            quality_vs_reference=quality,
            convergence=convergence_points,
        )

    # ------------------------------------------------------------------
    # Convergence tracking
    # ------------------------------------------------------------------

    def _run_convergence(
        self,
        adapter: RendererAdapter,
        scene_id: str,
        scene_path: Path,
        base_settings: RenderSettings,
        hardware: HardwareInfo,
    ) -> tuple[RenderResult, list[ConvergencePoint]]:
        """Run renders at multiple sample counts and track quality convergence.

        Returns:
            A tuple of (final_render_result, convergence_points).
        """
        target_samples = base_settings.samples or CONVERGENCE_CHECKPOINTS[-1]
        checkpoints = [s for s in CONVERGENCE_CHECKPOINTS if s <= target_samples]
        # Always include the target if it's not already in the list.
        if target_samples not in checkpoints:
            checkpoints.append(target_samples)

        reference_path = self._scene_manager.get_reference_path(scene_id)
        points: list[ConvergencePoint] = []
        last_result: RenderResult | None = None

        for spp in checkpoints:
            checkpoint_settings = base_settings.model_copy(update={"samples": spp})
            output_path = self._output_image_path(
                scene_id, adapter.name, checkpoint_settings, suffix=f"_{spp}spp"
            )
            output_path.parent.mkdir(parents=True, exist_ok=True)

            try:
                render_result = adapter.render(scene_path, output_path, checkpoint_settings)
                last_result = render_result

                # Compute quality if reference exists.
                psnr_val: float | None = None
                ssim_val: float | None = None
                actual_output = Path(render_result.output_path)
                if reference_path is not None and actual_output.is_file():
                    try:
                        quality = self._compute_quality(
                            output_path=actual_output,
                            reference_path=reference_path,
                            scene_id=scene_id,
                        )
                        psnr_val = quality.psnr
                        ssim_val = quality.ssim
                    except Exception:
                        logger.debug("Quality computation failed at %d SPP", spp, exc_info=True)

                points.append(
                    ConvergencePoint(
                        samples=spp,
                        time=render_result.render_time_seconds,
                        psnr=psnr_val,
                        ssim=ssim_val,
                    )
                )
                logger.debug(
                    "Convergence checkpoint: %d SPP, %.1fs, PSNR=%s, SSIM=%s",
                    spp,
                    render_result.render_time_seconds,
                    f"{psnr_val:.1f}" if psnr_val is not None else "N/A",
                    f"{ssim_val:.4f}" if ssim_val is not None else "N/A",
                )
            except Exception:
                logger.warning("Convergence checkpoint %d SPP failed", spp, exc_info=True)

        if last_result is None:
            msg = "All convergence checkpoints failed — no render result produced."
            raise RuntimeError(msg)

        return last_result, points

    # ------------------------------------------------------------------
    # Quality assessment
    # ------------------------------------------------------------------

    def _compute_quality(
        self,
        output_path: Path,
        reference_path: Path,
        scene_id: str,
    ) -> QualityMetrics:
        """Compute image quality metrics between a render and its reference.

        Loads both images, computes PSNR, SSIM, MSE, and optionally LPIPS,
        and returns a ``QualityMetrics`` model.
        """
        from renderscope.core.metrics import ImageMetrics
        from renderscope.utils.image_io import is_hdr, load_image, tonemap

        ref_img = load_image(reference_path)
        test_img = load_image(output_path)

        # Tone-map HDR images before computing metrics.
        if is_hdr(reference_path):
            ref_img = tonemap(ref_img)
        if is_hdr(output_path):
            test_img = tonemap(test_img)

        # Resize test image to match reference if dimensions differ.
        if ref_img.shape != test_img.shape:
            logger.warning(
                "Image dimensions differ: reference %s vs render %s. Skipping quality metrics.",
                ref_img.shape,
                test_img.shape,
            )
            # Return the reference info without metric values.
            scene = self._scene_manager.get_scene(scene_id)
            ref_info = scene.reference
            return QualityMetrics(
                reference_renderer=ref_info.renderer if ref_info else None,
                reference_samples=ref_info.samples if ref_info else None,
            )

        psnr_val = ImageMetrics.psnr(ref_img, test_img)
        ssim_val = ImageMetrics.ssim(ref_img, test_img)
        mse_val = ImageMetrics.mse(ref_img, test_img)

        # Attempt LPIPS (optional dependency).
        lpips_val: float | None = None
        try:
            lpips_val = ImageMetrics.lpips(ref_img, test_img)
        except ImportError:
            logger.debug("LPIPS not available (install renderscope[ml]).")
        except Exception:
            logger.debug("LPIPS computation failed", exc_info=True)

        scene = self._scene_manager.get_scene(scene_id)
        ref_info = scene.reference

        return QualityMetrics(
            reference_renderer=ref_info.renderer if ref_info else None,
            reference_samples=ref_info.samples if ref_info else None,
            psnr=psnr_val,
            ssim=ssim_val,
            mse=mse_val,
            lpips=lpips_val,
        )

    # ------------------------------------------------------------------
    # Result serialization
    # ------------------------------------------------------------------

    def save_results(
        self,
        results: list[BenchmarkResult],
        output_path: Path,
        *,
        append: bool = False,
    ) -> None:
        """Serialize benchmark results to a JSON file.

        Args:
            results: List of benchmark results to save.
            output_path: Path to the JSON output file.
            append: If ``True`` and the file exists, merge new results with
                existing ones (deduplicating by ID).
        """
        if not results:
            logger.warning("No results to save.")
            return

        existing: list[dict[str, Any]] = []

        if append and output_path.is_file():
            try:
                raw = output_path.read_text(encoding="utf-8")
                loaded = json.loads(raw)
                if isinstance(loaded, list):
                    existing = loaded
                else:
                    logger.warning("Existing file is not a JSON array; overwriting.")
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Could not read existing results: %s", exc)

        # Merge: use a dict keyed by ID to deduplicate (newer wins).
        merged: dict[str, dict[str, Any]] = {}
        for entry in existing:
            entry_id = entry.get("id", "")
            if entry_id:
                merged[entry_id] = entry

        for result in results:
            merged[result.id] = result.model_dump(mode="json")

        output_list = list(merged.values())

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(output_list, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        logger.info("Results saved to %s (%d entries)", output_path, len(output_list))

    # ------------------------------------------------------------------
    # Resolution helpers
    # ------------------------------------------------------------------

    def _resolve_scenes(self, scene_ids: list[str]) -> list[str]:
        """Resolve scene IDs, expanding ``"all"`` to all downloaded scenes."""
        if "all" in scene_ids:
            downloaded = self._scene_manager.get_downloaded_scene_ids()
            logger.info("Expanded 'all' scenes to: %s", ", ".join(downloaded) or "(none)")
            return downloaded
        return list(scene_ids)

    def _resolve_renderers(self, renderer_names: list[str]) -> list[RendererAdapter]:
        """Resolve renderer names, expanding ``"all"`` to all installed."""
        if "all" in renderer_names:
            installed = self._registry.list_installed()
            all_adapters = [adapter for adapter, _version in installed]
            names = [a.name for a in all_adapters]
            logger.info("Expanded 'all' renderers to: %s", ", ".join(names) or "(none)")
            return all_adapters

        resolved: list[RendererAdapter] = []
        for name in renderer_names:
            adapter = self._registry.get(name)
            if adapter is None:
                logger.warning("Renderer '%s' is not registered. Skipping.", name)
                continue
            version = adapter.detect()
            if version is None:
                logger.warning("Renderer '%s' is not installed. Skipping.", name)
                continue
            resolved.append(adapter)
        return resolved

    def _build_run_matrix(
        self,
        scene_ids: list[str],
        adapters: list[RendererAdapter],
    ) -> list[tuple[RendererAdapter, str, str]]:
        """Build the cross-product of adapters x scenes, filtering incompatible pairs.

        Returns:
            List of ``(adapter, scene_id, compatible_format)`` tuples.
        """
        matrix: list[tuple[RendererAdapter, str, str]] = []

        for adapter in adapters:
            for scene_id in scene_ids:
                fmt = self._scene_manager.get_compatible_format(
                    scene_id, adapter.supported_formats()
                )
                if fmt is None:
                    logger.warning(
                        "Skipping %s x %s — no compatible format. "
                        "Renderer supports: %s. Scene has: %s.",
                        adapter.display_name,
                        scene_id,
                        ", ".join(adapter.supported_formats()),
                        ", ".join(self._scene_manager.get_scene(scene_id).formats.keys()),
                    )
                    continue

                # Check that the scene is actually downloaded.
                if not self._scene_manager.is_downloaded(scene_id):
                    logger.warning(
                        "Skipping %s x %s — scene not downloaded.",
                        adapter.display_name,
                        scene_id,
                    )
                    continue

                matrix.append((adapter, scene_id, fmt))

        return matrix

    def _output_image_path(
        self,
        scene_id: str,
        renderer_name: str,
        settings: RenderSettings,
        suffix: str = "",
    ) -> Path:
        """Determine the output image path for a render."""
        samples = settings.samples or 0
        filename = f"{renderer_name}_{samples}spp{suffix}.exr"
        return self._output_dir / scene_id / filename

    @staticmethod
    def _generate_id(scene_id: str, renderer_name: str) -> str:
        """Generate a unique benchmark result ID."""
        date_str = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
        return f"{scene_id}-{renderer_name}-{date_str}"
