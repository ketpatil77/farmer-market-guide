#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PRODUCTION_TARGETS=(
  "index.html"
  "farmer-dashboard.html"
  "buyer-dashboard.html"
  "middleman-dashboard.html"
  "scripts/dataManager.js"
  "scripts/searchUI.js"
  "scripts/uiEnhancements.js"
  "scripts/farmer.js"
  "scripts/buyer.js"
  "scripts/middleman.js"
)

fail=0

run_check() {
  local title="$1"
  local pattern="$2"
  shift 2
  local files=("$@")

  if rg -n "$pattern" "${files[@]}" >/tmp/ui_gate_match.txt; then
    echo "[FAIL] $title"
    cat /tmp/ui_gate_match.txt
    fail=1
  else
    echo "[OK] $title"
  fi
}

echo "Running UI quality gate..."

run_check "No inline DOM event handlers in production surfaces" "onclick=|onmouseover=|onmouseout=|onerror=" "${PRODUCTION_TARGETS[@]}"
run_check "No blocking confirm/prompt dialogs in production flows" "confirm\\(|prompt\\(" "${PRODUCTION_TARGETS[@]}"
run_check "No references to archived CSS/JS assets in production entry points" "styles/buyer\\.css|styles/middleman\\.css|scripts/uiUtils\\.js" "index.html" "farmer-dashboard.html" "buyer-dashboard.html" "middleman-dashboard.html"
run_check "No sticky UI positioning in primary styles" "position:\\s*sticky" "styles/main.css" "styles/farmer-dashboard.css" "styles/buyer-dashboard.css" "styles/middleman-dashboard.css"
run_check "Legacy section actions menu removed" "section-actions|icon-btn|Reset Layout|Copy Link" "scripts/uiEnhancements.js" "styles/main.css"

echo "Checking dashboard duplicate ids..."
for dashboard in farmer-dashboard.html buyer-dashboard.html middleman-dashboard.html; do
  duplicates="$(rg -o 'id=\"[^\"]+\"' "$dashboard" | sed 's/id=\"//;s/\"$//' | sort | uniq -d)"
  if [[ -n "$duplicates" ]]; then
    echo "[FAIL] Duplicate id values in $dashboard"
    echo "$duplicates"
    fail=1
  else
    echo "[OK] No duplicate ids in $dashboard"
  fi
done

echo "Checking dev-only gating for demo tools..."
for dashboard in farmer-dashboard.html buyer-dashboard.html middleman-dashboard.html; do
  if rg -n "data-feature-flag=\"UI_DEV_MODE\"" "$dashboard" >/dev/null; then
    echo "[OK] UI_DEV_MODE gating present in $dashboard"
  else
    echo "[FAIL] Missing UI_DEV_MODE gating marker in $dashboard"
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "UI quality gate failed."
  exit 1
fi

echo "UI quality gate passed."
