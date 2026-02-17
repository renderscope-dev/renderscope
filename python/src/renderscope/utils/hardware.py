"""Hardware detection utilities for RenderScope.

Detects CPU, GPU, RAM, and OS information. Used by the ``system-info``
CLI command and by the benchmark runner to stamp hardware context on
every benchmark result for reproducibility.
"""

from __future__ import annotations

import platform
import subprocess

import psutil

import renderscope
from renderscope.models.hardware import HardwareInfo


def _detect_cpu() -> str:
    """Detect the CPU model name.

    On Linux, ``platform.processor()`` often returns an empty string,
    so we fall back to parsing ``/proc/cpuinfo``.  On macOS we use
    ``sysctl``.  On Windows, ``platform.processor()`` usually works.
    """
    # Try platform.processor() first
    cpu = platform.processor()
    if cpu and cpu.strip() and cpu.strip() not in ("", "x86_64", "aarch64", "ARM64"):
        return cpu.strip()

    system = platform.system()

    if system == "Linux":
        try:
            with open("/proc/cpuinfo", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("model name"):
                        return line.split(":", 1)[1].strip()
        except OSError:
            pass

    if system == "Darwin":
        try:
            result = subprocess.run(
                ["sysctl", "-n", "machdep.cpu.brand_string"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except (OSError, subprocess.TimeoutExpired):
            pass

    if system == "Windows":
        try:
            result = subprocess.run(
                ["wmic", "cpu", "get", "name"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                lines = [ln.strip() for ln in result.stdout.strip().splitlines() if ln.strip()]
                if len(lines) >= 2:
                    return lines[1]
        except (OSError, subprocess.TimeoutExpired):
            pass

    # Final fallback
    return platform.machine() or "Unknown CPU"


def _detect_gpu() -> tuple[str | None, float | None]:
    """Best-effort GPU detection.

    Returns (gpu_name, vram_gb) or (None, None) if not detected.
    """
    # 1. Try nvidia-smi (NVIDIA GPUs)
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            line = result.stdout.strip().splitlines()[0]
            parts = line.split(",")
            gpu_name = parts[0].strip()
            vram_mb = float(parts[1].strip()) if len(parts) > 1 else None
            vram_gb = round(vram_mb / 1024, 1) if vram_mb else None
            return gpu_name, vram_gb
    except (OSError, subprocess.TimeoutExpired, ValueError, IndexError):
        pass

    # 2. Try PyTorch CUDA
    try:
        import torch

        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            vram_bytes = torch.cuda.get_device_properties(0).total_memory
            vram_gb = round(vram_bytes / (1024**3), 1)
            return gpu_name, vram_gb
    except (ImportError, RuntimeError):
        pass

    # 3. macOS: system_profiler
    if platform.system() == "Darwin":
        try:
            result = subprocess.run(
                ["system_profiler", "SPDisplaysDataType"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                for line in result.stdout.splitlines():
                    stripped = line.strip()
                    if stripped.startswith("Chipset Model:") or stripped.startswith("Chip:"):
                        gpu_name = stripped.split(":", 1)[1].strip()
                        return gpu_name, None
        except (OSError, subprocess.TimeoutExpired):
            pass

    # 4. Windows: wmic
    if platform.system() == "Windows":
        try:
            result = subprocess.run(
                ["wmic", "path", "win32_videocontroller", "get", "name"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                lines = [ln.strip() for ln in result.stdout.strip().splitlines() if ln.strip()]
                if len(lines) >= 2:
                    return lines[1], None
        except (OSError, subprocess.TimeoutExpired):
            pass

    return None, None


def _detect_os() -> str:
    """Detect the operating system with version information."""
    system = platform.system()

    if system == "Linux":
        # Try to get distro info from /etc/os-release
        try:
            with open("/etc/os-release", encoding="utf-8") as f:
                os_info: dict[str, str] = {}
                for line in f:
                    if "=" in line:
                        key, _, value = line.partition("=")
                        os_info[key.strip()] = value.strip().strip('"')
                pretty_name = os_info.get("PRETTY_NAME")
                if pretty_name:
                    return pretty_name
        except OSError:
            pass
        return f"Linux {platform.release()}"

    if system == "Darwin":
        mac_version = platform.mac_ver()[0]
        return f"macOS {mac_version}" if mac_version else "macOS"

    if system == "Windows":
        win_version = platform.version()
        win_release = platform.release()
        return f"Windows {win_release} ({win_version})"

    return f"{system} {platform.release()}"


def _detect_optional_deps() -> list[str]:
    """Check which optional RenderScope dependencies are installed."""
    optional: list[str] = []

    try:
        import torch  # noqa: F401

        optional.append("torch")
    except ImportError:
        pass

    try:
        import torchmetrics  # noqa: F401

        optional.append("torchmetrics")
    except ImportError:
        pass

    try:
        import matplotlib  # noqa: F401

        optional.append("matplotlib")
    except ImportError:
        pass

    try:
        import cv2  # noqa: F401

        optional.append("opencv")
    except ImportError:
        pass

    return optional


def detect_hardware() -> HardwareInfo:
    """Detect current system hardware and return a ``HardwareInfo`` model.

    All detection is best-effort.  A failure in GPU detection (common on
    CI servers and machines without discrete GPUs) will never raise — it
    simply sets the GPU fields to ``None``.
    """
    gpu_name, gpu_vram = _detect_gpu()
    ram_bytes = psutil.virtual_memory().total
    ram_gb = round(ram_bytes / (1024**3), 1)

    physical_cores = psutil.cpu_count(logical=False)
    logical_cores = psutil.cpu_count(logical=True)

    return HardwareInfo(
        cpu=_detect_cpu(),
        cpu_cores_physical=physical_cores or 1,
        cpu_cores_logical=logical_cores or 1,
        ram_gb=ram_gb,
        gpu=gpu_name,
        gpu_vram_gb=gpu_vram,
        os=_detect_os(),
        python_version=platform.python_version(),
        renderscope_version=renderscope.__version__,
        optional_deps=_detect_optional_deps(),
    )
