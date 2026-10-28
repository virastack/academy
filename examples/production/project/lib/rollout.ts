/**
 * Places an id in a stable bucket between 0 and 99 (FNV-1a).
 * The same user lands in the same bucket on every request, so a 10 percent rollout always reaches the same 10 percent.
 */
export function rolloutBucket(id: string, salt: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${salt}:${id}`) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function isInRollout(id: string, salt: string, percentage: number): boolean {
  return rolloutBucket(id, salt) < percentage;
}
