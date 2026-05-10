import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<800"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

function randomUser() {
  const suffix = Math.floor(Math.random() * 1_000_000);
  return {
    email: `vu_${__VU}_${suffix}@example.com`,
    password: "TestPass123!",
  };
}

export default function () {
  const user = randomUser();

  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(registerRes, { "register accepted": (r) => r.status === 201 || r.status === 409 });

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(loginRes, { "login success": (r) => r.status === 200 });

  const cookies = loginRes.cookies;
  const accessCookie = cookies.access_token?.[0]?.value;
  const refreshCookie = cookies.refresh_token?.[0]?.value;

  const params = {
    headers: { "Content-Type": "application/json" },
    cookies: {
      access_token: accessCookie,
      refresh_token: refreshCookie,
    },
  };

  const settingsRes = http.put(
    `${BASE_URL}/settings`,
    JSON.stringify({ preferred_mode: "spectrogram", color_theme: "cyan" }),
    params
  );
  check(settingsRes, { "settings updated": (r) => r.status === 200 });

  const createSessionRes = http.post(
    `${BASE_URL}/sessions`,
    JSON.stringify({
      mode: "bars",
      audio_type: "music",
      bpm: 128.4,
      peak_count: 24,
      duration_seconds: 12.6,
      notes: "k6 synthetic session",
    }),
    params
  );
  check(createSessionRes, { "session logged": (r) => r.status === 201 });

  const listSessionsRes = http.get(`${BASE_URL}/sessions`, params);
  check(listSessionsRes, { "sessions fetched": (r) => r.status === 200 });

  const refreshRes = http.post(`${BASE_URL}/auth/refresh`, null, params);
  check(refreshRes, { "refresh success": (r) => r.status === 200 });

  sleep(1);
}
