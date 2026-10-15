import type { LanguageModelUsage } from 'ai';

// Sonnet 5.5 fiyatları, 1 milyon token başına dolar (15 Ekim 2026, Anthropic fiyat sayfası)
export const PRICE = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 };

export function estimateCost(usage: LanguageModelUsage): number {
  const d = usage.inputTokenDetails;
  const cacheRead = d?.cacheReadTokens ?? 0;
  const cacheWrite = d?.cacheWriteTokens ?? 0;
  const noCache = d?.noCacheTokens ?? Math.max(0, (usage.inputTokens ?? 0) - cacheRead - cacheWrite);
  return (
    (noCache * PRICE.input + cacheRead * PRICE.cacheRead + cacheWrite * PRICE.cacheWrite + (usage.outputTokens ?? 0) * PRICE.output) /
    1_000_000
  );
}
