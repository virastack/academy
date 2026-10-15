import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import { createChatHandler } from '@/lib/chat-handler';
import { getCart, resetCarts } from '@/lib/cart';
import { estimateCost } from '@/lib/cost';
import { createRateLimiter } from '@/lib/rate-limit';
import { chatRequest, makeChat, streamText_, streamToolCall, textModel, toolPart, userMessage, waitFor } from './helpers';

beforeEach(() => resetCarts());

describe('araçlar', () => {
  it('searchProducts doğru argümanla çalışır ve filtreyi uygular', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('searchProducts', { query: 'ayakkabı', maxPrice: 3000 }), streamText_('Buldum.')],
    });
    const chat = makeChat(model, 'u1');
    await chat.sendMessage({ text: '3000 TL altı ayakkabı' });

    const part = toolPart(chat, 'searchProducts');
    expect(part.state).toBe('output-available');
    const items = part.output as { price: number; category: string }[];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.price).toBeLessThanOrEqual(3000);
      expect(item.category).toBe('ayakkabı');
    }
  });

  it('searchProducts yalnızca izin verilen alanları döndürür, güvenilmeyen açıklama modele gitmez', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('searchProducts', { query: 'koşu' }), streamText_('Buldum.')],
    });
    const chat = makeChat(model, 'u1');
    await chat.sendMessage({ text: 'koşu ürünleri' });

    const items = toolPart(chat, 'searchProducts').output as Record<string, unknown>[];
    expect(items.some((i) => i.id === 'p-07')).toBe(true); // içinde gizli talimat olan ürün de listede
    const allowed = ['id', 'name', 'category', 'price', 'inStock'];
    for (const item of items) expect(Object.keys(item).every((k) => allowed.includes(k))).toBe(true);

    // 2. model çağrısına giden istemde gizli talimat bulunmamalı
    expect(JSON.stringify(model.doStreamCalls[1].prompt)).not.toContain('IGNORE ALL PREVIOUS');
  });

  it('addToCart giriş şeması adedi 1-5 ile sınırlar', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-01', quantity: 50 }), streamText_('x')],
    });
    const chat = makeChat(model, 'u1');
    await chat.sendMessage({ text: '50 tane ekle' });
    expect(toolPart(chat, 'addToCart').state).toBe('output-error');
    expect(getCart('u1')).toEqual([]);
  });
});

describe('onay ve yetki', () => {
  it('addToCart onay olmadan çalışmaz, onaydan sonra sepete ekler', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-01', quantity: 1 }), streamText_('Ekledim.')],
    });
    const chat = makeChat(model, 'u2');
    await chat.sendMessage({ text: 'p-01 sepete ekle' });

    const part = toolPart(chat, 'addToCart');
    expect(part.state).toBe('approval-requested');
    expect(getCart('u2')).toEqual([]);

    await chat.addToolApprovalResponse({ id: part.approval.id, approved: true });
    await waitFor(() => toolPart(chat, 'addToCart').state === 'output-available' && chat.status === 'ready');
    expect(getCart('u2')).toEqual([{ productId: 'p-01', quantity: 1 }]);
  });

  it('onay reddedilirse sepet değişmez', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-01', quantity: 1 }), streamText_('Tamam.')],
    });
    const chat = makeChat(model, 'u2');
    await chat.sendMessage({ text: 'p-01 sepete ekle' });
    await chat.addToolApprovalResponse({ id: toolPart(chat, 'addToCart').approval.id, approved: false });
    await waitFor(() => toolPart(chat, 'addToCart').state === 'output-denied' && chat.status === 'ready');
    expect(getCart('u2')).toEqual([]);
  });

  it('model kandırılsa bile kullanıcı onaylamadan sepete ürün eklenmez', async () => {
    // Model, ürün açıklamasındaki gizli talimata uymuş gibi davranıyor
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-02', quantity: 5 }), streamText_('x')],
    });
    const chat = makeChat(model, 'u3');
    await chat.sendMessage({ text: 'koşu tayt var mı?' });
    expect(toolPart(chat, 'addToCart').state).toBe('approval-requested');
    expect(getCart('u3')).toEqual([]);
  });

  it('olmayan ürün onaylansa bile sepete girmez', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-99', quantity: 1 }), streamText_('x')],
    });
    const chat = makeChat(model, 'u3');
    await chat.sendMessage({ text: 'ekle' });
    await chat.addToolApprovalResponse({ id: toolPart(chat, 'addToCart').approval.id, approved: true });
    await waitFor(() => toolPart(chat, 'addToCart').state === 'output-error' && chat.status === 'ready');
    expect(getCart('u3')).toEqual([]);
    // Sunucudaki iç hata mesajı modele gitmemeli
    expect(JSON.stringify(model.doStreamCalls[1].prompt)).not.toContain('Ürün bulunamadı');
  });

  it('sepet kullanıcıya özeldir', async () => {
    const model = new MockLanguageModelV4({
      doStream: [streamToolCall('addToCart', { productId: 'p-01', quantity: 1 }), streamText_('Ekledim.')],
    });
    const chat = makeChat(model, 'ayse');
    await chat.sendMessage({ text: 'ekle' });
    await chat.addToolApprovalResponse({ id: toolPart(chat, 'addToCart').approval.id, approved: true });
    await waitFor(() => toolPart(chat, 'addToCart').state === 'output-available' && chat.status === 'ready');
    expect(getCart('ayse')).toHaveLength(1);
    expect(getCart('mehmet')).toEqual([]);
  });
});

describe('rate limit ve girdi sınırı', () => {
  it('kullanıcı başına sınırı aşınca 429 ve retry-after döner', async () => {
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

  it('pencere dolunca sayaç sıfırlanır', () => {
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

  it('çok uzun geçmiş ve çok uzun mesaj reddedilir, model çağrılmaz', async () => {
    const model = textModel();
    const handler = createChatHandler({ model });
    const many = Array.from({ length: 51 }, (_, i) => userMessage('selam', `m${i}`));
    expect((await handler(chatRequest('a', many))).status).toBe(413);
    expect((await handler(chatRequest('a', [userMessage('x'.repeat(4001))]))).status).toBe(413);
    expect(model.doStreamCalls).toHaveLength(0);
  });
});

describe('maliyet', () => {
  it('modele giden çağrıda maxOutputTokens sınırı var', async () => {
    const model = textModel();
    const res = await createChatHandler({ model })(chatRequest('a', [userMessage('selam')]));
    await res.text();
    const limit = model.doStreamCalls[0].maxOutputTokens;
    expect(limit).toBeDefined();
    expect(limit!).toBeLessThanOrEqual(1024);
  });

  it('estimateCost token kalemlerini fiyatla çarpar', () => {
    const cost = estimateCost({
      inputTokens: 1000,
      inputTokenDetails: { noCacheTokens: 200, cacheReadTokens: 700, cacheWriteTokens: 100 },
      outputTokens: 300,
      outputTokenDetails: { textTokens: 250, reasoningTokens: 50 },
      totalTokens: 1300,
    } as Parameters<typeof estimateCost>[0]);
    expect(cost).toBeCloseTo(0.00372, 8);
  });

  it('her istek bittiğinde kullanım ve maliyet raporlanır', async () => {
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
