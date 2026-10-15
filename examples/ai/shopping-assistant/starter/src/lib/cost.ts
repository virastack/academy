import type { LanguageModelUsage } from 'ai';

// Sonnet 5.5 fiyatları, 1 milyon token başına dolar (15 Ekim 2026, Anthropic fiyat sayfası)
export const PRICE = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 };

// TODO: usage'tan tahmini maliyeti dolar olarak hesaplayın.
export function estimateCost(_usage: LanguageModelUsage): number {
  return 0;
}
