#!/usr/bin/env bash
#
# Creates standard GitHub labels for the RenderScope repository.
# Requires: GitHub CLI (gh) authenticated with repo access.
#
# Usage: ./scripts/setup_github_labels.sh owner/repo
# Example: ./scripts/setup_github_labels.sh renderscope-dev/renderscope

set -euo pipefail

REPO="${1:-}"

if [ -z "$REPO" ]; then
  echo "Usage: ./scripts/setup_github_labels.sh owner/repo"
  echo "Example: ./scripts/setup_github_labels.sh renderscope-dev/renderscope"
  exit 1
fi

echo "Setting up labels for $REPO..."

# Function to create or update a label
create_label() {
  local name="$1"
  local color="$2"
  local description="$3"

  if gh label create "$name" --repo "$REPO" --color "$color" --description "$description" 2>/dev/null; then
    echo "  Created: $name"
  else
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$description" 2>/dev/null
    echo "  Updated: $name"
  fi
}

echo ""
echo "=== Type Labels ==="
create_label "bug"                "d73a4a"  "Something isn't working"
create_label "feature"            "a2eeef"  "New feature or enhancement"
create_label "renderer-data"      "0075ca"  "Adding or updating renderer data"
create_label "benchmark"          "5319e7"  "Benchmark data or methodology"
create_label "documentation"      "0075ca"  "Documentation improvements"

echo ""
echo "=== Package Labels ==="
create_label "web"                "1d76db"  "Web app (Next.js)"
create_label "python"             "3572A5"  "Python CLI/library"
create_label "npm"                "f9d0c4"  "npm component package"

echo ""
echo "=== Priority Labels ==="
create_label "P0-critical"        "b60205"  "Critical — must fix immediately"
create_label "P1-high"            "d93f0b"  "High priority"
create_label "P2-medium"          "fbca04"  "Medium priority"
create_label "P3-low"             "0e8a16"  "Low priority — nice to have"

echo ""
echo "=== Status Labels ==="
create_label "triage"             "ededed"  "Needs triage — not yet categorized"
create_label "good first issue"   "7057ff"  "Good for newcomers"
create_label "help wanted"        "008672"  "Extra attention is needed"
create_label "wontfix"            "ffffff"  "This will not be worked on"
create_label "duplicate"          "cfd3d7"  "This issue or pull request already exists"

echo ""
echo "All labels created successfully!"
