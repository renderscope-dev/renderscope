#!/usr/bin/env bash
# test_wheel_install.sh — Build and validate the renderscope Python package
# Mimics what the CI publish workflow does, but locally.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PYTHON_DIR="$REPO_ROOT/python"
TEST_VENV="/tmp/renderscope-wheel-test-$$"

RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

pass() { echo -e "  ${GREEN}PASS${RESET} $1"; }
fail() { echo -e "  ${RED}FAIL${RESET} $1"; exit 1; }

cleanup() {
    echo ""
    echo "Cleaning up..."
    rm -rf "$TEST_VENV"
}
trap cleanup EXIT

echo -e "${BOLD}=== RenderScope Wheel Validation ===${RESET}"
echo ""

# ── Step 1: Build ────────────────────────────────────────────────────
echo -e "${BOLD}[1/4] Building package${RESET}"
cd "$PYTHON_DIR"
rm -rf dist/ build/ src/*.egg-info
python -m build --wheel
python -m build --sdist
pass "python -m build"

# ── Step 2: Validate ────────────────────────────────────────────────
echo -e "${BOLD}[2/4] Validating distributions${RESET}"
twine check dist/*
pass "twine check"

# ── Step 3: Install in fresh venv ────────────────────────────────────
echo -e "${BOLD}[3/4] Installing in fresh virtual environment${RESET}"
python -m venv "$TEST_VENV"
source "$TEST_VENV/bin/activate"
pip install --quiet dist/renderscope-*.whl
pass "pip install wheel"

# ── Step 4: Smoke tests ─────────────────────────────────────────────
echo -e "${BOLD}[4/4] Running smoke tests${RESET}"

renderscope --help > /dev/null 2>&1 && pass "renderscope --help" || fail "renderscope --help"
renderscope list > /dev/null 2>&1 && pass "renderscope list" || fail "renderscope list"
renderscope system-info > /dev/null 2>&1 && pass "renderscope system-info" || fail "renderscope system-info"
renderscope compare --help > /dev/null 2>&1 && pass "renderscope compare --help" || fail "renderscope compare --help"
renderscope benchmark --help > /dev/null 2>&1 && pass "renderscope benchmark --help" || fail "renderscope benchmark --help"
renderscope report --help > /dev/null 2>&1 && pass "renderscope report --help" || fail "renderscope report --help"
renderscope publish --help > /dev/null 2>&1 && pass "renderscope publish --help" || fail "renderscope publish --help"
renderscope download-scenes --help > /dev/null 2>&1 && pass "renderscope download-scenes --help" || fail "renderscope download-scenes --help"

# The wheel must carry the published JSON Schema, not rely on a monorepo checkout —
# `renderscope publish` validates its own output against it before writing.
python -c "
from renderscope.report.schema import load_benchmark_schema
schema = load_benchmark_schema()
assert schema['title'] == 'RenderScope Benchmark Result', schema.get('title')
" > /dev/null 2>&1 && pass "bundled benchmark schema loads" || fail "bundled benchmark schema loads"

python -c "import renderscope; print(f'  Version: {renderscope.__version__}')" || fail "import renderscope"
pass "import renderscope"

python -c "from renderscope.core.metrics import ImageMetrics; print('  Metrics: OK')" || fail "import ImageMetrics"
pass "import ImageMetrics"

python -c "from renderscope.report.html_report import HTMLReportGenerator; print('  Report: OK')" || fail "import HTMLReportGenerator"
pass "import HTMLReportGenerator"

python -c "from renderscope.core.data_loader import load_all_renderers; r = load_all_renderers(); print(f'  Bundled renderers: {len(r)}'); assert len(r) > 0" || fail "bundled data check"
pass "bundled renderer data accessible"

python -c "from renderscope.adapters.base import RendererAdapter; from renderscope.core.registry import registry; print(f'  Adapters: {len(registry.list_all())}')" || fail "adapter registry"
pass "adapter registry"

deactivate

echo ""
echo -e "${GREEN}${BOLD}All checks passed.${RESET} Package is ready for publishing."
