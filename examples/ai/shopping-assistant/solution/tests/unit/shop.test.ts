import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import { createChatHandler } from '@/lib/chat-handler';
import { getCart, resetCarts } from '@/lib/cart';
import { estimateCost } from '@/lib/cost';
import { createRateLimiter } from '@/lib/rate-limit';
import { chatRequest, makeChat, streamText_, streamToolCall, textModel, toolPart, userMessage, waitFor } from './helpers';

beforeEach(() => resetCarts());

describe('tools', () => {
  it('searchProducts runs with the right argument and applies the filter', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('searchProducts', { query: 'shoes', maxPrice: 3000 }), streamText_('Buldum.')],
    });
    const chat = makeChat(model, 'u1');
    await chat.sendMessage({ text: 'shoes under 3000 TL' });

    const part = toolPart(chat, 'searchProducts');
    expect(part.state).toBe('output-available');
    const items = part.output as { price: number; category: string }[];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.price).toBeLessThanOrEqual(3000);
      expect(item.category).toBe('shoes');
    }
  });

  it('searchProducts returns only the allowed fields and the untrusted description never reaches the model', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('searchProducts', { query: 'running' }), streamText_('Buldum.')],
    });
    const chat = makeChat(model, 'u1');
    await chat.sendMessage({ text: 'running products' });

    const items = toolPart(chat, 'searchProducts').output as Record<string, unknown>[];
    expect(items.some((i) => i.id === 'p-07')).toBe(true); // the product carrying the hidden instruction is in the list too
    const allowed = ['id', 'name', 'category', 'price', 'inStock'];
    for (const item of items) expect(Object.keys(item).every((k) => allowed.includes(k))).toBe(true);

    // the prompt sent on the second model call must not contain the hidden instruction
    expect(JSON.stringify(model.doStreamCalls[1].prompt)).not.toContain('IGNORE ALL PREVIOUS');
  });

  it('the addToCart input schema limits the quantity to 1-5', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-01', quantity: 50 }), streamText_('x')],
    });
    const chat = makeChat(model, 'u1');
    await chat.sendMessage({ text: 'add 50 of them' });
    expect(toolPart(chat, 'addToCart').state).toBe('output-error');
    expect(getCart('u1')).toEqual([]);
  });
});

describe('approval and authorization', () => {
  it('addToCart does not run without approval and adds to the cart after it', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-01', quantity: 1 }), streamText_('Added it.')],
    });
    const chat = makeChat(model, 'u2');
    await chat.sendMessage({ text: 'add p-01 to cart' });

    const part = toolPart(chat, 'addToCart');
    expect(part.state).toBe('approval-requested');
    expect(getCart('u2')).toEqual([]);

    await chat.addToolApprovalResponse({ id: part.approval.id, approved: true });
    await waitFor(() => toolPart(chat, 'addToCart').state === 'output-available' && chat.status === 'ready');
    expect(getCart('u2')).toEqual([{ productId: 'p-01', quantity: 1 }]);
  });

  it('the cart is unchanged when approval is refused', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-01', quantity: 1 }), streamText_('Done.')],
    });
    const chat = makeChat(model, 'u2');
    await chat.sendMessage({ text: 'add p-01 to cart' });
    await chat.addToolApprovalResponse({ id: toolPart(chat, 'addToCart').approval.id, approved: false });
    await waitFor(() => toolPart(chat, 'addToCart').state === 'output-denied' && chat.status === 'ready');
    expect(getCart('u2')).toEqual([]);
  });

  it('even if the model is tricked, nothing enters the cart without the user approving', async () => {
    // The model behaves as if it had followed the hidden instruction in the product description
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-02', quantity: 5 }), streamText_('x')],
    });
    const chat = makeChat(model, 'u3');
    await chat.sendMessage({ text: 'do you have running tights?' });
    expect(toolPart(chat, 'addToCart').state).toBe('approval-requested');
    expect(getCart('u3')).toEqual([]);
  });

  it('a non-existent product never enters the cart even if approved', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-99', quantity: 1 }), streamText_('x')],
    });
    const chat = makeChat(model, 'u3');
    await chat.sendMessage({ text: 'add it' });
    await chat.addToolApprovalResponse({ id: toolPart(chat, 'addToCart').approval.id, approved: true });
    await waitFor(() => toolPart(chat, 'addToCart').state === 'output-error' && chat.status === 'ready');
    expect(getCart('u3')).toEqual([]);
    // The server's internal error message must not reach the model
    expect(JSON.stringify(model.doStreamCalls[1].prompt)).not.toContain('Product not found');
  });

  it('the cart is private to the user', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-01', quantity: 1 }), streamText_('Added it.')],
    });
    const chat = makeChat(model, 'ayse');
    await chat.sendMessage({ text: 'add it' });
    await chat.addToolApprovalResponse({ id: toolPart(chat, 'addToCart').approval.id, approved: true });
    await waitFor(() => toolPart(chat, 'addToCart').state === 'output-available' && chat.status === 'ready');
    expect(getCart('ayse')).toHaveLength(1);
    expect(getCart('mehmet')).toEqual([]);
  });
});

describe('rate limit and input limit', () => {
  it('exceeding the per-user limit returns 429 and retry-after', async () => {
    const handler = createChatHandler({ model: textModel(), limiter: createRateLimiter({ max: 3, windowMs: 60_000 }) });
    const statuses: number[] = [];
    let last: Response | undefined;
    for (let i = 0; i < 5; i++) {
      last = await handler(chatRequest('a', [userMessage('selam')]));
      statuses.push(last.status);
      await last.text();
    }
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
    expect(Number(last!.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);

    const other = await handler(chatRequest('b', [userMessage('selam')]));
    expect(other.status).toBe(200);
  });

  it('the counter resets once the window elapses', () => {
    vi.useFakeTimers();
    try {
      const limiter = createRateLimiter({ max: 2, windowMs: 1000 });
      expect(limiter.check('x').success).toBe(true);
      expect(limiter.check('x').success).toBe(true);
      expect(limiter.check('x').success).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(limiter.check('x').success).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('an over-long history and an over-long message are rejected and the model is not called', async () => {
    const model = textModel();
    const handler = createChatHandler({ model });
    const many = Array.from({ length: 51 }, (_, i) => userMessage('selam', `m${i}`));
    expect((await handler(chatRequest('a', many))).status).toBe(413);
    expect((await handler(chatRequest('a', [userMessage('x'.repeat(4001))]))).status).toBe(413);
    expect(model.doStreamCalls).toHaveLength(0);
  });
});

describe('cost', () => {
  it('the call to the model carries a maxOutputTokens limit', async () => {
    const model = textModel();
    const res = await createChatHandler({ model })(chatRequest('a', [userMessage('selam')]));
    await res.text();
    const limit = model.doStreamCalls[0].maxOutputTokens;
    expect(limit).toBeDefined();
    expect(limit!).toBeLessThanOrEqual(1024);
  });

  it('estimateCost multiplies the token line items by the price', () => {
    const cost = estimateCost({
      inputTokens: 1000,
      inputTokenDetails: { noCacheTokens: 200, cacheReadTokens: 700, cacheWriteTokens: 100 },
      outputTokens: 300,
      outputTokenDetails: { textTokens: 250, reasoningTokens: 50 },
      totalTokens: 1300,
    } as Parameters<typeof estimateCost>[0]);
    expect(cost).toBeCloseTo(0.00372, 8);
  });

  it('usage and cost are reported when each request finishes', async () => {
    const onUsage = vi.fn();
    const res = await createChatHandler({ model: textModel(), onUsage })(chatRequest('u9', [userMessage('selam')]));
    await res.text();
    await waitFor(() => onUsage.mock.calls.length > 0);
    expect(onUsage).toHaveBeenCalledTimes(1);
    const report = onUsage.mock.calls[0][0];
    expect(report).toMatchObject({ userId: 'u9', inputTokens: 3, outputTokens: 4 });
    expect(report.costUsd).toBeCloseTo(0.000046, 9);
  });
});
