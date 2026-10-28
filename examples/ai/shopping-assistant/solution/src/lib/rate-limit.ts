export type RateLimiter = {
  check(id: string): { success: true } | { success: false; retryAfter: number };
};

// An in-memory sliding window. Single-process only: in production keep the counter outside, in Redis or similar.
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(id) {
      const now = Date.now();
      const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(id, recent);
        return { success: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000)) };
      }
      recent.push(now);
      hits.set(id, recent);
      return { success: true };
    },
  };
}
