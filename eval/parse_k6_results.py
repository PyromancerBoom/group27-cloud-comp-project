#!/usr/bin/env python3
"""
k6 Results Parser — Need A Sidekick (Section 4.1)

Parses the JSON output produced by:
    k6 run --out json=results/load_test_output.json load-tests/full_load_test.js

Generates:
    results/latency_chart.png    — p50/p95/p99 vs concurrency for REST endpoints
    results/e2e_latency_chart.png — end-to-end match latency distribution
    results/latency_table.txt    — plain-text summary table

k6 JSON line format:
    {"type":"Point","metric":"http_req_duration",
     "data":{"time":"2026-04-12T10:05:00Z","value":23.4,
             "tags":{"scenario":"rest_api","name":"POST /pings"}}}

Usage:
    python eval/parse_k6_results.py
    INPUT=results/load_test_output.json python eval/parse_k6_results.py
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

INPUT_FILE  = Path(os.environ.get("INPUT", "results/load_test_output.json"))
RESULTS_DIR = Path(os.environ.get("RESULTS_DIR", "results"))
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# Approximate VU plateau midpoints (seconds from test start).
# Must match the stage durations in full_load_test.js:
#   0–20s ramp to 100, 20–80s plateau @ 100
#   80–100s ramp to 500, 100–160s plateau @ 500
#   160–180s ramp to 1000, 180–240s plateau @ 1000
#   240–260s ramp to 2000, 260–320s plateau @ 2000
VU_PLATEAUS = [
    (100,  20,  80),   # (vu_label, stage_start_s, stage_end_s)
    (500,  100, 160),
    (1000, 180, 240),
    (2000, 260, 320),
]

ENDPOINT_NAMES = {
    "POST /pings":      "POST /pings",
    "GET /pings/nearby": "GET /pings/nearby",
}


def load_points(path: Path) -> list[dict]:
    """Load all k6 Point entries from a JSON-lines file."""
    points = []
    errors = 0
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                errors += 1
                continue
            if obj.get("type") == "Point":
                points.append(obj)
    if errors:
        print(f"Warning: skipped {errors} malformed lines in {path}", file=sys.stderr)
    return points


import re as _re
_FRAC_RE = _re.compile(r"(\.\d+)")

def epoch(iso: str) -> float:
    """ISO8601 string → Unix timestamp (float).
    Handles k6 timestamps that have 1-9 fractional-second digits by
    normalising to exactly 6 (microseconds), which Python always accepts."""
    iso = iso.replace("Z", "+00:00")
    def _pad6(m):
        frac = m.group(1)          # e.g. ".32621" or ".996727304"
        digits = frac[1:]          # strip the leading dot
        normalised = (digits + "000000")[:6]
        return "." + normalised
    iso = _FRAC_RE.sub(_pad6, iso)
    return datetime.fromisoformat(iso).timestamp()


def percentile(values: list[float], p: float) -> float:
    return float(np.percentile(values, p)) if values else float("nan")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not INPUT_FILE.exists():
        print(f"Error: {INPUT_FILE} not found. Run the k6 test first.", file=sys.stderr)
        sys.exit(1)

    print(f"Loading {INPUT_FILE} …", end=" ", flush=True)
    points = load_points(INPUT_FILE)
    print(f"{len(points):,} points loaded")

    # Separate by metric
    http_points    = [p for p in points if p["metric"] == "http_req_duration"]
    e2e_points     = [p for p in points if p["metric"] == "e2e_match_latency_ms"]
    ws_points      = [p for p in points if p["metric"] == "ws_connecting"]

    # Find test start time (earliest http point)
    all_times = [epoch(p["data"]["time"]) for p in http_points]
    if not all_times:
        print("Error: no http_req_duration data found.", file=sys.stderr)
        sys.exit(1)
    t0 = min(all_times)

    # -----------------------------------------------------------------------
    # Build latency table: for each (endpoint, VU level) → p50/p95/p99
    # -----------------------------------------------------------------------
    table: dict[str, dict[int, dict]] = defaultdict(dict)  # endpoint → vu → stats

    for vu_label, stage_start, stage_end in VU_PLATEAUS:
        window_start = t0 + stage_start
        window_end   = t0 + stage_end

        for ep_tag, ep_label in ENDPOINT_NAMES.items():
            bucket = [
                p["data"]["value"]
                for p in http_points
                if p["data"]["tags"].get("name") == ep_tag
                and window_start <= epoch(p["data"]["time"]) <= window_end
            ]
            table[ep_label][vu_label] = {
                "n":   len(bucket),
                "p50": percentile(bucket, 50),
                "p95": percentile(bucket, 95),
                "p99": percentile(bucket, 99),
            }

    # Print table
    header = f"\n{'Endpoint':<22} {'VUs':>6}  {'n':>6}  {'p50 ms':>8}  {'p95 ms':>8}  {'p99 ms':>8}"
    print(header)
    print("-" * len(header))
    lines = [header, "-" * len(header)]

    for ep_label in ENDPOINT_NAMES.values():
        for vu_label, _, _ in VU_PLATEAUS:
            stats = table[ep_label].get(vu_label, {})
            row = (
                f"{ep_label:<22} {vu_label:>6}  "
                f"{stats.get('n', 0):>6}  "
                f"{stats.get('p50', float('nan')):>8.1f}  "
                f"{stats.get('p95', float('nan')):>8.1f}  "
                f"{stats.get('p99', float('nan')):>8.1f}"
            )
            print(row)
            lines.append(row)

    # WebSocket connection time
    ws_vals = [p["data"]["value"] for p in ws_points]
    if ws_vals:
        ws_row = (
            f"\n{'WS connect':<22} {'all':>6}  "
            f"{len(ws_vals):>6}  "
            f"{percentile(ws_vals, 50):>8.1f}  "
            f"{percentile(ws_vals, 95):>8.1f}  "
            f"{percentile(ws_vals, 99):>8.1f}"
        )
        print(ws_row)
        lines.append(ws_row)

    # E2E match latency summary
    e2e_vals = [p["data"]["value"] for p in e2e_points]
    if e2e_vals:
        e2e_row = (
            f"\n{'E2E match':<22} {'all':>6}  "
            f"{len(e2e_vals):>6}  "
            f"{percentile(e2e_vals, 50):>8.1f}  "
            f"{percentile(e2e_vals, 95):>8.1f}  "
            f"{percentile(e2e_vals, 99):>8.1f}"
        )
        print(e2e_row)
        lines.append(e2e_row)

    table_path = RESULTS_DIR / "latency_table.txt"
    table_path.write_text("\n".join(lines))
    print(f"\nSaved table → {table_path}")

    # -----------------------------------------------------------------------
    # Chart 1: REST API latency vs concurrency (line chart)
    # -----------------------------------------------------------------------
    vu_levels = [vu for vu, _, _ in VU_PLATEAUS]
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fig.suptitle("REST API Latency vs Concurrency", fontsize=13)

    colors = {"p50": "steelblue", "p95": "darkorange", "p99": "firebrick"}
    markers = {"p50": "o", "p95": "s", "p99": "^"}

    for idx, ep_label in enumerate(ENDPOINT_NAMES.values()):
        ax = axes[idx]
        for pct in ("p50", "p95", "p99"):
            vals = [table[ep_label].get(vu, {}).get(pct, float("nan")) for vu in vu_levels]
            ax.plot(vu_levels, vals, label=pct, color=colors[pct],
                    marker=markers[pct], linewidth=2, markersize=6)

        ax.axhline(y=200, color="grey", linestyle="--", linewidth=1, label="200ms target")
        ax.set_title(ep_label, fontsize=11)
        ax.set_xlabel("Concurrent Users (VUs)")
        ax.set_ylabel("Latency (ms)")
        ax.set_xscale("log")
        ax.set_xticks(vu_levels)
        ax.get_xaxis().set_major_formatter(plt.ScalarFormatter())
        ax.grid(True, linestyle="--", alpha=0.4)
        ax.legend(fontsize=9)

    plt.tight_layout()
    latency_path = RESULTS_DIR / "latency_chart.png"
    fig.savefig(latency_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved chart → {latency_path}")

    # -----------------------------------------------------------------------
    # Chart 2: E2E match latency distribution (bar chart of percentiles)
    # -----------------------------------------------------------------------
    if e2e_vals:
        fig2, ax2 = plt.subplots(figsize=(7, 5))
        pcts     = [50, 75, 90, 95, 99]
        pct_vals = [percentile(e2e_vals, p) for p in pcts]
        bars = ax2.bar([f"p{p}" for p in pcts], pct_vals, color="mediumseagreen",
                       edgecolor="white", linewidth=0.5)
        ax2.axhline(y=500, color="firebrick", linestyle="--", linewidth=1.5,
                    label="500ms target")
        ax2.bar_label(bars, fmt="%.0f ms", padding=3, fontsize=9)
        ax2.set_title("End-to-End Match Notification Latency\n(POST → WS match_formed)", fontsize=11)
        ax2.set_ylabel("Latency (ms)")
        ax2.set_xlabel("Percentile")
        ax2.grid(True, axis="y", linestyle="--", alpha=0.4)
        ax2.legend(fontsize=9)
        plt.tight_layout()
        e2e_path = RESULTS_DIR / "e2e_latency_chart.png"
        fig2.savefig(e2e_path, dpi=150, bbox_inches="tight")
        plt.close(fig2)
        print(f"Saved chart → {e2e_path}")
    else:
        print("No e2e_match_latency_ms data found — skipping e2e chart.")


if __name__ == "__main__":
    main()
