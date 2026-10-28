import type { LanguageModelUsage } from 'ai';

// Sonnet 5.5 prices in dollars per million tokens (15 October 2026, Anthropic pricing page)
export const PRICE = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 };

// TODO: work out the estimated cost in dollars from usage.
export function estimateCost(_usage: LanguageModelUsage): number {
  return 0;
}
