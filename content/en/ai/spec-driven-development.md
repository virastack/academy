---
title: "Spec-driven development"
description: "Having the agent write a spec and a task list first, then implementing task by task and keeping the spec current."
lastVerified: "2026-10-26"
translationKey: "ai/spec-driven-development"
---

Telling an agent *"add a coupon code to the cart"* and waiting starts fast but usually ends up in the wrong place. The model decides every question you did not answer by guessing. The [!github] team sums the problem up like this: we treat agents like a search engine, when they are more like a pair programmer who takes everything literally.[^1]

**Spec-driven development** means **writing down what will be done in a file** before any code is written, and running the agent against that file.[^1][^2] The spec becomes the shared source both you and the agent refer to.

## The difference between a plan and a spec

Plan mode from the [Agentic coding](/academy/ai/agentic-coding) lesson also makes the agent think before it codes. The difference is that a plan stays inside the conversation. A spec is a file that sits in the repository: it is committed, reviewed and read again in a new session.

| | Plan mode | A spec |
| :-- | :-- | :-- |
| **Where it lives** | In the conversation | In the repository, in a file like `SPEC.md` |
| **Its lifetime** | Ends when the session closes | Stays as long as the feature does |
| **Who reviews it** | You, right then | You and the team, in the PR |
| **When** | Work spanning a few files | A feature spanning several sessions |

How long the spec lives is a choice too. A spec written for one job and then forgotten is **spec-first**; a spec kept up to date along with the feature is **spec-anchored**. Most of today's tools support the first.[^2]

## The flow: spec, plan, tasks, implementation

Tools use different names for them, but the flow is the same:[^1][^2]

1. **The spec:** what will be done and why. What the user sees, when we call it "done". No technology.
2. **The plan:** how it will be done. Which files, which components, which constraints.
3. **The tasks:** splitting the plan into small pieces that can each be tested on their own.
4. **The implementation:** the agent does the tasks in order, and you review a small diff at each step.

At the end of every step you stop and read the file. Fixing a mistake in the spec is cheaper than fixing it in the code.

You don't have to write the spec from a blank page. As in the [Prompt and context engineering](/academy/ai/prompt-and-context-engineering) lesson, ask the agent to question you and have it write the spec from your answers.[^3] [Addy Osmani](https://addyosmani.com) also suggests starting with a short goal, having the agent expand the detail, and reading the draft before any code is written.[^4]

## What goes into a good spec

According to the [!claudeCode] docs, the most useful spec stands on its own: it names the relevant files and interfaces, states what is **out of scope** explicitly, and ends with an end-to-end check that proves the feature works.[^3] A short example for the coupon feature:

```md
# Cart coupon

## Goal
Let the user enter a coupon code in the cart and get a discount.

## Acceptance criteria
- Entering `SALE10` takes 10% off the subtotal.
- For an invalid code, "Invalid coupon" appears under the input and the total does not change.
- Only one coupon applies at a time; a new one replaces the old.

## Files
- `src/features/cart/components/CouponForm.tsx` (new)
- `src/features/cart/lib/applyCoupon.ts` (new)
- `src/features/cart/components/CartSummary.tsx`

## Out of scope
- A coupon management panel, a per-user coupon limit.

## Boundaries
- Always: use the existing `Button` and `Input` components.
- Ask first: ask before adding a new package.
- Never: do not touch price calculations outside `CartSummary`.

## Verification
`pnpm test applyCoupon` passes. Playwright: with `SALE10` the total drops from €1,000 to €900.
```

The last two sections come from Addy Osmani's advice: write the agent's boundaries in three tiers, *always*, *ask first* and *never*.[^4] Information that stays the same for every feature — the commands, the folder structure, the code style — goes into `AGENTS.md`, not the spec.

> [!TIP]
>
> Write the acceptance criteria so they can be tested. *"The coupon should work properly"* tells the agent nothing. *"With `SALE10` the total becomes €900"* is both a target for the agent and a test for you.

## Splitting into tasks and implementing

Once the spec is approved, ask the agent for a task list. Every task should be testable on its own:[^1]

```md
- [ ] 1. The `applyCoupon` function and its unit tests
- [ ] 2. The `CouponForm` component, including the error message
- [ ] 3. The discount line in `CartSummary`
- [ ] 4. The end-to-end scenario with Playwright
```

Start the implementation in a **new session**. A clean context focuses on nothing but the spec and the task.[^3] With a long list of instructions, the model follows each item less closely. So give every task only the part of the spec it concerns.[^4]

When a task is done, ask the agent to compare the output against the spec and to **list the criteria that are not met**.[^4] If the tests pass and the list is empty, tick the task off and commit.

## Keeping the spec current

If a decision changes during the work *(the coupon now applies to the shipping fee too, say)*, update the spec first and the code after. Keep the spec in version control alongside the code.[^4] That way someone who touches this feature six months from now *(or an agent)* can read from the file why it works the way it does.

## When you don't need it

A spec is a tool, not a ceremony. In a review on martinfowler.com, the author describes a tool producing 4 user stories and 16 acceptance criteria for a small bug fix. They also write that the agent ignored notes in the spec here and there, and that reviewing repetitive Markdown files is more tiring than reviewing code.[^2]

| Write a spec | Just ask |
| :-- | :-- |
| A feature spanning several sessions | A change you can describe in one sentence[^3] |
| Decisions that will be shared with and reviewed by the team | Copy, styling or a small bug fix |
| A new feature in a codebase you don't know | Work you have done many times before |

> [!WARNING]
>
> A detailed spec does not mean the agent will follow every item.[^2] What gives you control is the tests and your review, not the spec.

<details>
<summary>Ready-made tools</summary>

<ul>
<li><strong>Spec Kit</strong> <em>(GitHub)</em>: an open-source CLI. It adds a "constitution" to the project, where you write the principles that hold for every change, and it takes the agent through the specify, plan, tasks and implement steps. It works with [!copilot], [!claudeCode] and other agents.[^1][^5]</li>
<li><strong>Kiro</strong>: an editor that splits the spec into three files, <code>requirements.md</code>, <code>design.md</code> and <code>tasks.md</code>. It has a separate <code>bugfix.md</code> flow for bug fixes.[^6]</li>
</ul>

</details>

A tool is not required. A `SPEC.md`, a task list and plan mode set up the same flow.

## Try it yourself

- Ask the agent to question you about a cart coupon feature and have it write a `SPEC.md` from your answers. Is there an out-of-scope section?
- Write one acceptance criterion in the spec vaguely *("the coupon should work properly")*. What do the tests the agent writes actually check?
- Produce the task list and have only the first task implemented in a new session. How many files does the diff touch?
- When the task is done, ask the agent to *"list the criteria in the spec that are not met"*. Is the list empty?

## Going deeper

- **Article:** [Addy Osmani](https://addyosmani.com), "How to write a good spec for AI agents"; the six sections of a spec, modular prompts and self-verification.[^4]
- **Article:** martinfowler.com, "Understanding Spec-Driven-Development"; a critical comparison of Kiro, Spec Kit and Tessl.[^2]
- **Official docs:** [!claudeCode] "Best practices"; having the agent question you, and implementing the spec in a new session.[^3]

## Sources

1. [GitHub Blog: Spec-driven development with AI: Get started with a new open source toolkit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) *(article)* — Den Delimarsky, September 2, 2025. The spec, plan, tasks and implementation steps, and why the spec is the shared source.
2. [martinfowler.com: Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) *(article)* — Birgitta Böckeler, October 15, 2025. The spec-first and spec-anchored distinction, too much process for small work, and the agent ignoring the spec.
3. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Having the agent question you and write `SPEC.md`, what makes a good spec, and implementing in a new session.
4. [Addy Osmani](https://addyosmani.com): [How to write a good spec for AI agents](https://addyosmani.com/blog/good-spec/) *(article)* — January 13, 2026. The sections of a spec, three-tier boundaries, modular tasks and checking against the spec.
5. [GitHub: Spec Kit](https://github.com/github/spec-kit) *(repo)* — Installation, the constitution and the current commands for the spec steps.
6. [Kiro: Specs](https://kiro.dev/docs/specs/) *(doc)* — `requirements.md`, `design.md`, `tasks.md` and the bug-fix spec.
