export type RateLimiter = {
  check(id: string): { success: true } | { success: false; retryAfter: number };
};

// TODO: kayan pencere ile kullanıcı başına sınır. max istek / windowMs.
// Sınır aşılırsa { success: false, retryAfter: saniye } dönsün.
export function createRateLimiter(_opts: { max: number; windowMs: number }): RateLimiter {
  return { check: () => ({ success: true }) };
}
