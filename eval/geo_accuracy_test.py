#!/usr/bin/env python3
"""
Geolocation Matching Accuracy Test — Need A Sidekick (Section 4.2)

Tests whether POST /pings correctly matches (or rejects) users based on
physical distance and activity type.

Usage:
    python eval/geo_accuracy_test.py
    BASE_URL=http://<ALB_DNS> python eval/geo_accuracy_test.py

Output:
    - Pass/fail table printed to stdout
    - results/geo_accuracy_results.json
"""

import json
import os
import sys
import time
import uuid
from pathlib import Path

import requests

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")
RESULTS_DIR = Path(os.environ.get("RESULTS_DIR", "results"))
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# Base location: Raffles Place, Singapore
BASE_LAT = 1.3521
BASE_LON = 103.8198

# Metres → degrees latitude (1 degree ≈ 111,320 m at equator)
METRES_PER_DEGREE_LAT = 111_320.0


def offset_north(lat: float, metres: float) -> float:
    """Return a latitude shifted `metres` north of `lat`."""
    return lat + (metres / METRES_PER_DEGREE_LAT)


def post_ping(user_id: str, lat: float, lon: float, activity: str, radius: int) -> dict:
    payload = {
        "user_id": user_id,
        "activity_type": activity,
        "location": {"lat": lat, "lon": lon},
        "radius_meters": radius,
        "capacity": 2,
        "message": "eval test",
    }
    resp = requests.post(f"{BASE_URL}/pings", json=payload, timeout=10)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Test case definitions
# ---------------------------------------------------------------------------
# Each entry:
#   name          — display name
#   distance_m    — offset in metres (User B placed this far north of User A)
#   radius        — radius_meters sent for BOTH pings
#   activity_a    — activity for User A
#   activity_b    — activity for User B
#   expected      — "matched" or "waiting"
#   description   — human note
# ---------------------------------------------------------------------------
TEST_CASES = [
    {
        "name": "within_5m",
        "distance_m": 5,
        "radius": 10,
        "activity_a": "chess",
        "activity_b": "chess",
        "expected": "matched",
        "description": "5 m apart, 10 m radius, same activity → should match",
    },
    {
        "name": "within_8m",
        "distance_m": 8,
        "radius": 10,
        "activity_a": "chess",
        "activity_b": "chess",
        "expected": "matched",
        "description": "8 m apart, 10 m radius, same activity → should match",
    },
    {
        "name": "boundary_10m",
        "distance_m": 10,
        "radius": 10,
        "activity_a": "chess",
        "activity_b": "chess",
        "expected": "matched",
        "description": "10 m apart, 10 m radius (boundary) → should match (≤ radius)",
    },
    {
        "name": "outside_15m",
        "distance_m": 15,
        "radius": 10,
        "activity_a": "chess",
        "activity_b": "chess",
        "expected": "waiting",
        "description": "15 m apart, 10 m radius → outside fence, should NOT match",
    },
    {
        "name": "outside_50m",
        "distance_m": 50,
        "radius": 10,
        "activity_a": "chess",
        "activity_b": "chess",
        "expected": "waiting",
        "description": "50 m apart, 10 m radius → far outside, should NOT match",
    },
    {
        "name": "radius_25m_match",
        "distance_m": 20,
        "radius": 25,
        "activity_a": "badminton",
        "activity_b": "badminton",
        "expected": "matched",
        "description": "20 m apart, 25 m radius → inside wider fence, should match",
    },
    {
        "name": "radius_50m_match",
        "distance_m": 45,
        "radius": 50,
        "activity_a": "gym_spotter",
        "activity_b": "gym_spotter",
        "expected": "matched",
        "description": "45 m apart, 50 m radius → inside wider fence, should match",
    },
    {
        "name": "diff_activity_no_match",
        "distance_m": 5,
        "radius": 10,
        "activity_a": "chess",
        "activity_b": "badminton",
        "expected": "waiting",
        "description": "5 m apart but DIFFERENT activity → must NOT cross-match",
    },
    {
        "name": "overlapping_lobby_same_activity",
        "distance_m": 3,
        "radius": 10,
        "activity_a": "table_tennis",
        "activity_b": "table_tennis",
        "expected": "matched",
        "description": "Overlapping locations, same activity → should match correct lobby",
    },
]


def run_test(case: dict) -> dict:
    """
    Run a single test case. Returns a result dict with pass/fail and details.
    """
    # Unique suffix so parallel runs don't share lobbies
    suffix = uuid.uuid4().hex[:8]
    user_a = f"geo-a-{case['name']}-{suffix}"
    user_b = f"geo-b-{case['name']}-{suffix}"

    # Each test case uses a unique longitude offset so lobbies never collide
    # across different test cases running sequentially.
    lon_offset = TEST_CASES.index(case) * 0.001  # ~111m east per case

    lat_a = BASE_LAT
    lon_a = BASE_LON + lon_offset
    lat_b = offset_north(lat_a, case["distance_m"])
    lon_b = lon_a

    result = {
        "name": case["name"],
        "description": case["description"],
        "distance_m": case["distance_m"],
        "radius": case["radius"],
        "activity_a": case["activity_a"],
        "activity_b": case["activity_b"],
        "expected": case["expected"],
        "actual_a": None,
        "actual_b": None,
        "passed": False,
        "error": None,
    }

    try:
        # User A posts first — should always be "waiting" (no one else there)
        resp_a = post_ping(user_a, lat_a, lon_a, case["activity_a"], case["radius"])
        result["actual_a"] = resp_a.get("status")

        # Small gap to avoid any race within the same process
        time.sleep(0.1)

        # User B posts — this is the decisive request
        resp_b = post_ping(user_b, lat_b, lon_b, case["activity_b"], case["radius"])
        result["actual_b"] = resp_b.get("status")

        result["passed"] = result["actual_b"] == case["expected"]

    except requests.HTTPError as exc:
        result["error"] = f"HTTP {exc.response.status_code}: {exc.response.text[:200]}"
    except Exception as exc:
        result["error"] = str(exc)

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(f"\nGeolocation Accuracy Test — {BASE_URL}")
    print("=" * 72)

    results = []
    passed = 0
    failed = 0

    for case in TEST_CASES:
        result = run_test(case)
        results.append(result)

        status_icon = "PASS" if result["passed"] else "FAIL"
        if result["error"]:
            status_icon = "ERR "

        actual = result["actual_b"] if result["error"] is None else result["error"]
        print(
            f"[{status_icon}] {result['name']:<30} "
            f"expected={result['expected']:<8} actual={actual}"
        )

        if result["passed"]:
            passed += 1
        else:
            failed += 1

    print("=" * 72)
    print(f"Results: {passed} passed, {failed} failed out of {len(TEST_CASES)} tests\n")

    # Precision / Recall for "should match" cases
    true_pos  = sum(1 for r in results if r["expected"] == "matched" and r["actual_b"] == "matched")
    false_neg = sum(1 for r in results if r["expected"] == "matched" and r["actual_b"] != "matched" and not r["error"])
    false_pos = sum(1 for r in results if r["expected"] == "waiting" and r["actual_b"] == "matched")
    true_neg  = sum(1 for r in results if r["expected"] == "waiting" and r["actual_b"] == "waiting")

    total_pos = true_pos + false_neg
    total_neg = true_neg + false_pos

    precision = true_pos / (true_pos + false_pos) if (true_pos + false_pos) > 0 else float("nan")
    recall    = true_pos / total_pos if total_pos > 0 else float("nan")

    print(f"Precision : {precision:.2%}  (of predicted matches, how many were correct)")
    print(f"Recall    : {recall:.2%}  (of actual matches, how many were detected)")
    print(f"True  pos : {true_pos}/{total_pos}  |  False pos : {false_pos}/{total_neg}")

    # Save to JSON
    output = {
        "base_url": BASE_URL,
        "summary": {
            "passed": passed,
            "failed": failed,
            "total": len(TEST_CASES),
            "precision": precision,
            "recall": recall,
        },
        "cases": results,
    }

    out_path = RESULTS_DIR / "geo_accuracy_results.json"
    out_path.write_text(json.dumps(output, indent=2))
    print(f"\nSaved: {out_path}")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
