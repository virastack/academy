import { createChatHandler } from '@/lib/chat-handler';
import { getModel } from '@/lib/model';
import { createRateLimiter } from '@/lib/rate-limit';

export const maxDuration = 30;

export const POST = createChatHandler({
  model: getModel(),
  limiter: createRateLimiter({ max: 20, windowMs: 60_000 }),
  onUsage: (report) => console.log('[usage]', JSON.stringify(report)),
});
