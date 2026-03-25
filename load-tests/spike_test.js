/**
 * k6 load test — Need A Sidekick
 *
 * Run:
 *   k6 run load-tests/spike_test.js
 *   k6 run --vus 500 --duration 60s load-tests/spike_test.js
 */
import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE_URL = __ENV.API_URL || "http://localhost:8000";
const WS_URL = __ENV.WS_URL || "ws://localhost:8000";

const ACTIVITY_TYPES = [
  "gym_spotter", "table_tennis", "board_game", "badminton", "chess",
];

// Singapore bounding box (lat 1.28–1.45, lon 103.60–104.05)
function randomCoords() {
  return {
    lat: 1.28 + Math.random() * 0.17,
    lon: 103.60 + Math.random() * 0.45,
  };
}

export const options = {
  scenarios: {
    // Ramp up to 200 VUs posting pings
    ping_storm: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 50 },
        { duration: "30s", target: 200 },
        { duration: "20s", target: 200 },
        { duration: "10s", target: 0 },
      ],
      exec: "postPingScenario",
    },
    // 50 concurrent WebSocket connections throughout
    ws_connections: {
      executor: "constant-vus",
      vus: 50,
      duration: "70s",
      exec: "wsScenario",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],   // 95% of requests under 500ms
    http_req_failed: ["rate<0.01"],     // < 1% failure rate
    ws_connecting: ["p(95)<1000"],      // WS connect under 1s
  },
};

export function postPingScenario() {
  const coords = randomCoords();
  const payload = JSON.stringify({
    user_id: `user-${__VU}-${__ITER}`,
    activity_type: randomItem(ACTIVITY_TYPES),
    location: coords,
    message: "Looking for a partner",
    radius_meters: 50,
    capacity: 2,
  });

  const res = http.post(`${BASE_URL}/pings`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "ping created (201)": (r) => r.status === 201,
    "has lobby_id": (r) => !!r.json("lobby_id"),
  });

  sleep(1 + Math.random() * 2);
}

export function wsScenario() {
  const userId = `ws-user-${__VU}`;
  const url = `${WS_URL}/ws/${userId}`;

  const res = ws.connect(url, {}, (socket) => {
    socket.on("open", () => {
      // Subscribe to a random lobby (would be real in integration test)
      socket.send(JSON.stringify({ type: "subscribe_lobby", lobby_id: "test-lobby" }));
    });

    socket.on("message", (data) => {
      const msg = JSON.parse(data);
      check(msg, { "valid ws message type": (m) => !!m.type });
    });

    socket.on("error", (e) => console.error("WS error:", e));

    // Hold connection for 30–60s
    socket.setTimeout(() => socket.close(), 30000 + Math.random() * 30000);
  });

  check(res, { "ws connected": (r) => r && r.status === 101 });
}
