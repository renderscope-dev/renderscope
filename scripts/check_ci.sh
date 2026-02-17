#!/usr/bin/env bash
# Run all CI checks locally before pushing.
# Usage: bash scripts/check_ci.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

FAIL=0

step() {
  printf "\n${BOLD}=== %s ===${NC}\n" "$1"
}

pass() {
  printf "${GREEN}PASS${NC}: %s\n" "$1"
}

fail() {
  printf "${RED}FAIL${NC}: %s\n" "$1"
  FAIL=1
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Python ──────────────────────────────────────
step "Python: ruff check"
(cd "$ROOT/python" && ruff check .) && pass "ruff check" || fail "ruff check"

step "Python: ruff format"
(cd "$ROOT/python" && ruff format --check .) && pass "ruff format" || fail "ruff format"

step "Python: mypy"
(cd "$ROOT/python" && mypy src/renderscope) && pass "mypy" || fail "mypy"

step "Python: pytest"
(cd "$ROOT/python" && pytest --tb=short -q) && pass "pytest" || fail "pytest"

# ── Data Validation ─────────────────────────────
step "Data: validate JSON schemas"
(cd "$ROOT" && python scripts/validate_data.py) && pass "data validation" || fail "data validation"

# ── Web ─────────────────────────────────────────
step "Web: ESLint"
(cd "$ROOT/web" && npm run lint) && pass "web lint" || fail "web lint"

step "Web: TypeScript"
(cd "$ROOT/web" && npm run typecheck) && pass "web typecheck" || fail "web typecheck"

# ── npm Package ─────────────────────────────────
step "npm Package: ESLint"
(cd "$ROOT/packages/renderscope-ui" && npm run lint) && pass "npm lint" || fail "npm lint"

step "npm Package: TypeScript"
(cd "$ROOT/packages/renderscope-ui" && npm run typecheck) && pass "npm typecheck" || fail "npm typecheck"

# ── Summary ─────────────────────────────────────
echo ""
if [ "$FAIL" -eq 0 ]; then
  printf "${GREEN}${BOLD}All checks passed.${NC}\n"
else
  printf "${RED}${BOLD}Some checks failed. Fix before pushing.${NC}\n"
  exit 1
fi
