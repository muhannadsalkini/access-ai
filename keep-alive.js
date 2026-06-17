#!/usr/bin/env node
/**
 * keep-alive.js
 * Pings the backend and agent health endpoints every 10 minutes
 * to prevent Render free-tier services from spinning down.
 *
 * Usage:  node keep-alive.js
 */

// Render free-tier services spin down after ~15 minutes of inactivity.
// 6 minutes gives us ~2 safe pings inside the idle window — small enough
// to guarantee the service stays warm even if one ping fails.
const INTERVAL_MS = 6 * 60 * 1000; // 6 minutes


const ENDPOINTS = [
  "https://access-ai-backend.onrender.com/health",
  "https://access-ai-agent.onrender.com/health",
];

function timestamp() {
  return new Date().toISOString();
}

async function ping(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      console.log(`[${timestamp()}] ✅  ${url} — ${res.status} OK`);
    } else {
      console.warn(`[${timestamp()}] ⚠️  ${url} — HTTP ${res.status}`);
    }
  } catch (err) {
    const msg = err.name === "AbortError" ? "timed out (30s)" : err.message;
    console.error(`[${timestamp()}] ❌  ${url} — ${msg}`);
  }
}

async function pingAll() {
  console.log(`\n[${timestamp()}] 🔔 Pinging ${ENDPOINTS.length} endpoints...`);
  await Promise.allSettled(ENDPOINTS.map(ping));
}

// Run immediately on start, then repeat every INTERVAL_MS
(async () => {
  console.log(
    `Keep-alive started. Pinging every ${INTERVAL_MS / 60_000} minutes.\n`
  );
  await pingAll();
  setInterval(pingAll, INTERVAL_MS);
})();
