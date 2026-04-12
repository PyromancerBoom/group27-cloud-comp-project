/**
 * k6 Full Evaluation Load Test — Need A Sidekick
 *
 * Covers evaluation sections 4.1 (REST latency, WS connect time, e2e match latency)
 *
 * Run against AWS:
 *   API_URL=http://<ALB_DNS> WS_URL=ws://<ALB_DNS> \
 *     k6 run --out json=results/load_test_output.json load-tests/full_load_test.js
 *
 * Quick local run (100 VU cap):
 *   k6 run load-tests/full_load_test.js
 *
 * Override max VUs:
 *   MAX_VUS=500 k6 run --out json=results/load_test_output.json load-tests/full_load_test.js
 */
import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE_URL = __ENV.API_URL || "http://localhost:8000";
const WS_URL   = __ENV.WS_URL  || "ws://localhost:8000";

// Parse optional MAX_VUS cap (default 2000 for full run, set lower for quick tests)
const MAX_VUS = parseInt(__ENV.MAX_VUS || "2000", 10);

const ACTIVITY_TYPES = ["gym_spotter", "table_tennis", "board_game", "badminton", "chess"];

// Fixed coordinates for e2e matching tests (two users at the exact same spot)
const E2E_LAT = 1.3521;
const E2E_LON = 103.8198;
const E2E_ACTIVITY = "chess";

// Custom metric: full pipeline latency (POST /pings → WS match_formed delivery)
const e2eLatency = new Trend("e2e_match_latency_ms", true);

// Singapore bounding box for random REST test coords
function randomCoords() {
  return {
    lat: 1.28 + Math.random() * 0.17,
    lon: 103.60 + Math.random() * 0.45,
  };
}

// ------------------------------------------------------------
// Scenario options
// Ramp profile: 0 → 100 → 500 → 1000 → 2000 VUs then back down.
// Each plateau is 60s to collect stable measurements.
// Actual peak is capped at MAX_VUS so quick runs stay cheap.
// ------------------------------------------------------------
const vuTarget = (n) => Math.min(n, MAX_VUS);

export const options = {
  scenarios: {
    // 4.1 REST API latency — ramping across all concurrency levels
    rest_api: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: vuTarget(100) },
        { duration: "60s", target: vuTarget(100) },  // plateau @ 100
        { duration: "20s", target: vuTarget(500) },
        { duration: "60s", target: vuTarget(500) },  // plateau @ 500
        { duration: "20s", target: vuTarget(1000) },
        { duration: "60s", target: vuTarget(1000) }, // plateau @ 1000
        { duration: "20s", target: vuTarget(2000) },
        { duration: "60s", target: vuTarget(2000) }, // plateau @ 2000
        { duration: "20s", target: 0 },
      ],
      exec: "restApiScenario",
      gracefulRampDown: "30s",
    },

    // 4.1 WebSocket connection establishment time
    ws_connect: {
      executor: "constant-vus",
      vus: Math.min(50, MAX_VUS),
      duration: "380s", // matches rest_api total duration
      exec: "wsConnectScenario",
    },

    // 4.1 End-to-end match notification latency
    // Pairs of VUs create a lobby and measure the full pipeline
    e2e_match: {
      executor: "constant-vus",
      vus: Math.min(20, MAX_VUS),
      duration: "380s",
      exec: "e2eMatchScenario",
    },
  },

  thresholds: {
    // Paper target: sub-200ms at p95 for API calls
    http_req_duration: ["p(95)<200"],
    http_req_failed:   ["rate<0.01"],

    // WebSocket connection under 1s at p95
    ws_connecting: ["p(95)<1000"],

    // Full pipeline: p95 under 500ms
    e2e_match_latency_ms: ["p(95)<500"],
  },
};

// ------------------------------------------------------------
// Scenario: REST API (POST /pings + GET /pings/nearby)
// ------------------------------------------------------------
export function restApiScenario() {
  const coords = randomCoords();
  const userId = `rest-${__VU}-${__ITER}`;

  // POST /pings
  const postRes = http.post(
    `${BASE_URL}/pings`,
    JSON.stringify({
      user_id: userId,
      activity_type: randomItem(ACTIVITY_TYPES),
      location: coords,
      message: "Looking for a partner",
      radius_meters: 50,
      capacity: 2,
    }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "POST /pings" } }
  );

  check(postRes, {
    "POST /pings → 201": (r) => r.status === 201,
    "POST /pings → has lobby_id": (r) => !!r.json("lobby_id"),
  });

  sleep(0.5 + Math.random());

  // GET /pings/nearby
  const nearbyRes = http.get(
    `${BASE_URL}/pings/nearby?lat=${coords.lat}&lon=${coords.lon}&radius=50`,
    { tags: { name: "GET /pings/nearby" } }
  );

  check(nearbyRes, {
    "GET /pings/nearby → 200": (r) => r.status === 200,
  });

  sleep(0.5 + Math.random());
}

// ------------------------------------------------------------
// Scenario: WebSocket connection time
// Connects, subscribes to a lobby, holds for 20–40s, disconnects.
// k6 tracks ws_connecting automatically.
// ------------------------------------------------------------
export function wsConnectScenario() {
  const userId = `ws-${__VU}-${__ITER}`;
  const url = `${WS_URL}/ws/${userId}`;

  const res = ws.connect(url, {}, (socket) => {
    socket.on("open", () => {
      socket.send(JSON.stringify({ type: "subscribe_lobby", lobby_id: "warmup-lobby" }));
    });

    socket.on("message", (data) => {
      const msg = JSON.parse(data);
      check(msg, { "valid ws message": (m) => !!m.type });
    });

    socket.on("error", (e) => console.error(`WS error [VU ${__VU}]:`, e));

    // Hold connection for 20–40s to simulate a real user session
    socket.setTimeout(() => socket.close(), 20000 + Math.random() * 20000);
  });

  check(res, { "ws handshake 101": (r) => r && r.status === 101 });

  sleep(1);
}

// ------------------------------------------------------------
// Scenario: End-to-end match notification latency
//
// Each VU independently measures the full pipeline:
//   1. Open WS as User A
//   2. User A posts a ping → lobby created (waiting)
//   3. Wait 300ms, record t0
//   4. User B posts a ping at same coords/activity → triggers match_formed
//   5. WS receives match_formed → record (Date.now() - t0) as e2e latency
//
// Using unique per-iteration coords with a tiny offset so parallel VUs
// don't accidentally cross-match each other's lobbies.
// ------------------------------------------------------------
export function e2eMatchScenario() {
  // Spread VUs across a grid of nearby but distinct locations (1m apart)
  const vuOffset = (__VU * 0.000009); // ~1m per VU in latitude
  const lat = E2E_LAT + vuOffset;
  const lon = E2E_LON;

  const userA = `e2e-a-${__VU}-${__ITER}`;
  const userB = `e2e-b-${__VU}-${__ITER}`;

  let t0 = null;
  let matched = false;

  const res = ws.connect(`${WS_URL}/ws/${userA}`, {}, (socket) => {
    socket.on("open", () => {
      // User A creates the lobby (should be waiting)
      const bodyA = JSON.stringify({
        user_id: userA,
        activity_type: E2E_ACTIVITY,
        location: { lat, lon },
        radius_meters: 5,
        capacity: 2,
      });
      const postA = http.post(`${BASE_URL}/pings`, bodyA, {
        headers: { "Content-Type": "application/json" },
        tags: { name: "e2e POST /pings (UserA)" },
      });

      const aStatus = postA.json("status");
      if (postA.status !== 201 || aStatus === "matched") {
        // Location already occupied — skip this iteration
        socket.close();
        return;
      }

      // 300ms later, User B fills the lobby
      socket.setTimeout(() => {
        t0 = Date.now();

        const bodyB = JSON.stringify({
          user_id: userB,
          activity_type: E2E_ACTIVITY,
          location: { lat, lon },
          radius_meters: 5,
          capacity: 2,
        });
        http.post(`${BASE_URL}/pings`, bodyB, {
          headers: { "Content-Type": "application/json" },
          tags: { name: "e2e POST /pings (UserB)" },
        });
      }, 300);
    });

    socket.on("message", (data) => {
      const msg = JSON.parse(data);
      if (msg.type === "match_formed" && t0 !== null && !matched) {
        matched = true;
        e2eLatency.add(Date.now() - t0);
        socket.close();
      }
    });

    socket.on("error", (e) => console.error(`e2e WS error [VU ${__VU}]:`, e));

    // Safety timeout — close after 8s even if no match received
    socket.setTimeout(() => socket.close(), 8000);
  });

  check(res, { "e2e ws handshake": (r) => r && r.status === 101 });

  // Brief pause before next iteration to avoid lobby collisions
  sleep(2 + Math.random() * 2);
}
