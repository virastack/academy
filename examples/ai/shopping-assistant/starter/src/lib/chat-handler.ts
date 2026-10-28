import type { LanguageModel } from 'ai';
import type { RateLimiter } from './rate-limit';

export type UsageReport = { userId: string; inputTokens: number; outputTokens: number; costUsd: number };

export type ChatHandlerOptions = {
  model: LanguageModel;
  limiter?: RateLimiter;
  onUsage?: (report: UsageReport) => void;
};

// TODO: return the function that handles the POST request.
// User id: the x-user-id header (falling back to 'anon').
export function createChatHandler(_options: ChatHandlerOptions) {
  return async function POST(_req: Request): Promise<Response> {
    return new Response('Not written yet', { status: 501 });
  };
}
