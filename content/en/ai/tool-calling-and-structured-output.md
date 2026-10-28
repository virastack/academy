---
title: "Tool calling and structured output"
description: "The model calling a function, structured output with a Zod schema, and user approval."
lastVerified: "2026-10-15"
translationKey: "ai/tool-calling-and-structured-output"
---

A model does more than produce text. It can do two other things: ask for a function to be called (tool calling) and make its output fit a schema (structured output). In tool calling, the model asks for the function you defined to be called with its input, the SDK runs the function and gives the result back to the model.[^1] In frontend work that means: the model querying an order's status from the real service, asking the user before an irreversible operation, and extracting form fields from free text.

> [!NOTE]
>
> The code in this guide was run with `ai@7.0.140` and `@ai-sdk/react@4.0.143`. For the route, `useChat` and the streaming setup, read [The AI SDK and streaming chat](/academy/ai/ai-sdk-and-streaming-chat) first. The examples run on an e-commerce order assistant.

Tools fall into three groups, by whether they have an `execute` function and whether they need approval:

| Tool type | `execute` | Who runs it | Example |
| --- | --- | --- | --- |
| A server tool | Yes | The server, when the model calls it | `getOrderStatus` |
| A client tool | No | The UI, through user interaction[^1][^2] | `pickSize` |
| An approved tool | Yes, plus `toolApproval` | The server, after the user approves[^2] | `cancelOrder` |

## Defining a tool

```ts
// app/assistant/tools.ts
import { tool } from 'ai';
import { z } from 'zod';

export const tools = {
  getOrderStatus: tool({
    description: 'Returns the shipping status of an order.',
    inputSchema: z.object({
      orderId: z.string().describe('The order number, e.g. ORD-1042'),
    }),
    execute: async ({ orderId }) => ({
      orderId,
      status: 'shipped',
      eta: '2026-10-18',
    }),
  }),

  cancelOrder: tool({
    description: 'Cancels an order. This cannot be undone.',
    inputSchema: z.object({ orderId: z.string() }),
    execute: async ({ orderId }) => {
      // In reality: await orderService.cancel(orderId)
      return { orderId, cancelled: true };
    },
  }),
};
```

- **`description`:** the model decides when to call the tool by reading this.[^1] Warnings like "this cannot be undone" go here. [Matt Pocock](https://www.mattpocock.com)'s course also describes this field as the one that tells the model what to use the tool for.[^3]
- **`inputSchema`:** a Zod schema. The model sees the schema and the SDK validates the incoming input against it.[^1] You can add hints to the fields with `.describe()`. The text appears as `description` in the schema that goes to the model.
- **`execute`:** called with the validated input. Whatever you return goes back to the model.
- **`steps`:** `generateText`'s result has a `toolCalls` and a `toolResults` field for every step. Pocock suggests using it for debugging.[^3] In a two-step mock flow, `result.steps[0].toolCalls` gave the call's name and input, and `toolResults` gave the value `execute` returned.

## The route: the tool loop

```ts
// app/api/assistant/route.ts
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { tools } from '../../assistant/tools';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    instructions: 'You are an order assistant. If a cancellation is requested, call the cancelOrder tool.',
    messages: await convertToModelMessages(messages),
    tools,
    toolApproval: { cancelOrder: 'user-approval' },
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

A step is one generation by the model plus running the local tools it called.[^1] The tool result goes back to the model and the model interprets it in the second step.

> [!WARNING]
>
> Without `stopWhen`, the loop ends after a single step.[^1] The tool runs but the model never reaches the second step where it would interpret the result: `text` stays empty and `finishReason` becomes `tool-calls`. Add `stopWhen: isStepCount(n)` to every route that uses tools. The `stepCountIs(n)` from older tutorials still works, but the name in the current docs is `isStepCount`.

### Errors

| Situation | What happens |
| --- | --- |
| The model sends input that does not match the schema | Nothing is thrown; a `tool-error` part is produced and the loop continues |
| `execute` throws | The same: a `tool-error`, and the model can run one more round and explain the situation[^1] |

In the UI, `tool-error` appears as the `output-error` state. The detail is in the client section below.

> [!WARNING]
>
> The message of an error you throw inside `execute` goes to the model as it is (`Error: ...`). The UI, on the other hand, gets only `An error occurred.` by default, and you can change that with `toUIMessageStream({ onError })`.[^2] So masking it in the UI does not stop it leaking to the model. Log the error and rethrow it with a generic message:

```ts
execute: async ({ orderId }) => {
  try {
    return await fetchOrderStatus(orderId);
  } catch (error) {
    console.error('[getOrderStatus]', error); // the real error only in the server log
    throw new Error('The order service cannot be reached right now.');
  }
},
```

## The client: showing the tool in the UI

Tool calls arrive inside `message.parts` as parts of type `tool-<tool name>`. Every part carries a `state`, and you draw the UI from that state:[^2]

| `state` | Meaning |
| --- | --- |
| `input-streaming` | The model is still producing the input |
| `input-available` | The input is ready and the tool is waiting or running |
| `approval-requested` | The tool is waiting for the user's approval |
| `approval-responded` | The approval decision has been made |
| `output-available` | The tool produced a result |
| `output-error` | The tool failed |
| `output-denied` | The call was refused |

The docs suggest handling every state, even for tools that need no approval.[^2] To get the part and state types inferred, give your tools to `UIMessage`:

```ts
// app/assistant/types.ts
import type { InferUITools, UIMessage } from 'ai';
import type { tools } from './tools';

export type AssistantMessage = UIMessage<never, never, InferUITools<typeof tools>>;
```

```tsx
// app/assistant/parts.tsx
import type { ChatAddToolApproveResponseFunction } from 'ai';
import type { AssistantMessage } from './types';

export function MessageParts({
  message,
  onApproval,
}: {
  message: AssistantMessage;
  onApproval: ChatAddToolApproveResponseFunction;
}) {
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
                return <p key={i}>Querying the order…</p>;
              case 'output-available':
                return <p key={i}>{part.output.orderId}: {part.output.status}</p>;
              case 'output-error':
                return <p key={i}>The order could not be queried.</p>;
              default:
                return null;
            }

          case 'tool-cancelOrder':
            switch (part.state) {
              case 'approval-requested':
                return (
                  <div key={i}>
                    <p>Cancel order {part.input.orderId}?</p>
                    <button onClick={() => onApproval({ id: part.approval.id, approved: true })}>
                      Yes, cancel it
                    </button>
                    <button onClick={() => onApproval({ id: part.approval.id, approved: false })}>
                      Dismiss
                    </button>
                  </div>
                );
              case 'output-available':
                return <p key={i}>The order was cancelled.</p>;
              case 'output-denied':
                return <p key={i}>Not cancelled.</p>;
              case 'output-error':
                return <p key={i}>The cancellation failed.</p>;
              default:
                return null;
            }

          default:
            return null;
        }
      })}
    </>
  );
}
```

Thanks to the narrowing on `part.state`, `part.input`, `part.output` and `part.approval` come out with the right type in every state.

## User approval

Approval stops the model from running an irreversible or costly tool without asking the user. On the server you say which tool needs approval with `toolApproval` (the `toolApproval: { cancelOrder: 'user-approval' }` line in the route). On the client you need two things: an approval UI and `sendAutomaticallyWhen`.[^2]

```tsx
// app/assistant/panel.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { MessageParts } from './parts';
import type { AssistantMessage } from './types';

export default function Assistant() {
  const { messages, addToolApprovalResponse } = useChat<AssistantMessage>({
    transport: new DefaultChatTransport({ api: '/api/assistant' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  return messages.map(message => (
    <MessageParts key={message.id} message={message} onApproval={addToolApprovalResponse} />
  ));
}
```

The flow works like this:

- **While approval is pending:** the part is `approval-requested`. `execute` has not run yet and the model's stream stops there.
- **If it is approved:** after `addToolApprovalResponse({ id, approved: true })`, `execute` runs, the part becomes `output-available` and the model interprets the result in the second step.
- **If it is refused:** the part becomes `output-denied` and `execute` never runs. The model sees the refusal as an `execution-denied` result. If you pass a `reason`, that text goes to the model too.[^1]
- **Tools without approval:** tools that are not in `toolApproval` (such as `getOrderStatus`) run straight away.

> [!WARNING]
>
> Without `sendAutomaticallyWhen`, nothing happens after the approval: the part stays at `approval-responded`, `execute` does not run and the model is not called a second time.[^2] Either pass that option or call `sendMessage` yourself after the approval.

Instead of putting every call behind approval, you can decide case by case. If the function returns `'user-approval'`, approval is requested; if it returns `undefined`, the tool runs straight away:[^1]

```ts
toolApproval: {
  cancelOrder: async ({ orderId }) => (orderId.startsWith('VIP') ? 'user-approval' : undefined),
},
```

> [!NOTE]
>
> The `tool({ needsApproval: true })` from older tutorials is deprecated. Approval is now given with `toolApproval` at the `generateText` and `streamText` level.[^1]

> [!DONT]
>
> Leave the authorization check to the approval button. The approval decision is made on the client. If you do not verify on the server, inside `execute`, that the user owns that order, approval is not a security measure.

> [!DO]
>
> Use approval for the question "does the user really want this?" and check authorization on the server. For sensitive tools the docs suggest the `experimental_toolApprovalSecret` option: the server verifies that it issued the approval itself. Because the option is experimental, it was not exercised in this guide's examples.[^2]

## Client tools

When you want to get a choice from the user, define the tool without an `execute`. The call does not run on the server; it lands in the UI, and you return the result once the user picks.[^1][^2]

```ts
pickSize: tool({
  description: 'Lets the user pick a size.',
  inputSchema: z.object({ options: z.array(z.string()).describe('Selectable sizes') }),
  outputSchema: z.string(), // no execute: this determines addToolOutput's type
}),
```

```tsx
type SizeMessage = UIMessage<never, never, InferUITools<typeof clientTools>>;

const { messages, addToolOutput } = useChat<SizeMessage>({
  transport: new DefaultChatTransport({ api: '/api/assistant' }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
});

// inside message.parts.map:
if (part.type !== 'tool-pickSize' || part.state !== 'input-available') return null;
return (
  <div key={`${message.id}-${i}`}>
    {part.input.options.map(size => (
      <button
        key={size}
        onClick={() => addToolOutput({ tool: 'pickSize', toolCallId: part.toolCallId, output: size })}
      >
        {size}
      </button>
    ))}
  </div>
);
```

- **`outputSchema`:** without it on a tool that has no `execute`, the `output` type is `undefined` and `addToolOutput` will not compile.
- **`sendAutomaticallyWhen`:** here you use `lastAssistantMessageIsCompleteWithToolCalls`. Once every tool result is ready, the model continues automatically.[^2]
- **Don't `await` it:** `await`ing `addToolOutput` inside `onToolCall` can deadlock. In an event handler such as a button click there is no problem.[^2]

## Structured output

When no tool is needed and only the shape of the output matters, use `output`. The example below classifies a support message:

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

const ticketSchema = z.object({
  intent: z.enum(['order_status', 'return', 'other']),
  orderId: z.string().nullable(),
  urgent: z.boolean(),
});

export async function classify(text: string) {
  const { output } = await generateText({
    model: 'anthropic/claude-sonnet-5.5',
    output: Output.object({ schema: ticketSchema }),
    prompt: text,
  });
  return output; // { intent: 'order_status' | 'return' | 'other'; orderId: string | null; urgent: boolean }
}
```

`output` comes with its type inferred from the schema and is validated against it.[^4] There are five output types:[^4]

| Output | What it gives you |
| --- | --- |
| `Output.object({ schema })` | A single object matching the schema |
| `Output.array({ element })` | An array of elements matching the schema (with `minItems`, `maxItems`) |
| `Output.choice({ options })` | One of the options you gave |
| `Output.json()` | Valid JSON only; the structure is not validated |
| `Output.text()` | Plain text, the default when no `output` is given |

- **Output that does not match the schema:** `NoObjectGeneratedError` is thrown. The `text` on the error object gives you the model's raw output and helps with debugging.[^4]
- **Together with tools:** producing the output counts as a step too. If `stopWhen` is not generous enough, reaching `result.output` throws `NoOutputGeneratedError`.[^4]
- **The old API:** `generateObject` and `streamObject` are deprecated. Use `output` with `generateText` and `streamText` instead.

### Streaming structured output

The same `output` setting works as a stream with `streamText`:

```ts
import { Output, streamText } from 'ai';
import { z } from 'zod';

const recipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  minutes: z.number(),
});

export async function streamRecipe() {
  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    output: Output.object({ schema: recipeSchema }),
    prompt: 'Give me a lentil soup recipe.',
  });

  for await (const partial of result.partialOutputStream) {
    console.log(partial); // { title?: string; ingredients?: string[]; minutes?: number }
  }

  return await result.output; // the final value, validated against the schema
}
```

- **Half-finished values:** `partialOutputStream` gives you the partial object as it stands at any moment. Because it is not validated, it can contain half-finished values like `ingredients: ['lentils', 's']`.[^4] Use it for a preview only, and wait for `await result.output` before saving or processing anything.
- **Element by element:** with `Output.array`, `elementStream` gives you only the completed and validated elements.[^4] That suits adding list-type results to the screen card by card.
- **On the client:** `@ai-sdk/react` has `useObject` for binding the streaming object straight to a hook.[^4]

### Schema descriptions and limits

The `.describe()` text you write on a Zod field appears as `description` in the JSON schema that goes to the model. [Matt Pocock](https://www.mattpocock.com) says this hint helps especially when the field names are not self-explanatory. His example is written with `generateObject` and the page was updated in January 2025. The concept holds for `Output.object` too; the API is just old.[^5]

A provider may not support the whole schema. In JSONSchemaBench's comparison (January 2025) across 10,000 real JSON schemas, OpenAI's and Gemini's schema coverage came out lowest. The authors put that down to a "more conservative" strategy, that is, supporting only a subset of the schema features.[^6]

A format constraint can also affect reasoning. Tam et al.'s study reports that format constraints such as JSON lower LLMs' reasoning performance significantly, and that the drop grows as the constraint tightens (August 2024).[^7] This is a single study.

> [!TIP]
>
> Try the schema with a real provider in one call. On tasks that need reasoning, compare the `Output.object` version with a free-text version on your own examples and see whether the accuracy drops.

## Which one should you pick?

| What you need | The route |
| --- | --- |
| The model should get data from a real system, or cause a side effect | A server tool |
| A choice or some information should come from the user | A client tool (no `execute`) |
| An irreversible or costly operation | A server tool and `toolApproval` |
| The answer should be data matching a schema (classification, filling a form) | `Output.object` |
| The answer should be one of a known set of options | `Output.choice` |

When you choose a model, you can compare tool-calling accuracy on the Berkeley Function Calling Leaderboard. According to the page, V3 added multi-turn interactions, V4 is described as a "holistic agentic evaluation", and the page was updated on April 12, 2026.[^8]

## Compared with old tutorials

| What you see in an old tutorial | The current equivalent |
| --- | --- |
| `generateObject`, `streamObject` | `output: Output.object(...)` with `generateText`, `streamText` |
| `parameters:` | `inputSchema:` |
| `maxSteps: 5` | `stopWhen: isStepCount(5)` |
| `stepCountIs(5)` | `isStepCount(5)` (the old name remains as an alias) |
| `needsApproval` (inside the tool) | `toolApproval` (at the call level) |
| `addToolResult` | `addToolOutput` |
| `message.toolInvocations` | `tool-<tool name>` parts inside `message.parts` |

## Try it yourself

1. Add the `getOrderStatus` tool and try it first without `stopWhen`: the tool runs but the response text stays empty. Then add `stopWhen: isStepCount(5)` and see the difference.
2. Add `toolApproval` for `cancelOrder`, deliberately remove `sendAutomaticallyWhen` and watch why the stream stops after the approval. Then put it back.
3. Throw an error from inside `execute` and look at what appears in the UI. Then log the error and rethrow it with a generic message.
4. Write an `Output.object` that extracts form fields from free text. Produce output that does not match the schema on purpose, catch the `NoObjectGeneratedError` and log `error.text`.

## Sources

1. [AI SDK: Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) *(doc)* — `tool()`, `inputSchema`, `stopWhen`, error behaviour and `toolApproval`.
2. [AI SDK: Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) *(doc)* — Tool parts and their states in `useChat`, `addToolOutput`, the approval UI and `sendAutomaticallyWhen`.
3. [Matt Pocock (AI Hero): Tool Calls with Vercel AI SDK](https://www.aihero.dev/tool-calls-with-vercel-ai-sdk) *(article)* — `tool()`, `description` and debugging with `steps`. The page was updated on January 7, 2025.
4. [AI SDK: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) *(doc)* — `Output.object`, `Output.array`, `Output.choice`, streaming and the error types.
5. [Matt Pocock (AI Hero): Structured Outputs with Vercel AI SDK](https://www.aihero.dev/structured-outputs-with-vercel-ai-sdk) *(article)* — A Zod schema and field hints with `describe`. The page was updated on January 5, 2025.
6. [Geng et al.: JSONSchemaBench](https://arxiv.org/abs/2501.10868) *(research)* — The coverage of constrained decoding frameworks and providers across 10,000 real JSON schemas.
7. [Tam et al.: Let Me Speak Freely?](https://arxiv.org/abs/2408.02442) *(research)* — The effect of format constraints on LLM reasoning performance.
8. [Berkeley Function Calling Leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) *(research)* — The leaderboard that measures tool-calling accuracy, V4.
