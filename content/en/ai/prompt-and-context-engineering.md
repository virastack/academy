---
title: "Prompt and context engineering"
description: "Writing a good request, giving the right context, CLAUDE.md/AGENTS.md and project rule files."
lastVerified: "2026-11-03"
translationKey: "ai/prompt-and-context-engineering"
---

The quality of the code you get from AI comes down to two things: **what you say** to the model (the prompt) and **what the model can see** at that moment (the context). This guide covers both, and then the rule files you write once for your project and use in every conversation.

## The prompt: describe it, don't leave it to guesswork

A prompt is the request you give the model: the instruction, the relevant information and, where needed, examples. With a vague request like *"fix the product card"*, you have not said which card, what is wrong or how to fix it, so the model fills the gaps with its own guesses and may change the wrong thing.

A good coding request answers four questions:

| Question | Example |
| --- | --- |
| What do you want? | Show the old price struck through on a discounted product. |
| What are we working with? | `ProductCard.tsx`, Tailwind |
| What should we not do? | Do not add a new package. |
| How do we know it's done? | `pnpm test` and `pnpm lint` must pass. |

A weak prompt: *"Fix the product card."*

A strong prompt: *"In `ProductCard.tsx` the old price does not show on discounted products. Show the old price struck through, use Tailwind, do not add a new package. When you are done `pnpm test` and `pnpm lint` must pass."*

A few habits make a big difference:

- **The colleague test:** have a developer who does not know the project read your request. If their first question is "which file?", put the file in the request. If a colleague would be confused, you have left the model a grey area; spell everything out.[^1]
- **Say "do", not "don't", and give the reason:** instead of *"do not create a new CSS file"*, say *"the project uses Tailwind, write the styles as classes in the JSX."* Once the model knows why, it behaves correctly in similar situations too.[^1]
- **Show examples:** if you want a function that formats prices, write three or four examples that differ from each other: `1299` → `€1,299.00`, `0` → `€0.00`, `1299.5` → `€1,299.50`. That says it far more clearly than a list of rules.[^1]
- **Long data first, the question last:** when you paste a file or log over about 20,000 tokens, put it first and your question after it. In Anthropic's tests this improved response quality by up to 30%, most of all on complex inputs spanning several documents.[^1]
- **Don't say "think step by step":** current models already think internally, and a general instruction like *"think it through carefully"* usually beats a scripted plan.[^1] Asking the model to write its reasoning into `<thinking>` tags gains nothing either, and some current models may decline the request.[^1] How deeply it thinks is set mainly by effort *(see [Models and tools](/academy/ai/models-and-tools))*.[^1]
- **Separate the sections:** in a long prompt, keep the identity, the instruction, the examples and the context *(the relevant code, the error message)* apart. OpenAI suggests Markdown headings in this order: identity, instruction, examples, context.[^2] For [!claude], Anthropic suggests wrapping each part in an XML tag such as `<instructions>`, `<context>` or `<example>`.[^1]
- **Tune it to the model:** for a reasoning model, stating the goal and the constraints is enough *("the cart total is wrong, find the root cause")*. For a small, fast model, write the steps out *("find the `total` calculation in `CartSummary.tsx`, fix the bug inside the `reduce`, run the test")*.[^2]
- **Spell out the scope:** the model tends to read a request narrowly and build the smallest thing that satisfies it, because it can't see how much you were hoping for. If you want more, ask for it: *"Build the settings page. Be ambitious: empty and error states, the save flow and keyboard navigation too."*[^1][^3]
- **Ask for the change you want:** *"Can you suggest some improvements to this function?"* often gets you just suggestions. If you want the code changed, say *"Change this function so it runs faster."*[^1]

> [!TIP]
>
> Start with a short request and add instructions where the model gets it wrong. Don't write a long one up front.[^4]

## Let the model know when it's done

The single most useful thing in coding work is giving the model a way to check its own work. Without one, the model stops at "this looks done" and you become the one who verifies.[^3]

| A weak prompt | A strong prompt |
| --- | --- |
| *"The header is broken."* | *"`Header.tsx` wraps onto two lines at 375 px. The logo and the menu icon should stay on the same line. Once you have fixed it, take a screenshot and compare it with the design."* |
| *"The cart total is wrong."* | *"With two products the total comes out as €1,399 instead of €1,299. First write a test that shows the bug, then fix it."* |
| *"Make the card nicer."* | *"Make the product card look like this design [screenshot]. Use the existing `Button` component, do not add a new package."* |

Name the file, the symptom and what "fixed" means. Point at an existing component as an example.[^3]

There is one more trap: unless you say something specific, the model always falls back on the most likely choices, and the interfaces it produces all look alike. The same typeface, the same purple gradient. Anthropic calls this look the "AI slop" aesthetic and suggests writing separate instructions for typography, colour, motion and background.[^1] Four or five rules from your own design system are enough.

**Don't ask for a large piece of work in a single sentence.** First have the model ask you questions, turn the answers into a `SPEC.md`, and start the implementation in a clean conversation:[^3]

```text
I want to add a coupon system. Ask me questions until it is clear:
how it should work, what the edge cases are, what we will not do.
Skip the obvious questions. When you are done, write it to SPEC.md.
```

## Context: everything the model can see

The model only looks at the text in front of it: the instructions, the earlier conversation, the files it has opened, the test output. All of that together is the **context**. **Context engineering** is managing what that information contains.[^4]

| Part of the context | Example |
| --- | --- |
| Instructions | The system prompt, `AGENTS.md`, `CLAUDE.md` |
| Conversation history | Your earlier messages and the model's replies |
| Files | Code the model has read or you have pasted |
| Tool output | Terminal output, test failures |

The amount of text a model can process at once is its **context window**, and it is measured in **tokens**. One token is roughly three quarters of a word.

Even before the window fills, a longer context makes it harder for the model to recall what's in it. This is called **context rot**.[^4] Most current models have a 1M-token window and summarize the conversation automatically, so running out is rare now. Focused context still gets you better answers for less money, because every request resends the whole conversation.[^3] The goal: **less information, more of it worth having.**

In practice:

- **New task, new conversation.** Don't pile unrelated work into the same conversation.[^3]
- **Reset after two failed fixes.** Failed attempts pollute the context. Write a better first request with what you learned and open a new conversation.[^3]
- **Write important decisions to a file.** Tools summarize a long conversation, and a summary can lose small details.[^4] An instruction you only gave in the conversation can disappear with it.[^5] On a long task, keep your progress in a file like `progress.txt` and in the git history. Current models can pick the state back up from those in a fresh session.[^1]
- **Look at what got loaded.** In [!claudeCode], `/context` shows which instruction files are loaded.[^3]
- **Check where the usage goes.** On subscription plans, `/usage` breaks your usage down by skill, subagent, plugin and MCP server.[^3]

### When the context fills, and between sessions

As the window approaches full, [!claudeCode] **summarizes** the conversation on its own *(compaction)*. The summary keeps your requests and the key code snippets, but detailed instructions from early on can get lost.[^6] You can manage this yourself too:[^3]

| Command | What it does | When |
| :-- | :-- | :-- |
| `/clear` | Resets the context completely | When you move to unrelated work |
| `/compact <focus>` | Summarizes the conversation around the focus you give | In the middle of a long task, for example `/compact focus on the API changes` |
| `/btw` | Answers a side question without putting the answer in the conversation | When you check a small detail |
| `Esc` | Stops the agent and keeps the work so far | When you see it heading the wrong way |
| `/rewind` | Rolls the code, the conversation or both back to an earlier request | When a bold attempt doesn't pan out |

To decide what the summary keeps, add a `Compact Instructions` section to `CLAUDE.md`, naming things like the list of changed files and the test commands.[^6]

Every session starts with an empty context. Two things carry information between sessions: the `CLAUDE.md` you write and the agent's own **automatic memory**.[^5] When you tell the agent *"always use pnpm"*, it notes that under `~/.claude/projects/<project>/memory/`. Each session loads the first 200 lines or 25 KB of `MEMORY.md`, the index of those notes.[^5] You can see and edit the notes with `/memory`.[^5]

> [!WARNING]
>
> Memory is context like any instruction, not a guarantee.[^5] Third-party memory extensions that store your conversation can send session content to another service. Look at where the data goes before installing one.

> [!TIP]
>
> Hand over what you have instead of describing it: add the file with `@`, paste the screenshot or the command output. For a library or API that just came out, include the relevant part of its docs too, so the model doesn't have to guess.[^3]

## Rule files: AGENTS.md and CLAUDE.md

The model starts every session knowing nothing about your project: not which package manager you use, not how to run the tests. Write those into a file and the tool adds it to the context at the start of every session.[^5] `AGENTS.md` is like a README for agents. It is plain Markdown with no required fields.[^7]

| Tool | File | Note |
| --- | --- | --- |
| [!codex] [!cursor] [!vscode] [!windsurf] [!zed] and others | `AGENTS.md` | In a monorepo you can put a separate file in each package, and the nearest one wins. For [!geminiCli] and Aider you have to point at the file name in the settings.[^7] |
| [!claudeCode] | `CLAUDE.md` | If a directory has no `CLAUDE.md` it reads `AGENTS.md` too *(v2.1.277+)*. When both exist, only `CLAUDE.md` is read. To combine them, write `@AGENTS.md` inside `CLAUDE.md`.[^5] |
| [!cursor] | `.cursor/rules/*.mdc` or `AGENTS.md` | The `.mdc` file decides when it is loaded. A plain `.md` file is ignored.[^8] |

> [!WARNING]
>
> A rule file is not binding. It reaches the model as context, with no guarantee it gets followed.[^5] IMPORTANT and all caps won't fix that, and they can make the model over-apply the rule.[^1][^3] If a line is getting lost in a long file, shorten the file. If it truly can't have exceptions, use a hook, a permission rule, a linter or CI *(see [Hooks and permission modes](/academy/ai/hooks))*.[^3]

The Next.js-specific setup *(the docs that ship with the package, the `AGENTS.md` contents)* is in the [Next.js with AI agents](/academy/nextjs/ai-agents) lesson.

### How to write a good rule file

- **Keep it short.** [!claudeCode] suggests staying under 200 lines and [!cursor] under 500.[^5][^8] Every line takes a little of the model's attention on every task, relevant or not.[^3]
- **Only write down what the code doesn't say.** Ask two questions first: could the model find this by reading the code, and would it actually go and look? If both answers are yes, leave it out.[^3] The model works out the folder structure and the tech stack by itself, and in ETH Zurich's study repository summaries did not improve success.[^9] It can't work out something like "the package manager is `uv`", though. (`uv` is a Python package manager, and the study used Python projects. The frontend equivalents are `pnpm`, `npm`, `yarn` and `bun`.) When `uv` appeared in the rule file, the agent used it an average of 1.6 times per task, and almost never otherwise.[^10]
- **What earns a place:** the exact check commands, the places where the code misleads *(an old pattern that's everywhere but shouldn't be copied)*, decisions that live outside the repo, and anything you've had to correct twice.[^3]
- **Write down the commands the agent cannot guess.** Don't explain tools it knows, like `git` and `npm`.[^8]
- **Leave style rules to the linter.** Use a linter instead of copying your style guide into the file.[^8]
- **Point, don't explain at length.** Instead of copying code in, point at the file; that way the file does not grow and does not go stale.[^8]
- **Treat every line as a hint.** If the agent keeps putting files in the wrong folder, fixing the structure lasts longer than adding a rule.[^10]
- **Split boundaries into three tiers:** always do, ask first, never do. This is one of the six areas GitHub drew from more than 2,500 repositories. For project structure and code style, the two rules above apply.[^11]
- **Move long procedures into a skill.** Something like your release steps takes up room on every task in `CLAUDE.md`, while a skill's full text loads only when it's needed *(see [Skills](/academy/ai/skills))*.[^3]
- **Keep personal preferences in their own file.** Create `CLAUDE.local.md` and add it to `.gitignore`. One catch: while that file exists, [!claudeCode] doesn't read the project's `AGENTS.md` by default.[^5]
- **Audit the file.** `/doctor prompt-audit` reports instructions written for older models, references to files that no longer exist, and contradictions.[^5]

A frontend `AGENTS.md`, as an example:

```markdown
# AGENTS.md

## Commands
- Test: `pnpm test:run` (a single file: `pnpm vitest run <file>`)
- Check: `pnpm lint && pnpm tsc --noEmit`

## Watch out
- Use Tailwind for styling, do not create a new CSS file.
- `legacy/` is old but three modules still import from it; do not delete files inside it.

## Boundaries
- Ask first: adding a new package, changing the route structure.
- Never: editing the generated code in `src/gen/` by hand.
```

Don't ban reading `.env` in this file. For a hard ban, use a `deny` rule *(see [Hooks and permission modes](/academy/ai/hooks))*.[^3]

> [!TIP]
>
> You can load a rule only for the files it concerns: `globs: src/components/**/*.tsx` in [!cursor], and `paths:` inside `.claude/rules/` in [!claudeCode].[^5][^8]

<details>
<summary>Does a rule file actually help?</summary>

<ul>
<li>Two studies measure different things. In one *(10 repositories, 124 PRs)*, having an `AGENTS.md` cut the median run time by 28.64% and output tokens by 16.58%, but accuracy was not measured. ETH Zurich's study found that context files generally did not raise the success rate and increased cost by more than 20% on average. Instructions are followed well; repository summaries do not help. The files are useful for describing practices that are out of the ordinary.[^9][^10] The upshot: keep the file small and try its effect for yourself.</li>
</ul>

</details>

<details>
<summary>The file `/init` generates</summary>

<ul>
<li>The [!claudeCode] docs suggest `/init` as a starting point and tell you to trim what it generates over time.[^5] [Addy Osmani](https://addyosmani.com) suggests not leaving the generated file as it is, because its contents are mostly things the model would find anyway.[^10] What they agree on: question every line.</li>
</ul>

</details>

## Try it yourself

- Take a prompt you wrote recently, add the file, the symptom and a definition of done, and ask for the same work again. Did it take fewer rounds of correction?
- Put the two questions to every line of your rule file and delete the ones that fail. How many lines are left?
- Run `/context` in a long session, then again after `/clear`. What changed?

## Sources

1. [Anthropic: Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) *(doc)* — The current reference for clarity, examples, XML tags, ordering with long data and frontend instructions.
2. [OpenAI: Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering) *(doc)* — Message sections, and steering a reasoning model differently from a small one.
3. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Giving the model a check, scope, context and cost, and what belongs in a rule file.
4. [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) *(article)* — What context is, context rot, and starting short and adding instructions as you see mistakes.
5. [Claude Code: How Claude remembers your project](https://code.claude.com/docs/en/memory) *(doc)* — CLAUDE.md locations, `CLAUDE.local.md`, the AGENTS.md reading rules, `.claude/rules/` and `/doctor prompt-audit`.
6. [Claude Code: How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) *(doc)* — Compaction when the context fills up, and `Compact Instructions`.
7. [AGENTS.md](https://agents.md) *(doc)* — The open format, the tools that support it and nested files.
8. [Cursor: Rules](https://cursor.com/docs/rules) *(doc)* — The `.mdc` rule types, `globs` and writing advice.
9. [ETH Zürih: Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) *(research)* — The effect of context files on success and cost.
10. [Addy Osmani: Stop Using /init for AGENTS.md](https://addyosmani.com/blog/agents-md/) *(article)* — Why generated files can do harm, and a summary of the two studies.
11. [GitHub: How to write a great agents.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) *(article)* — The six areas and the three tiers of boundaries that came out of 2,500+ repositories.
