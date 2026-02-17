"""Tests for Pydantic data models."""

from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from renderscope.models import (
    BenchmarkResult,
    HardwareInfo,
    QualityMetrics,
    RendererMetadata,
    RenderResult,
    RenderSettings,
)


class TestRendererMetadata:
    """Tests for the RendererMetadata model."""

    def test_valid_creation(self, sample_renderer_data: dict[str, Any]) -> None:
        """Create a model from valid data."""
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.id == "test-renderer"
        assert renderer.name == "Test Renderer"
        assert renderer.version == "1.0.0"
        assert renderer.status == "active"
        assert renderer.gpu_support is False
        assert renderer.cpu_support is True

    def test_roundtrip(self, sample_renderer_data: dict[str, Any]) -> None:
        """Serialize to dict and recreate — should produce equal objects."""
        original = RendererMetadata.model_validate(sample_renderer_data)
        dumped = original.model_dump()
        restored = RendererMetadata.model_validate(dumped)
        assert original == restored

    def test_missing_required_field(self, sample_renderer_data: dict[str, Any]) -> None:
        """Should raise ValidationError when a required field is missing."""
        del sample_renderer_data["id"]
        with pytest.raises(ValidationError):
            RendererMetadata.model_validate(sample_renderer_data)

    def test_extra_fields_ignored(self, sample_renderer_data: dict[str, Any]) -> None:
        """Should accept unknown fields without error (forward compatibility)."""
        sample_renderer_data["unknown_future_field"] = "some value"
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.id == "test-renderer"

    def test_primary_technique(self, sample_renderer_data: dict[str, Any]) -> None:
        """The primary_technique property returns the first technique."""
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.primary_technique == "path_tracing"

    def test_primary_technique_empty(self, sample_renderer_data: dict[str, Any]) -> None:
        """If technique list is empty, primary_technique should return 'unknown'."""
        sample_renderer_data["technique"] = []
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.primary_technique == "unknown"

    def test_stars_display_with_value(self, sample_renderer_data: dict[str, Any]) -> None:
        """Stars display should format with comma separators."""
        sample_renderer_data["github_stars"] = 4800
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.stars_display == "4,800"

    def test_stars_display_none(self, sample_renderer_data: dict[str, Any]) -> None:
        """Stars display should show 'N/A' when github_stars is None."""
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.stars_display == "N/A"

    def test_matches_technique(self, sample_renderer_data: dict[str, Any]) -> None:
        """Technique matching is case-insensitive."""
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.matches_technique("path_tracing")
        assert renderer.matches_technique("PATH_TRACING")
        assert not renderer.matches_technique("neural")

    def test_matches_language(self, sample_renderer_data: dict[str, Any]) -> None:
        """Language matching is a case-insensitive substring check."""
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.matches_language("c++")
        assert renderer.matches_language("C++")
        assert not renderer.matches_language("Python")

    def test_matches_status(self, sample_renderer_data: dict[str, Any]) -> None:
        """Status matching is case-insensitive."""
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.matches_status("active")
        assert renderer.matches_status("ACTIVE")
        assert not renderer.matches_status("archived")

    def test_to_summary_dict(self, sample_renderer_data: dict[str, Any]) -> None:
        """Summary dict contains the expected subset of fields."""
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        summary = renderer.to_summary_dict()
        assert summary["id"] == "test-renderer"
        assert summary["name"] == "Test Renderer"
        assert "technique" in summary
        assert "features" not in summary  # not in summary

    def test_optional_fields_default(self, sample_renderer_data: dict[str, Any]) -> None:
        """Optional fields default to None or empty collections."""
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.homepage is None
        assert renderer.documentation is None
        assert renderer.github_stars is None
        assert renderer.related == []
        assert renderer.integrations == []

    def test_features_with_null_values(self, sample_renderer_data: dict[str, Any]) -> None:
        """Features can have None values (representing N/A)."""
        sample_renderer_data["features"]["shadow_mapping"] = None
        renderer = RendererMetadata.model_validate(sample_renderer_data)
        assert renderer.features["shadow_mapping"] is None


class TestHardwareInfo:
    """Tests for the HardwareInfo model."""

    def test_valid_creation(self) -> None:
        """Create a valid HardwareInfo instance."""
        hw = HardwareInfo(
            cpu="AMD Ryzen 9 7950X",
            cpu_cores_physical=16,
            cpu_cores_logical=32,
            ram_gb=64.0,
            gpu="NVIDIA RTX 4080",
            gpu_vram_gb=16.0,
            os="Ubuntu 22.04",
            python_version="3.12.1",
        )
        assert hw.cpu == "AMD Ryzen 9 7950X"
        assert hw.gpu_vram_gb == 16.0

    def test_gpu_optional(self) -> None:
        """GPU fields are optional."""
        hw = HardwareInfo(
            cpu="Intel Core i7",
            cpu_cores_physical=8,
            cpu_cores_logical=16,
            ram_gb=32.0,
            os="Windows 11",
            python_version="3.11.0",
        )
        assert hw.gpu is None
        assert hw.gpu_vram_gb is None


class TestRenderSettings:
    """Tests for the RenderSettings model."""

    def test_defaults(self) -> None:
        """Default settings should use standard resolution."""
        settings = RenderSettings()
        assert settings.width == 1920
        assert settings.height == 1080
        assert settings.samples is None
        assert settings.gpu is False
        assert settings.extra == {}

    def test_custom_values(self) -> None:
        """Custom values should override defaults."""
        settings = RenderSettings(
            width=3840,
            height=2160,
            samples=1024,
            gpu=True,
            extra={"integrator": "volpath"},
        )
        assert settings.width == 3840
        assert settings.samples == 1024
        assert settings.extra["integrator"] == "volpath"


class TestQualityMetrics:
    """Tests for the QualityMetrics model."""

    def test_all_optional(self) -> None:
        """All fields in QualityMetrics are optional."""
        qm = QualityMetrics()
        assert qm.psnr is None
        assert qm.ssim is None
        assert qm.lpips is None

    def test_with_values(self) -> None:
        """Create with actual metric values."""
        qm = QualityMetrics(
            reference_renderer="pbrt",
            reference_samples=65536,
            psnr=42.1,
            ssim=0.9987,
            mse=0.000061,
        )
        assert qm.psnr == 42.1
        assert qm.ssim == 0.9987


class TestRenderResult:
    """Tests for the RenderResult model."""

    def test_valid_creation(self) -> None:
        """Create a valid RenderResult."""
        result = RenderResult(
            renderer="pbrt",
            scene="cornell_box",
            output_path="/tmp/render.exr",
            render_time_seconds=47.3,
            peak_memory_mb=1240.0,
            settings=RenderSettings(),
            hardware=HardwareInfo(
                cpu="Test CPU",
                cpu_cores_physical=4,
                cpu_cores_logical=8,
                ram_gb=16.0,
                os="Test OS",
                python_version="3.12.0",
            ),
            timestamp="2024-12-01T14:30:00Z",
        )
        assert result.renderer == "pbrt"
        assert result.render_time_seconds == 47.3


class TestBenchmarkResult:
    """Tests for the BenchmarkResult model."""

    def test_valid_creation(self) -> None:
        """Create a valid BenchmarkResult with all nested models."""
        hw = HardwareInfo(
            cpu="Test CPU",
            cpu_cores_physical=4,
            cpu_cores_logical=8,
            ram_gb=16.0,
            os="Test OS",
            python_version="3.12.0",
        )
        settings = RenderSettings(samples=1024)
        render_result = RenderResult(
            renderer="pbrt",
            scene="cornell_box",
            output_path="/tmp/render.exr",
            render_time_seconds=47.3,
            peak_memory_mb=1240.0,
            settings=settings,
            hardware=hw,
            timestamp="2024-12-01T14:30:00Z",
        )
        benchmark = BenchmarkResult(
            id="cornell-box-pbrt-2024-12-01",
            renderer="pbrt",
            renderer_version="4.0.0",
            scene="cornell_box",
            timestamp="2024-12-01T14:30:00Z",
            hardware=hw,
            settings=settings,
            results=render_result,
            quality_vs_reference=QualityMetrics(psnr=42.1, ssim=0.9987),
        )
        assert benchmark.id == "cornell-box-pbrt-2024-12-01"
        assert benchmark.quality_vs_reference is not None
        assert benchmark.quality_vs_reference.psnr == 42.1
