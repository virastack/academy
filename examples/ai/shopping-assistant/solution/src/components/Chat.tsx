'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type InferUITools, type UIMessage } from 'ai';
import { useEffect, useMemo, useState } from 'react';
import { findProductById } from '@/lib/products';
import type { createTools } from '@/lib/tools';
import { ProductCard, type ProductSummary } from './ProductCard';

type ShopMessage = UIMessage<never, never, InferUITools<ReturnType<typeof createTools>>>;

export default function Chat() {
  const userId = typeof window === 'undefined' ? 'demo-user' : (new URLSearchParams(window.location.search).get('user') ?? 'demo-user');
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat', headers: { 'x-user-id': userId } }), [userId]);
  const { messages, sendMessage, status, error, addToolApprovalResponse } = useChat<ShopMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const [input, setInput] = useState('');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (status !== 'ready') return;
    fetch('/api/cart', { headers: { 'x-user-id': userId } })
      .then((r) => r.json())
      .then((d: { count: number }) => setCount(d.count));
  }, [status, userId]);

  return (
    <div className="mt-6">
      <p aria-live="polite" className="text-sm text-muted">
        Cart: {count} items
      </p>

      <ul className="mt-4 space-y-4">
        {messages.map((message) => (
          <li key={message.id} className={message.role === 'user' ? 'text-right' : ''}>
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  // The assistant text is rendered as plain text: no Markdown image or link is created
                  return (
                    <p key={i} className="whitespace-pre-wrap text-ink">
                      {part.text}
                    </p>
                  );

                case 'tool-searchProducts':
                  switch (part.state) {
                    case 'output-available':
                      return (
                        <div key={i} className="mt-2 grid gap-3 sm:grid-cols-2">
                          {(part.output as ProductSummary[]).map((p) => (
                            <ProductCard key={p.id} product={p} onAdd={(id) => sendMessage({ text: `add ${id} to cart` })} />
                          ))}
                        </div>
                      );
                    case 'output-error':
                      return <p key={i}>The search could not be run.</p>;
                    default:
                      return <p key={i}>Searching…</p>;
                  }

                case 'tool-addToCart':
                  switch (part.state) {
                    case 'approval-requested':
                      return (
                        <div key={i} role="group" aria-label="Approval" className="mt-2 rounded-xl border border-line bg-card p-4">
                          <p className="text-ink">
                            {findProductById(part.input.productId)?.name ?? part.input.productId} ({part.input.quantity} items) — add it to the cart?
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => addToolApprovalResponse({ id: part.approval.id, approved: true })}
                              className="h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => addToolApprovalResponse({ id: part.approval.id, approved: false })}
                              className="h-11 rounded-lg border border-line px-4 text-sm font-semibold text-ink"
                            >Dismiss</button>
                          </div>
                        </div>
                      );
                    case 'output-error':
                      return <p key={i}>The product could not be added to the cart.</p>;
                    default:
                      return null;
                  }

                default:
                  return null;
              }
            })}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-4 text-ink">
          Something went wrong. If you sent too many requests, wait a little.
        </p>
      )}

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <label htmlFor="msg" className="sr-only">Your message</label>
        <input
          id="msg"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. running shoes under 300 EUR"
          className="h-11 flex-1 rounded-lg border border-line bg-card px-3 text-ink"
        />
        <button
          type="submit"
          disabled={status !== 'ready'}
          className="h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink disabled:opacity-60"
        >Send</button>
      </form>
    </div>
  );
}
