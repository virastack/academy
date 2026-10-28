---
title: "The AI SDK and streaming chat"
description: "useChat, streamText, choosing a model provider and reflecting a streaming response in the UI."
lastVerified: "2026-10-15"
translationKey: "ai/ai-sdk-and-streaming-chat"
---

Showing the AI's response piece by piece as the model produces it, instead of waiting for the whole thing, is the foundation of a chat interface: the user starts seeing the answer the moment any of it is ready.[^1] The AI SDK splits that job in two. On the server, `streamText` calls the model; on the client, `useChat` turns the incoming stream into message state.[^1]

> [!NOTE]
>
> The code in this guide was run with `ai@7.0.140` and `@ai-sdk/react@4.0.143`; both were the `latest` version on npm on October 15, 2026.[^2] Fields from older tutorials such as `input`, `handleSubmit` and `append` no longer exist on the object `useChat` returns. Their equivalents are in the table at the end of the guide.

| Part | Where | What it does |
| --- | --- | --- |
| `streamText` | Server | Calls the model and produces the response as a stream |
| `toUIMessageStream` + `createUIMessageStreamResponse` | Server | Turns the stream into the message parts `useChat` understands, and into an HTTP response |
| `DefaultChatTransport` | Client | POSTs the messages to `/api/chat` by default[^1] |
| `useChat` | Client | Holds the `messages`, `status` and `error` state[^1] |

## Setup

```bash
pnpm add ai @ai-sdk/react
```

The provider packages (`@ai-sdk/anthropic` and the like) are only needed if you are going to call the model from the provider directly instead of through the AI Gateway. You will see that in the "Choosing a model provider" section below.

## The server: a route handler with streamText

```ts
// app/api/chat/route.ts
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    instructions: 'You are an assistant that answers briefly and clearly.',
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

- **`UIMessage[]`:** the client sends UI messages that carry `parts`. `convertToModelMessages` turns them into the form the model understands. The function is async, so it needs `await`.[^1]
- **`instructions`:** the system instruction. It used to be called `system`; in v7 `system` still works but is deprecated.
- **`result.stream`:** the stream of parts the model produces. `toUIMessageStream` turns it into UI message parts, and `createUIMessageStreamResponse` into an SSE response.
- **`maxDuration`:** in Next.js this sets, in seconds, how long the stream may run without being cut off.[^1] If you use another framework, use its equivalent.

> [!WARNING]
>
> In older tutorials you will see `result.toUIMessageStreamResponse()`. In v7 the method works but is deprecated and will be removed in the next major version. Use the two helpers above in new code.

## The client: useChat

```tsx
// app/chat.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Chat() {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');
  const busy = status === 'submitted' || status === 'streaming';

  return (
    <>
      {messages.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? 'You: ' : 'AI: '}
          {message.parts.map((part, index) =>
            part.type === 'text' ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      {error && (
        <button type="button" onClick={() => regenerate()}>
          Try again
        </button>
      )}

      {busy && (
        <button type="button" onClick={() => stop()}>
          Stop
        </button>
      )}

      <form
        onSubmit={e => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={status !== 'ready'}
        />
        <button type="submit" disabled={status !== 'ready'}>
          Send
        </button>
      </form>
    </>
  );
}
```

- **The input is your own state:** `useChat` does not manage the input. The docs use `useState` too.[^1]
- **`message.parts`:** render the message with `parts`, not `content`. The parts carry different types such as text, a tool call and a tool result.[^1] While streaming, an assistant message also contains non-text parts like `step-start`, so look at `part.type` and ignore what you don't recognize.
- **`sendMessage({ text })`:** adds the user's message and sends the request.

`status` takes one of four values:[^1]

| `status` | Meaning | In the UI |
| --- | --- | --- |
| `submitted` | The request went out, the stream has not started | A spinner or a "typing" indicator |
| `streaming` | Parts are arriving | The text grows, the Stop button appears |
| `ready` | The response is complete | The Send button is enabled |
| `error` | The request failed | An error message and Try again |

> [!TIP]
>
> The Cloudscape Design System separates the "processing" and "streaming" stages: show a loading indicator in the chat bubble while the model has produced no output yet, and once the text starts streaming leave a visible indicator until the response ends, because if the stream slows down the user has to be able to tell it is still going. Don't show a loading state for waits under 1 second; it flickers.[^3] `submitted` corresponds to the first stage and `streaming` to the second. The `Chat` component above does not implement that 1-second delay.

## Stopping, regenerating and errors

```tsx
<button
  type="button"
  onClick={() => stop()}
  disabled={status !== 'streaming' && status !== 'submitted'}
>
  Stop
</button>

<button
  type="button"
  onClick={() => regenerate()}
  disabled={status !== 'ready' && status !== 'error'}
>
  Regenerate
</button>
```

- **`stop()`:** cancels the request.[^1] The text that arrived up to that point stays on screen, `status` goes back to `ready`, and the `onFinish` event carries `isAbort: true`.
- **`regenerate()`:** regenerates the last assistant message and puts it in place of the old one.[^1]

### The error message

If something goes wrong on the server, a masked message goes to the client by default: `An error occurred.`[^1] Give your own message with `onError` inside `toUIMessageStream`:

```ts
toUIMessageStream({
  stream: result.stream,
  onError: error => {
    console.error(error); // log the real error on the server
    return 'Something went wrong. Please try again.';
  },
});
```

On the client the error appears in the `error` object `useChat` returns and `status` becomes `error`. You can try again with `regenerate()`.[^1]

> [!DONT]
>
> Return `error.message` to the user as it is inside `onError`. Error messages can carry internal information about the server.

> [!DO]
>
> Show the user a generic message and log the detail on the server. The docs also suggest a generic message so nothing leaks from the server.[^1]

## Choosing a model provider

The AI SDK hides providers behind a common model interface. That is why you can change provider without changing your `streamText` call.[^4] The `model` field can be given in three forms:

| Route | `model` value | Authentication | When |
| --- | --- | --- | --- |
| A Gateway string | `'anthropic/claude-sonnet-5.5'` | `AI_GATEWAY_API_KEY`, OIDC on Vercel[^5] | Many providers behind one key, request logs, a spending limit |
| A provider package | `anthropic('claude-sonnet-5-5')` | `ANTHROPIC_API_KEY`[^6] | Connecting to the provider directly |
| A global default provider | `'gpt-6-astra'` (no prefix) | The key of the provider you chose | Using a single provider without writing a prefix |

When you give a plain string, the AI SDK uses the global provider, and the default global provider is the AI Gateway.[^7]

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// 1) Gateway: a plain "provider/model" string
streamText({ model: 'anthropic/claude-sonnet-5.5', messages });

// 2) A provider package
streamText({ model: anthropic('claude-sonnet-5-5'), messages });

// 3) A global default provider: set it once when the app starts
globalThis.AI_SDK_DEFAULT_PROVIDER = openai;
streamText({ model: 'gpt-6-astra', messages });
```

> [!WARNING]
>
> The same model is written two different ways. In a Gateway string the version number has a dot (`claude-sonnet-5.5`),[^1] and in a provider package a hyphen (`claude-sonnet-5-5`).[^6] Write the identifier to match the route you use. Model identifiers change often, so check the current list on the provider's page.[^4]

> [!TIP]
>
> If the user is going to choose the model, send only a key from the client and match it against an allowlist on the server. Don't pass a model name from the client straight to `streamText`. To send an extra field with a request, use `body`, `sendMessage`'s second parameter.[^1]

```tsx
sendMessage({ text: input }, { body: { model: 'claude' } });
```

```ts
const MODELS = {
  claude: 'anthropic/claude-sonnet-5.5',
  gpt: 'openai/gpt-6-astra',
} as const;

const { messages, model }: { messages: UIMessage[]; model?: string } =
  await req.json();

// Don't use `model in MODELS`: keys like 'toString' match too.
const key =
  model && Object.hasOwn(MODELS, model)
    ? (model as keyof typeof MODELS)
    : 'claude';

const result = streamText({
  model: MODELS[key],
  messages: await convertToModelMessages(messages),
});
```

## Reflecting the streaming response in the UI

Render the `parts` array by `part.type`. If you want to show the model's reasoning output, pass `sendReasoning: true` on the server and render the `reasoning` part on the client:[^1]

```ts
toUIMessageStream({ stream: result.stream, sendReasoning: true });
```

```tsx
{message.parts.map((part, i) => {
  switch (part.type) {
    case 'text':
      return <p key={i}>{part.text}</p>;
    case 'reasoning':
      return <pre key={i}>{part.text}</pre>;
    default:
      return null;
  }
})}
```

- **How often it renders:** `useChat` publishes an update on every part by default. `useChat({ throttle: 50 })` limits the updates to one every 50 ms.[^1] The old `experimental_throttle` option is deprecated.
- **Usage information:** you can attach things like a timestamp or a token count to the message from the server with `messageMetadata` and read them with `message.metadata`.[^1]
- **Keeping the history on the server:** with `prepareSendMessagesRequest` on `DefaultChatTransport` you can send only the last message and load the history on the server.[^1]
- **A plain-text stream:** if your backend streams plain text only, use `TextStreamChatTransport`. That transport carries no tool calls and no usage information.[^1]

### Streaming text smoothly

The model sometimes sends text in large chunks and the response grows on screen in jumps. `smoothStream` re-splits the parts word by word on the server:

```ts
import { smoothStream, streamText } from 'ai';

const result = streamText({
  model: 'anthropic/claude-sonnet-5.5',
  messages: await convertToModelMessages(messages),
  experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
});
```

With a mock model, the single-chunk text `Hello world this is one sentence` was split into six word parts such as `"Hello "`, `"world "` and `"this "`. A developer-relations author at Upstash explains the idea of separating network timing from screen timing for AI SDK v5. Finding the built-in `experimental_transform` route "inflexible" and "experimental", they write their own hook with `requestAnimationFrame`.[^8] Because a delay is added to every part, the end of the response is delayed too. The author accepts that trade-off.[^8]

### The cost of rendering

If every incoming part means a `setState`, React re-renders every time. A SitePoint article suggests accumulating the parts in a `useRef` and writing to state once per frame with `requestAnimationFrame`.[^9] `useChat`'s `throttle` option approaches the same problem from inside the SDK.

## Testing without a real key

If you wrap the route in a function that takes the model as a parameter, you can run the stream with the mock model in `ai/test`, with no API key and no network:

```ts
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

const model = new MockLanguageModelV4({
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        { type: 'stream-start', warnings: [] },
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'Hello, ' },
        { type: 'text-delta', id: 't1', delta: 'world!' },
        { type: 'text-end', id: 't1' },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 4, text: 4, reasoning: 0 },
          },
        },
      ],
    }),
  }),
});
```

When you call the route with this model, the response arrives as `text/event-stream` and carries the `x-vercel-ai-ui-message-stream: v1` header. The stream you will see in the browser's Network tab is this:

```text
data: {"type":"start"}

data: {"type":"start-step"}

data: {"type":"text-start","id":"t1"}

data: {"type":"text-delta","id":"t1","delta":"Hello, "}

data: {"type":"text-delta","id":"t1","delta":"world!"}

data: {"type":"text-end","id":"t1"}

data: {"type":"finish-step"}

data: {"type":"finish","finishReason":"stop"}

data: [DONE]
```

> [!NOTE]
>
> The mock model's part format (the `finishReason` and `usage` fields) depends on the model specification version. `MockLanguageModelV4`, which `ai@7` uses, was used here. If you get a type error on another major version, look at that version's `ai/test` types.

## Compared with old tutorials

| What you see in an old tutorial | The current equivalent |
| --- | --- |
| `input`, `handleInputChange`, `handleSubmit` | `useState` and `sendMessage({ text })` |
| `append` | `sendMessage` |
| `reload` | `regenerate` |
| `message.content` | `message.parts` |
| `system:` | `instructions:` |
| `result.toUIMessageStreamResponse()` | `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })` |
| `experimental_throttle` | `throttle` |

## Try it yourself

1. Set up the route handler and the `Chat` component. Run it with the mock model first and inspect the SSE stream in the Network tab, then switch to a real model.
2. Add the spinner, the Stop button and the Try again button based on `status`. Press Stop during a long response and look at the text left on screen and at `status`.
3. Give a generic error message with `onError`. Break the provider key on purpose and compare what appears on the client with what appears in the server logs.
4. Switch the same route from the Gateway string to a provider package and note the single line that changes. Notice why the spelling of the model identifier changes.

## Sources

1. [AI SDK: Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) *(doc)* — `useChat`, `status`, the transport, errors, stopping, regenerating, metadata and reasoning.
2. [npm: ai](https://www.npmjs.com/package/ai) *(article)* — The current version and the dist-tags.
3. [Cloudscape Design System: Generative AI loading states](https://cloudscape.design/patterns/genai/genai-loading-states/) *(doc)* — The processing and streaming stages, the loading indicator, waits under 1 second and accessibility.
4. [AI SDK: Providers and Models](https://ai-sdk.dev/docs/foundations/providers-and-models) *(doc)* — The provider architecture, the provider packages and the model capability table.
5. [Vercel: AI Gateway](https://vercel.com/docs/ai-gateway) *(doc)* — Using a plain string model through the Gateway, the API key and OIDC.
6. [AI SDK: Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) *(doc)* — Setup, `ANTHROPIC_API_KEY` and the model identifiers.
7. [AI SDK: Provider & Model Management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management) *(doc)* — The global provider and `AI_SDK_DEFAULT_PROVIDER`.
8. [Upstash: Smooth Text Streaming in AI SDK v5](https://upstash.com/blog/smooth-streaming) *(article)* — Separating network timing from screen timing, `smoothStream` and the custom hook approach.
9. [SitePoint: Streaming Backends & React: Controlling the Re-render Chaos](https://www.sitepoint.com/streaming-backends-react-controlling-re-render-chaos/) *(article)* — The cost of re-rendering during a stream, and accumulating with `useRef` and `requestAnimationFrame`.
