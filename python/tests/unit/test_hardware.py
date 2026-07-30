"""Tests for hardware detection utilities."""

from __future__ import annotations

from typing import Any

import pytest

from renderscope.models.hardware import HardwareInfo
from renderscope.utils.hardware import _detect_cpu, _is_architecture_name, detect_hardware


class TestDetectHardware:
    """Tests for detect_hardware()."""

    def test_returns_hardware_info(self) -> None:
        """detect_hardware() should return a HardwareInfo instance."""
        hw = detect_hardware()
        assert isinstance(hw, HardwareInfo)

    def test_cpu_non_empty(self) -> None:
        """CPU field should be a non-empty string."""
        hw = detect_hardware()
        assert isinstance(hw.cpu, str)
        assert len(hw.cpu) > 0

    def test_ram_positive(self) -> None:
        """RAM should be positive."""
        hw = detect_hardware()
        assert hw.ram_gb > 0

    def test_os_non_empty(self) -> None:
        """OS field should be non-empty."""
        hw = detect_hardware()
        assert isinstance(hw.os, str)
        assert len(hw.os) > 0

    def test_python_version_present(self) -> None:
        """Python version should be present."""
        hw = detect_hardware()
        assert hw.python_version is not None
        assert len(hw.python_version) > 0

    def test_gpu_returns_string_or_none(self) -> None:
        """GPU should be a string or None -- never crashes."""
        hw = detect_hardware()
        assert hw.gpu is None or isinstance(hw.gpu, str)

    def test_cores_positive(self) -> None:
        """CPU core counts should be positive."""
        hw = detect_hardware()
        assert hw.cpu_cores_physical >= 1
        assert hw.cpu_cores_logical >= 1


class TestArchitectureNameDetection:
    """`platform.processor()` returns an architecture on several platforms.

    Benchmark records are stamped with the detected CPU and grouped by it in the
    dashboard's hardware filter, so an architecture must not be accepted as a
    chip name — "arm" identifies a machine no better than "a computer" does.
    """

    @pytest.mark.parametrize(
        "value", ["arm", "arm64", "aarch64", "x86_64", "amd64", "i386", "i686", "x86", "  ARM  "]
    )
    def test_recognizes_architecture_strings(self, value: str) -> None:
        assert _is_architecture_name(value) is True

    @pytest.mark.parametrize(
        "value",
        [
            "Apple M5 Max",
            "AMD Ryzen 9 7950X",
            "Intel(R) Core(TM) i9-13900K",
            "ARMv8 Neoverse-N1",
        ],
    )
    def test_accepts_real_cpu_models(self, value: str) -> None:
        assert _is_architecture_name(value) is False

    def test_falls_through_to_platform_probes_for_architectures(self, monkeypatch: Any) -> None:
        """Apple Silicon reports "arm"; detection must not stop there."""
        import renderscope.utils.hardware as hardware_module

        monkeypatch.setattr(hardware_module.platform, "processor", lambda: "arm")
        monkeypatch.setattr(hardware_module.platform, "system", lambda: "Darwin")
        monkeypatch.setattr(hardware_module.platform, "machine", lambda: "arm64")

        class _Completed:
            returncode = 0
            stdout = "Apple M5 Max\n"

        monkeypatch.setattr(hardware_module.subprocess, "run", lambda *a, **k: _Completed())

        assert _detect_cpu() == "Apple M5 Max"

    def test_keeps_a_real_model_string_without_probing(self, monkeypatch: Any) -> None:
        import renderscope.utils.hardware as hardware_module

        monkeypatch.setattr(hardware_module.platform, "processor", lambda: "AMD Ryzen 9 7950X")

        def _fail(*args: Any, **kwargs: Any) -> None:
            raise AssertionError("platform probes should not run for a real CPU model")

        monkeypatch.setattr(hardware_module.subprocess, "run", _fail)

        assert _detect_cpu() == "AMD Ryzen 9 7950X"

    def test_never_returns_an_empty_string(self, monkeypatch: Any) -> None:
        import renderscope.utils.hardware as hardware_module

        monkeypatch.setattr(hardware_module.platform, "processor", lambda: "")
        monkeypatch.setattr(hardware_module.platform, "system", lambda: "Unknown")
        monkeypatch.setattr(hardware_module.platform, "machine", lambda: "")

        assert _detect_cpu() == "Unknown CPU"
