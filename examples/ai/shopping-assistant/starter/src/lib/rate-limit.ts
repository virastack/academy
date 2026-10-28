export type RateLimiter = {
  check(id: string): { success: true } | { success: false; retryAfter: number };
};

// TODO: a per-user limit with a sliding window: max requests / windowMs.
// When the limit is exceeded, return { success: false, retryAfter: seconds }.
export function createRateLimiter(_opts: { max: number; windowMs: number }): RateLimiter {
  return { check: () => ({ success: true }) };
}
