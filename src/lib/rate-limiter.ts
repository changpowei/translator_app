/**
 * Simple in-memory rate limiter using sliding window.
 *
 * ┌──────────────────────────────────────────┐
 * │ REQUEST ──▶ check IP ──▶ within limit?   │
 * │                          YES → allow      │
 * │                          NO  → 429        │
 * └──────────────────────────────────────────┘
 */

interface RateLimitEntry {
  readonly timestamps: readonly number[];
}

const store = new Map<string, RateLimitEntry>();

const MAX_REQUESTS = 20;
const WINDOW_MS = 60_000; // 1 minute

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  // Clean old entries
  const recent = entry
    ? entry.timestamps.filter((t) => now - t < WINDOW_MS)
    : [];

  if (recent.length >= MAX_REQUESTS) {
    store.set(ip, { timestamps: recent });
    return true;
  }

  store.set(ip, { timestamps: [...recent, now] });
  return false;
}

export const INPUT_MAX_LENGTH = 500;

// Periodic cleanup to prevent memory leak (every 5 minutes)
// Use .unref() so the timer doesn't prevent process exit (e.g., in tests)
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      const recent = entry.timestamps.filter((t) => now - t < WINDOW_MS);
      if (recent.length === 0) {
        store.delete(ip);
      } else {
        store.set(ip, { timestamps: recent });
      }
    }
  }, 300_000);
  if (typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }
}
