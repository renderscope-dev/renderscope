"""Tests for hardware detection utilities."""

from __future__ import annotations

from renderscope.models.hardware import HardwareInfo
from renderscope.utils.hardware import detect_hardware


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
