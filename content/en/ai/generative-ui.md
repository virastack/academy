---
title: "Generative UI"
description: "Showing a tool result as a component, with its loading and error states."
lastVerified: "2026-10-15"
translationKey: "ai/generative-ui"
---

In generative UI the model does not produce interface code. It calls a tool, and the plain data the tool returns is passed to your React component as props.[^1] The model decides "what gets shown" and "how it looks" stays inside your design system. The Builder.io post argues for the same direction: tool calls should map to components you already have, and generating code from scratch on every request is slow and fragile.[^2] Because the result is plain data, it can be persisted and later drawn again with the same component.

> [!NOTE]
>
> The code in this guide was run with `ai@7.0.140` and `@ai-sdk/react@4.0.143`; the components were rendered in jsdom with React 19.3. For the tool definition, `stopWhen` and the approval flow, read [Tool calling and structured output](/academy/ai/tool-calling-and-structured-output), and for `useChat` and the route setup read [The AI SDK and streaming chat](/academy/ai/ai-sdk-and-streaming-chat). The `streamUI` and `createStreamableUI` from older tutorials belong to the AI SDK RSC package. The docs mark that package as experimental and recommend AI SDK UI for production.[^3]

## A tool's journey to the UI

A tool call arrives as a single part inside `message.parts`. As the part progresses, its `state` field changes:[^4]

| Step | `state` | In the UI |
| --- | --- | --- |
| The model is producing the input | `input-streaming` | The skeleton, fed with the partial input |
| The input is ready, the tool is running | `input-available` | The skeleton |
| The tool gives a preliminary result (optional) | `output-available` with `preliminary: true` | An intermediate state |
| The tool finished | `output-available` | The component |
| The tool failed | `output-error` | An error card |

Since AI SDK 5.0 the tool-call stream has been on by default. That is why the input appears in `input-streaming` parts before it is complete.[^4]

## The tool and the component

```ts
// app/genui/tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { orderService } from './orders'; // your own service layer

export const tools = {
  getOrderStatus: tool({
    description: 'Shows the shipping status of an order as a card.',
    inputSchema: z.object({
      orderId: z.string().describe('The order number, e.g. ORD-1042'),
    }),
    outputSchema: z.object({
      orderId: z.string(),
      status: z.enum(['preparing', 'shipped', 'delivered']),
      eta: z.string().nullable(),
    }),
    execute: ({ orderId }) => orderService.getStatus(orderId),
  }),
};
```

That is the contract between the tool result and the component's props: the component takes the same props as the value the tool returns.[^1] `outputSchema` turns that contract into a type, so `part.output` can be spread straight into the component. This guide assumes `orderService.getStatus` returns `{ orderId, status, eta }`.

```tsx
// app/genui/components.tsx
import { Component, type ReactNode } from 'react';
import type { Order } from './orders';

const STATUS: Record<Order['status'], string> = {
  preparing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

export function OrderCard({ orderId, status, eta }: Order) {
  return (
    <div data-ui="order-card">
      <strong>{orderId}</strong> · {STATUS[status].toUpperCase()}
      {eta && <span> · estimated delivery {eta}</span>}
    </div>
  );
}

export function OrderCardSkeleton({ orderId }: { orderId?: string }) {
  return (
    <div data-ui="skeleton" aria-busy="true">
      {orderId ? `Querying ${orderId}…` : 'Querying the order…'}
    </div>
  );
}

export function ToolError({ children }: { children: ReactNode }) {
  return (
    <div data-ui="tool-error" role="alert">
      {children}
    </div>
  );
}

// If the component crashes on an unexpected output, only that card falls over and the chat keeps working.
export class ToolBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[ToolBoundary]', error);
  }
  render() {
    return this.state.failed ? <ToolError>This result cannot be shown.</ToolError> : this.props.children;
  }
}
```

## Rendering by part

The message type is inferred from the tool names, so narrowing on `part.type` and `part.state` gives you the right prop types in every state:

```ts
// app/genui/types.ts
import type { InferUITools, UIMessage } from 'ai';
import type { tools } from './tools';

export type GenMessage = UIMessage<never, never, InferUITools<typeof tools>>;
```

```tsx
// app/genui/message-parts.tsx
import { getToolName, isToolUIPart } from 'ai';
import { OrderCard, OrderCardSkeleton, ToolBoundary, ToolError } from './components';
import type { GenMessage } from './types';

export function MessageParts({ message, live }: { message: GenMessage; live: boolean }) {
  return (
    <>
      {message.parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return <p key={i}>{part.text}</p>;

          case 'tool-getOrderStatus':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                // If the stream is cut off (by stop, say) these states stay forever.
                return live ? (
                  <OrderCardSkeleton key={i} orderId={part.input?.orderId} />
                ) : (
                  <ToolError key={i}>The query could not be completed.</ToolError>
                );
              case 'output-available':
                return (
                  <ToolBoundary key={i}>
                    <OrderCard {...part.output} />
                  </ToolBoundary>
                );
              case 'output-error':
                return <ToolError key={i}>The order details could not be fetched.</ToolError>;
              default:
                return null;
            }

          default:
            // Don't let tools this client does not know disappear silently.
            return isToolUIPart(part) ? (
              <pre key={i} data-ui="unknown-tool">
                {getToolName(part)}
              </pre>
            ) : null;
        }
      })}
    </>
  );
}
```

- **The skeleton is fed with the partial input:** in `input-streaming`, `part.input` is partial and the fields can arrive half-finished. The label becomes "Querying the order…", then `ORD`, then `ORD-1042`. Use the partial value for a label only, never for an operation.
- **`ToolBoundary`:** if the output component crashes, only that card falls over. You will see why in the "Persisted messages" section below.
- **The `default` branch:** `isToolUIPart` catches both static and dynamic tool parts. Without that branch, a tool the client does not know draws nothing and the part disappears silently.

## Loading states

The Cloudscape Design System guidance helps when you design the loading indicator. While content (a list, a table, a code block) is streaming, it suggests showing a loading bar where the content will appear with loading text next to it, not showing a loading state for waits under 1 second (it flickers), and pairing the indicator with visible text.[^5] The skeleton in this guide comes with the text "Querying the order…" for that reason.

### Preliminary results

If you make `execute` an async generator, every `yield` becomes a preliminary result and the last `yield` counts as the final one.[^6]

```ts
trackShipment: tool({
  description: 'Fetches the shipping events step by step.',
  inputSchema: z.object({ orderId: z.string() }),
  outputSchema: z.object({ stage: z.enum(['carrier', 'done']), message: z.string() }),
  async *execute({ orderId }) {
    yield { stage: 'carrier' as const, message: 'Querying the carrier…' };
    const order = await orderService.getStatus(orderId);
    yield { stage: 'done' as const, message: `${order.orderId}: ${order.status}` };
  },
}),
```

On the client a preliminary result also arrives as `output-available`. To tell them apart, look at the `part.preliminary` flag: it is `true` on a preliminary result and `false` on the final one. On screen the order runs like this: the skeleton, "Querying the carrier…" (preliminary), "ORD-5: shipped" (final).

```tsx
case 'tool-trackShipment':
  if (part.state === 'output-available') {
    return (
      <p key={i} data-preliminary={String(part.preliminary === true)}>
        {part.output.message}
      </p>
    );
  }
  return part.state === 'output-error' ? (
    <ToolError key={i}>The shipping events could not be fetched.</ToolError>
  ) : live ? (
    <OrderCardSkeleton key={i} />
  ) : (
    <ToolError key={i}>The query could not be completed.</ToolError>
  );
```

### A loading state that gets stuck

> [!WARNING]
>
> If `stop()` is called, the tool part stays in `input-streaming` while `status` goes back to `ready`. The part does not move into an error or result state on its own. If you persist the message and load it later, the skeleton spins forever. Show the skeleton only while the stream is running, and only on the last message.

The `live` flag derived from `status` takes care of that (the `live` prop in `MessageParts`):

```tsx
// app/genui/chat.tsx (the form is as in the previous guide)
const { messages, sendMessage, status } = useChat<GenMessage>({
  id,
  messages: initialMessages,
  transport: new DefaultChatTransport({ api: '/api/genui' }),
});
const live = status === 'submitted' || status === 'streaming';

return messages.map((message, index) => (
  <MessageParts key={message.id} message={message} live={live && index === messages.length - 1} />
));
```

## Error states

| Situation | Where it comes from | The UI fix |
| --- | --- | --- |
| `output-error` | `execute` failed, or the model sent input that does not match the schema | A fixed, understandable error card |
| A component crash | The output is not the shape the component expects | `ToolBoundary` |
| An unrecognized tool | The client does not know this tool | The fallback card in the `default` branch |
| The stream was cut off mid-way | `stop()` | The `live` flag |

- **`output-error`:** the docs show `part.errorText`.[^1] Without an `onError` on `toUIMessageStream` that text is `An error occurred.`; with one, it is your text.[^4] When the input does not match the schema, `part.input` is the model's raw, invalid input and its type cannot be trusted. Don't pass it to the component.
- **A component crash:** if a persisted output is not the shape the component expects (a `status` value that is no longer in the enum, say), `STATUS[status].toUpperCase()` throws. Without `ToolBoundary` that error takes the whole chat down. With the boundary, only that card becomes "This result cannot be shown." and the message's text stays visible.

> [!DONT]
>
> Show the raw error text or the error object to the user. Messages coming from `execute` can carry internal information about the server.

> [!DO]
>
> Write a fixed, understandable message per tool ("The order details could not be fetched.") and log the detail on the server.

## Persisted messages

Because tool parts are plain data, you can persist the messages and load them back with `useChat`'s `messages` option. Store them in `useChat`'s format (`UIMessage`), not as `ModelMessage`, because that keeps the fields the interface needs.[^7]

Components and schemas change over time, and old records may not match the new schemas. While loading, validate the history against the current tool schemas with `validateUIMessages`. For messages that do not match, a `TypeValidationError` is thrown:[^7]

```ts
// app/genui/load-chat.ts
import { TypeValidationError, validateUIMessages } from 'ai';
import { tools } from './tools';
import type { GenMessage } from './types';

export async function loadValidated(stored: unknown[]): Promise<GenMessage[]> {
  try {
    return await validateUIMessages<GenMessage>({ messages: stored, tools });
  } catch (error) {
    if (TypeValidationError.isInstance(error)) {
      console.error('Stored messages do not match the current schemas', error);
      return []; // or migrate or filter the messages
    }
    throw error;
  }
}
```

The two safeguards complement each other: `validateUIMessages` catches a schema mismatch while the history is loaded on the server, and `ToolBoundary` stops an unexpected output that reaches the screen anyway from taking the whole chat down.

## Try it yourself

1. Set up the `getOrderStatus` tool and `OrderCard`. Put an artificial delay inside `orderService.getStatus` and watch how the skeleton fills in from the partial input.
2. Remove the `live` flag, call `stop()` while a response is streaming and see the skeleton get stuck. Then put `live` back.
3. In a persisted message, change the `status` value to something outside the enum. Compare how `ToolBoundary` catches it with how `validateUIMessages` does.
4. Add the `trackShipment` tool and use `part.preliminary` to show the move from a preliminary to a final result on screen.

## Sources

1. [AI SDK: Generative User Interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) *(doc)* — Passing the tool result to a component as props, and rendering `tool-<name>` parts.
2. [Builder.io: Designing generative UI in an agent-native world](https://www.builder.io/blog/designing-generative-ui-in-an-agent-native-world) *(article)* — Mapping tool calls to components you already have, and the cost of generating code on every request (May 26, 2026).
3. [AI SDK: RSC Overview](https://ai-sdk.dev/docs/ai-sdk-rsc/overview) *(doc)* — AI SDK RSC's experimental status and the recommendation of AI SDK UI.
4. [AI SDK: Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) *(doc)* — Tool part states, the partial input stream and masking the error message.
5. [Cloudscape Design System: Generative AI loading states](https://cloudscape.design/patterns/genai/genai-loading-states/) *(doc)* — The processing and streaming stages, the loading indicator, waits under 1 second and accessibility.
6. [AI SDK: Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) *(doc)* — An async generator `execute` for preliminary results.
7. [AI SDK: Chatbot Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence) *(doc)* — Persisting messages, the `messages` option and `validateUIMessages`.
