/**
 * Bir kimliği 0 ile 99 arasında sabit bir kovaya yerleştirir (FNV-1a).
 * Aynı kullanıcı her istekte aynı kovaya düşer; yüzde 10'luk açılışta hep aynı yüzde 10 görür.
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
