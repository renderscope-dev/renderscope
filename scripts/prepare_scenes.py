#!/usr/bin/env python3
"""
RenderScope Scene Preparation Pipeline

Convenience wrapper that runs the full scene pipeline:
  1. Acquire scenes (download from official sources)
  2. Convert formats (automated where possible)
  3. Validate metadata (JSON schema + consistency checks)

Usage:
    python scripts/prepare_scenes.py                 # Full pipeline
    python scripts/prepare_scenes.py --skip-convert  # Download + validate only
    python scripts/prepare_scenes.py --validate-only # Just validate
    python scripts/prepare_scenes.py --dry-run       # Preview all steps

Exit codes:
    0 = All steps succeeded
    1 = One or more steps failed
"""

from __future__ import annotations

import argparse
import io
import subprocess
import sys
import time
from pathlib import Path

# Ensure stdout can handle unicode on Windows
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(
        sys.stdout.buffer, encoding="utf-8", errors="replace"
    )

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"

_USE_COLOR = sys.stdout.isatty()


def _bold(text: str) -> str:
    return f"\033[1m{text}\033[0m" if _USE_COLOR else text


def _green(text: str) -> str:
    return f"\033[32m{text}\033[0m" if _USE_COLOR else text


def _red(text: str) -> str:
    return f"\033[31m{text}\033[0m" if _USE_COLOR else text


def _dim(text: str) -> str:
    return f"\033[2m{text}\033[0m" if _USE_COLOR else text


def run_step(
    name: str,
    script: str,
    extra_args: list[str],
    dry_run: bool,
) -> bool:
    """Run a pipeline step as a subprocess.

    Returns True on success, False on failure.
    """
    script_path = SCRIPTS_DIR / script

    if not script_path.exists():
        print(f"  {_red('[ERROR]')} Script not found: {script_path}")
        return False

    cmd = [sys.executable, str(script_path)] + extra_args
    if dry_run:
        cmd.append("--dry-run")

    print(f"\n{_bold(f'Step: {name}')}")
    print(_dim(f"  Running: {' '.join(cmd)}"))
    print()

    start = time.monotonic()

    try:
        result = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            timeout=1800,  # 30-minute timeout for large downloads
        )
        elapsed = time.monotonic() - start

        if result.returncode == 0:
            print(f"\n  {_green('[OK]')} {name} completed in {elapsed:.1f}s")
            return True
        else:
            print(f"\n  {_red('[FAIL]')} {name} failed (exit code {result.returncode})")
            return False

    except subprocess.TimeoutExpired:
        print(f"\n  {_red('[FAIL]')} {name} timed out after 30 minutes")
        return False
    except FileNotFoundError:
        print(f"\n  {_red('[ERROR]')} Python interpreter not found: {sys.executable}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the full scene preparation pipeline.",
    )
    parser.add_argument(
        "--skip-convert",
        action="store_true",
        help="Skip the format conversion step (download + validate only).",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Only run validation (no downloads or conversions).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what each step would do without executing.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Pass --verbose to each step.",
    )

    args = parser.parse_args()

    print(_bold("\nRenderScope Scene Preparation Pipeline"))
    print(_dim("=" * 50))

    steps_run = 0
    steps_passed = 0
    steps_failed = 0

    verbose_args = ["--verbose"] if args.verbose else []

    # Step 1: Acquire scenes
    if not args.validate_only:
        steps_run += 1
        success = run_step(
            name="Acquire Scenes",
            script="acquire_scenes.py",
            extra_args=verbose_args,
            dry_run=args.dry_run,
        )
        if success:
            steps_passed += 1
        else:
            steps_failed += 1

    # Step 2: Convert formats
    if not args.validate_only and not args.skip_convert:
        steps_run += 1
        success = run_step(
            name="Convert Formats",
            script="convert_scenes.py",
            extra_args=verbose_args,
            dry_run=args.dry_run,
        )
        if success:
            steps_passed += 1
        else:
            steps_failed += 1
            # Conversion failures are non-fatal — many require manual work

    # Step 3: Validate scene metadata
    steps_run += 1
    success = run_step(
        name="Validate Scene Metadata",
        script="validate_scenes.py",
        extra_args=verbose_args,
        dry_run=args.dry_run,
    )
    if success:
        steps_passed += 1
    else:
        steps_failed += 1

    # Step 4: Also run the main data validator for completeness
    steps_run += 1
    success = run_step(
        name="Validate All Data (Full)",
        script="validate_data.py",
        extra_args=verbose_args,
        dry_run=args.dry_run,
    )
    if success:
        steps_passed += 1
    else:
        steps_failed += 1

    # Summary
    print(_dim("\n" + "=" * 50))
    print(_bold("\nPipeline Summary"))
    print(f"  Steps run:    {steps_run}")
    print(f"  Succeeded:    {_green(str(steps_passed))}")
    if steps_failed:
        print(f"  Failed:       {_red(str(steps_failed))}")

    if steps_failed > 0:
        print(_red("\nPipeline completed with failures."))
        return 1

    print(_green("\nAll steps completed successfully."))
    return 0


if __name__ == "__main__":
    sys.exit(main())
