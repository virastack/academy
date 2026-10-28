---
title: "Models and tools"
description: "Model types, their strengths and weaknesses; chat, editor and terminal-based tools."
lastVerified: "2026-10-26"
translationKey: "ai/models-and-tools"
---

In frontend development, AI has two layers:

- **The model:** the AI that produces the code *(e.g. the [!claude], [!gpt], [!gemini] versions)*.
- **The tool:** the interface that reads files, understands the project and runs commands *(e.g. [!cursor], [!claudeCode])*.

The model you pick decides most of the quality of the code you get. The tool matters too: the same model can give different results in different tools, because each one sends the model a different context. You will see this in the [Prompt and context engineering](/academy/ai/prompt-and-context-engineering) guide.

On the tool side, the real split is between chat and agent. If you have a chat tool write a `useCart` hook, you copy the code into the project yourself. An agent *([!claudeCode], or [!cursor]'s agent mode)* writes the same hook straight into the file, runs the test and fixes it itself when something breaks[^1].

## AI companies and the model leaderboard

The ranking tables below are built from the Frontend filter of the Arena AI site's WebDev leaderboard, as it stood on October 16, 2026[^2]. Arena is a coding leaderboard where users compare the interfaces two models built and vote. New tests and votes can move the ranking daily; check the site for the current results.

### Company ranking

Looking at the Arena AI data by the company that develops the model *(October 16, 2026, 782,515 votes across 145 models)*, the table is this:

| Rank | Company | Best model | Model score |
| --- | --- | --- | ---: |
| 1. | [!anthropic] Anthropic | **Claude Opus 5.5** | 1,850 |
| 2. | [!openai] OpenAI | **GPT-6 Astra** | 1,799 |
| 3. | [!google] Google | **Gemini 4 Argon** | 1,688 |
| 4. | [!qwen] Alibaba | **Qwen 3.8** | 1,686 |
| 5. | [!meta] Meta | **Muse Spark 1.3** | 1,673 |

### Model ranking

The same evaluation, ranked by model *(October 16, 2026, 782,515 votes across 145 models)*, looks like this:

| Rank | Model | Score | Price *(input / output, $ / 1M tokens)* |
| --- | --- | --- | ---: |
| 1. | [!claude] **Claude Opus 5.5**<br>Anthropic | 1,850 | $4 / $20 |
| 2. | [!claude] **Claude Sonnet 5.5**<br>Anthropic | 1,807 | $2 / $10 |
| 3. | [!openai] **GPT-6 Astra**<br>OpenAI | 1,799 | $10 / $50 |
| 4. | [!claude] **Claude Fable 5.1**<br>Anthropic | 1,775 | $10 / $50 |
| 5. | [!openai] **GPT-6.1 Sol**<br>OpenAI | 1,769 | $2 / $10 |
| 8. | [!gemini] **Gemini 4 Argon**<br>Google | 1,688 | $2 / $10 |
| 10. | [!qwen] **Qwen 3.8**<br>Alibaba | 1,686 | $2 / $6 |
| 13. | **Muse Spark 1.3**<br>Meta | 1,673 | $1.25 / $4.25 |
| 29. | [!claude] **Claude Haiku 5.5**<br>Anthropic | 1,603 | $0.10 / $0.50 |

Two things to keep in mind while you read the table:

- The scores are mostly measured with the models' highest effort setting *(max or xhigh)*. In daily use, a lower setting can mean a lower score[^2].
- The same model's place in the general WebDev leaderboard, or under the React filter, can be different.

For frontend work the [!claude] models sit at the top of the leaderboard. Within that family, [!claude] **Sonnet 5.5** strikes the balance between price and performance.

Anthropic describes **Sonnet 5.5** as the faster, cheaper counterpart to **Opus 5.5**. **Opus 5.5** is for complex work that needs careful judgement, while **Sonnet 5.5** suits well-defined daily tasks and bug fixing[^3].

## Model tiers

Models fall into three tiers along the axes of power, latency and cost.

- **The strongest tier.** For complex reasoning, designing a system architecture from scratch and hard debugging. Expensive and relatively slow. Example: [!claude] **Opus 5.5**, **GPT-6 Astra**.
- **The balanced tier.** The main choice for writing day-to-day components and hooks, building features and reviewing code. The tier with the best balance of speed, cost and quality. Example: [!claude] **Sonnet 5.5**, **GPT-6.1 Sol**.
- **The fast, cheap tier.** For mechanical work that needs low latency: bulk import updates, type fixes and clearing lint errors. Example: [!claude] **Haiku 5.5**, **GPT-6 Luna** *($0.10 / $0.50)*.

Reasoning models are strong on multi-step, complex work but are generally slower and more expensive. Small models are faster and cheaper[^4].

> [!TIP]
>
> Picking a big model for simple work spends more tokens and, because the per-token price is higher, makes the same job cost more. Output tokens are usually 3 to 5 times more expensive than input[^5][^6]. So pick the model to match how hard the job is.

## Model or effort?

The **model** sets the ceiling of what is possible. **Effort** sets how much work the model puts in: how many files it reads, how much it verifies[^6]. For most work the default setting is enough.

When the result comes out wrong, ask yourself: does the model not know, or did it not try hard enough? Say `CartSummary` is calculating the total incorrectly:

- If the model patched something on the surface without reading the relevant file, the problem is **effort**. Raise it.
- If it read the files and ran the test and is still getting it wrong, the problem is the **model**. Move up a tier[^6].

Google's [!gemini] 3 guide says something similar: the model already thinks on its own. Telling it to "think very hard" can improve performance but it spends extra thinking tokens[^7].

## Tool types

Tools are usually grouped by where they run. The lines are blurring: alongside the terminal, [!claudeCode] also runs as an IDE extension, on the desktop and on the web[^8].

| Tool type | How it works | Example | When |
| --- | --- | --- | --- |
| Chat | You talk in a browser or an app and copy the code yourself | [!claude][!chatGpt][!gemini] | Getting ideas, learning a concept, a short snippet |
| Editor | Runs inside your code editor, with completion, chat and an agent mode | [!cursor][!copilot] | Daily coding, seeing a change as a diff and approving it |
| Terminal | Reads the project, edits files, runs commands and tests | [!claudeCode][!codex][!geminiCli] | Multi-file work, writing and running tests, the debugging loop |

> [!WARNING]
>
> Do not paste API keys, the contents of `.env` or customer data into a chat. At work, follow your company's AI policy.

## A real scenario: an e-commerce cart flow

Here is how you can apply this tier logic and these model choices while building the cart and checkout of an online store.

| Task | Tier and tool | Why |
| --- | --- | --- |
| Designing the cart and checkout architecture | The strongest tier ([!claude] **Opus**) + terminal *(CLI)* or chat | Getting stock consistency, state management and the security steps right needs deep reasoning. |
| Writing the `CartItem` component and the `useCart` hook | The balanced tier ([!claude] **Sonnet**) + editor *([!cursor] or [!copilot])* | In daily interface work, what matters is high code quality at a reasonable speed and cost. |
| Updating import paths across 30 files | The fast, cheap tier ([!claude] **Haiku**) + terminal *(CLI)* or editor | Mechanical updates that carry no logical risk should not go to an expensive model. |

## The model's limits

However strong a model is, it has four limits. Knowing them tells you how far to trust its output.

- **Its knowledge stops at its training date.** When the installed library is newer than what the model knows, it suggests the old API. You saw the Next.js examples of this in the [Next.js with AI agents](/academy/nextjs/ai-agents) lesson. The fix is to put the current docs in its context.
- **It can make things up.** It can suggest a prop, a function or a package that does not exist. A study of 576,000 code samples generated by 16 models found that commercial models suggested non-existent packages at least 5.2% of the time, and open models 21.7% of the time.[^9] Attackers can publish fake packages under those names *(see [Secret and dependency security](/academy/auth-security/secrets-and-dependencies))*. Check every suggested package on npm before installing it.
- **Sounding sure is not the same as being right.** A model writes a wrong answer in exactly the same tone. [!anthropic] says that giving the model permission to *"say I don't know if you are not sure"* and asking it for sources for its claims reduces made-up answers noticeably.[^10]
- **It does not see the running application.** Without a browser, a test or a screenshot, it cannot know what the interface actually looks like. Give it a way to check its own work *(see [Testing, evals and code review](/academy/ai/testing-evals-and-code-review))*.

> [!DONT]
>
> - Committing code you cannot explain.
> - Approving payment, authorization and personal-data code without reading it.
> - Installing a suggested package without looking up its name.

## Sources

1. [Addy Osmani: AI Coding Agent](https://addyosmani.com/agentic-engineering/ai-coding-agent/) *(article)* — The difference between a chat that only suggests code and a coding agent that writes, runs and fixes it.
2. [Arena: Code Arena | WebDev, Frontend](https://arena.ai/leaderboard/code/webdev/frontend) *(research)* — The frontend coding leaderboard the company and model rankings come from.
3. [Anthropic: Claude Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5) *(article)* — Where Sonnet 5.5 stands next to Opus 5.5: speed, cost and daily tasks.
4. [OpenAI: Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering) *(doc)* — The trade-offs between reasoning, large and small models (the "Choosing a model" section).
5. [Addy Osmani: Tokens](https://addyosmani.com/agentic-engineering/tokens/) *(article)* — Input and output tokens, pricing and how they relate to cost.
6. [Anthropic: Choosing a Claude model and effort level in Claude Code](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) *(article)* — What the model and the effort level each change, and which one to reach for when.
7. [Google: Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) *(doc)* — Gemini 3's thinking behaviour (the "Enhancing reasoning and planning" section).
8. [Anthropic: Claude Code Overview](https://code.claude.com/docs/en/overview) *(doc)* — The places Claude Code runs: terminal, IDE, desktop and web.
9. [USENIX Security: We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs](https://www.usenix.org/conference/usenixsecurity25/presentation/spracklen) *(research)* — Spracklen et al., USENIX Security 2025. Rates of non-existent package suggestions across 16 models.
10. [Claude Platform: Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) *(doc)* — Permission to say "I don't know", grounding with quotes and verifying with sources.
