import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { createChatHandler, type ChatHandlerOptions } from '@/lib/chat-handler';

export const usage = {
  inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 4, text: 4, reasoning: 0 },
};
const stop = { unified: 'stop', raw: 'stop' } as const;
const toolCalls = { unified: 'tool-calls', raw: 'tool_calls' } as const;

export const streamToolCall = (toolName: string, input: unknown) => ({
  stream: simulateReadableStream({
    chunks: [
      { type: 'stream-start' as const, warnings: [] },
      { type: 'tool-call' as const, toolCallId: 'c1', toolName, input: JSON.stringify(input) },
      { type: 'finish' as const, finishReason: toolCalls, usage },
    ],
  }),
});

export const streamText_ = (text: string) => ({
  stream: simulateReadableStream({
    chunks: [
      { type: 'stream-start' as const, warnings: [] },
      { type: 'text-start' as const, id: 't' },
      { type: 'text-delta' as const, id: 't', delta: text },
      { type: 'text-end' as const, id: 't' },
      { type: 'finish' as const, finishReason: stop, usage },
    ],
  }),
});

// Her çağrıda yeni bir metin akışı döndüren model
export const textModel = () => new MockLanguageModelV4({ doStream: async () => streamText_('Merhaba') });

export function makeChat(model: MockLanguageModelV4, userId: string, opts: Partial<ChatHandlerOptions> = {}) {
  const handler = createChatHandler({ model, ...opts });
  return new Chat({
    transport: new DefaultChatTransport({
      api: 'http://x/api/chat',
      headers: { 'x-user-id': userId },
      fetch: (u, i) => handler(new Request(u as string, i)),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
}

// Şemaya uymayan girdi 'tool-<ad>' yerine 'dynamic-tool' parçası olarak gelir, ikisini de arıyoruz
export function toolPart(chat: Chat<any>, name: string) {
  return chat.messages
    .at(-1)
    ?.parts.find((p: any) => p.type === `tool-${name}` || (p.type === 'dynamic-tool' && p.toolName === name)) as any;
}

export async function waitFor(check: () => boolean, ms = 3000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('waitFor timeout');
    await new Promise((r) => setTimeout(r, 20));
  }
}

export function chatRequest(userId: string, messages: unknown[]) {
  return new Request('http://x/api/chat', {
    method: 'POST',
    headers: { 'x-user-id': userId, 'content-type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
}

export const userMessage = (text: string, id = 'm1') => ({ id, role: 'user', parts: [{ type: 'text', text }] });
