#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# run_evaluation.sh — Full Evaluation Runner for Need A Sidekick
#
# Runs all evaluation scripts in order and deposits artefacts in results/.
#
# Required env vars:
#   API_URL   — e.g. http://<ALB_DNS>
#   WS_URL    — e.g. ws://<ALB_DNS>
#   BASE_URL  — same host as API_URL (used by geo accuracy test)
#
# Optional:
#   MAX_VUS      — cap on k6 VUs (default 2000; use 100 for quick smoke test)
#   ASG_NAME     — Auto Scaling Group name (required for section 4.3)
#   ALB_NAME     — ALB CloudWatch dimension, e.g. "app/name/id" (for 4.3)
#   AWS_REGION   — default ap-southeast-1
#
# Usage:
#   export API_URL=http://<ALB_DNS>
#   export WS_URL=ws://<ALB_DNS>
#   export BASE_URL=$API_URL
#   export ASG_NAME=need-a-sidekick-asg
#   export ALB_NAME="app/need-a-sidekick-alb/0123456789abcdef"
#   bash eval/run_evaluation.sh
# ---------------------------------------------------------------------------

set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
WS_URL="${WS_URL:-ws://localhost:8000}"
BASE_URL="${BASE_URL:-$API_URL}"
MAX_VUS="${MAX_VUS:-2000}"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
RESULTS_DIR="${RESULTS_DIR:-results}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"
mkdir -p "$RESULTS_DIR"

echo "=================================================="
echo " Need A Sidekick — Evaluation Suite"
echo " API_URL : $API_URL"
echo " MAX_VUS : $MAX_VUS"
echo " Results : $PROJECT_ROOT/$RESULTS_DIR/"
echo "=================================================="

# ---------------------------------------------------------------------------
# 0. Install Python deps
# ---------------------------------------------------------------------------
echo ""
echo "[0/4] Installing Python dependencies..."
pip install -q -r eval/requirements.txt

# ---------------------------------------------------------------------------
# 1. Health check
# ---------------------------------------------------------------------------
echo ""
echo "[1/4] Health check..."
status=$(curl -sf "$API_URL/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "unreachable")
if [ "$status" != "ok" ]; then
  echo "ERROR: API health check failed (got '$status'). Is the service running at $API_URL?"
  exit 1
fi
echo "       OK — service is healthy"

# ---------------------------------------------------------------------------
# 2. Geolocation accuracy test (Section 4.2)
# ---------------------------------------------------------------------------
echo ""
echo "[2/4] Section 4.2 — Geolocation Matching Accuracy..."
BASE_URL="$BASE_URL" RESULTS_DIR="$RESULTS_DIR" python3 eval/geo_accuracy_test.py
echo "       Done → $RESULTS_DIR/geo_accuracy_results.json"

# ---------------------------------------------------------------------------
# 3. k6 load test (Section 4.1)
# ---------------------------------------------------------------------------
echo ""
echo "[3/4] Section 4.1 — Load Test (MAX_VUS=$MAX_VUS, this takes ~7 minutes)..."

if ! command -v k6 &>/dev/null; then
  echo "ERROR: k6 is not installed. Install from https://k6.io/docs/get-started/installation/"
  exit 1
fi

API_URL="$API_URL" WS_URL="$WS_URL" MAX_VUS="$MAX_VUS" \
  k6 run --out "json=$RESULTS_DIR/load_test_output.json" load-tests/full_load_test.js

echo "       Done → $RESULTS_DIR/load_test_output.json"

# Parse k6 results and generate charts
echo ""
echo "       Parsing k6 results and generating charts..."
INPUT="$RESULTS_DIR/load_test_output.json" RESULTS_DIR="$RESULTS_DIR" python3 eval/parse_k6_results.py
echo "       Done → $RESULTS_DIR/latency_chart.png, $RESULTS_DIR/e2e_latency_chart.png"

# ---------------------------------------------------------------------------
# 4. Auto-scaling metrics (Section 4.3) — only if ASG_NAME is set
# ---------------------------------------------------------------------------
echo ""
if [ -z "${ASG_NAME:-}" ] || [ -z "${ALB_NAME:-}" ]; then
  echo "[4/4] Section 4.3 — Skipped (set ASG_NAME and ALB_NAME to enable)"
  echo "       To run manually:"
  echo "         python3 eval/autoscale_monitor.py --asg-name <name> --alb-name <app/name/id>"
  echo "         python3 eval/autoscale_monitor.py --discover   # to find names"
else
  echo "[4/4] Section 4.3 — Auto-Scaling CloudWatch Metrics..."
  python3 eval/autoscale_monitor.py \
    --asg-name "$ASG_NAME" \
    --alb-name "$ALB_NAME" \
    --region "$AWS_REGION" \
    --start-time "now-3h" \
    --output-dir "$RESULTS_DIR"
  echo "       Done → $RESULTS_DIR/autoscale_chart.png"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=================================================="
echo " Evaluation complete. Artefacts in $RESULTS_DIR/:"
ls -1 "$RESULTS_DIR/" 2>/dev/null | sed 's/^/   /'
echo "=================================================="
