---
title: "Agentic coding"
description: "The plan, code, test loop and subagents in tools like Claude Code and Cursor."
lastVerified: "2026-10-26"
translationKey: "ai/agentic-coding"
---

Working with an agent is nothing like the *"ask a question, copy the answer"* pattern of a chat. You give the agent a job: it opens files, changes code, runs commands. Your job is to set the task up properly and to check what comes out.

## The agent loop

The [!claudeCode] docs describe how an agent works in three stages: it **gathers context**, it **takes action**, it **verifies the result**. It repeats the loop until the goal is met, and at each step it picks what to do next based on what it learned from the step before.[^1] You are inside the loop too, and you can stop it and steer it whenever you want.[^1]

When you say *"the cart total is coming out wrong, fix it"*, the agent moves like this: it runs the tests, reads the failure output, searches the relevant files, edits `CartSummary.tsx` and runs the tests again.[^1] So the quality of the result depends on there being a check the agent can use: a test, a linter, a type check. In the [Prompt and context engineering](/academy/ai/prompt-and-context-engineering) guide we called that the "definition of done".

## Plan, implement, test, commit

The flow [!claudeCode] recommends has four steps: explore, plan, implement, commit.[^2] The [!cursor] team starts from the same place: the most effective change you can make is to plan before you code.[^3]

### 1. plan

Not every job needs a plan. The [!claudeCode] docs give a practical test: if you can describe the change in one sentence, skip the plan.[^2]

Switch to Plan mode with `Shift+Tab` (the same shortcut in both tools). The agent reads the project without touching any files, asks you questions where it needs to, and produces a plan.[^2][^3] You can edit the plan.

| A plan helps | A plan is overkill |
| --- | --- |
| Adding filtering and sorting to the product list | Changing the text on a button |
| Moving the cart state to another library | Adding a log line |
| Adding a feature in a codebase you don't know | Something you have done many times before |

### 2. implement

Approve the plan and have the agent write the code by following it. If the result is not what you expected, don't try to patch it with follow-up messages: undo the changes, write the plan more clearly and run it again. [!cursor] says this usually gives a faster and cleaner result.[^3]

### 3. test

When the agent says "done", ask for proof: the test output, the command it ran, a screenshot. Reading the proof is faster than verifying everything from scratch.[^2] Having the tests written first also works well ([!cursor]'s TDD flow):[^3]

1. Have the agent write tests from the expected input-output pairs. Tell it not to write a fake implementation for code that does not exist yet.
2. Run the tests and watch them fail. It should not write application code at this stage.
3. Commit the tests.
4. Ask the agent to write code without touching the tests, until they all pass.
5. Commit the implementation.

In frontend work this means giving the agent the component tests you wrote in the [Component testing with Vitest](/academy/vitest) guide as its target.

### 4. commit

Commit small and often. Every commit is a checkpoint you can return to the next time the agent gets something wrong. [Addy Osmani](https://addyosmani.com)'s rule is clear: do not commit code you cannot explain.[^4]

[!claudeCode]'s checkpoints are not a substitute for git. They only cover the changes the agent made with its file-editing tools, not the ones made with terminal commands or operations on remote systems (a deploy, a database).[^1][^2]

> [!TIP]
>
> The faster the agent gets, the more your review matters.[^3] Read the diff, and stop it when it heads the wrong way. Don't leave the agent unattended and expect a flawless result. [Addy Osmani](https://addyosmani.com) also writes that he uses the agent under supervision, watching every step and intervening where he has to.[^4]

## Subagents

A subagent is **a helper agent with its own context window**. It does the heavy work there and returns only a summary to the main conversation.[^5][^6] That keeps your main conversation's context from filling up (see [Prompt and context engineering](/academy/ai/prompt-and-context-engineering)).

For example: *"Look at every `fetch` call in the project and report which ones have no error handling."* The agent is going to read dozens of files. If you hand that to a subagent, the contents of those files never enter the main conversation; only the summary *"these four are missing it"* comes back.

### When a subagent, when the main conversation?

| Use a subagent | Stay in the main conversation |
| --- | --- |
| Work that produces long output you will not look at twice: test output, logs, code searches | Work that needs constant back and forth |
| Independent pieces of research (auth, API, the data layer) | Work where planning, implementing and testing share the same context |
| Having the finished work verified by someone independent | Fast, small changes |

**The ready-made ones:** in [!claudeCode], **Explore**, which is read-only and searches fast, and **Plan**, which researches in plan mode, kick in on their own. [!cursor] has **Explore** and **Browser**, which drives the browser and summarizes the noisy DOM output.[^5][^6] You don't have to set these up.

**Writing your own subagent:** if you keep giving the same job with the same instruction, write the subagent into a Markdown file. It goes under `.claude/agents/` in [!claudeCode] and `.cursor/agents/` in [!cursor] ([!cursor] reads the `.claude/agents/` folder too).[^5][^6] The most important field is `description`: the agent reads it to decide when to hand over.[^5][^6]

```markdown
---
name: a11y-reviewer
description: Reviews accessibility problems in changed components. Use after a component has been written or changed.
tools: Read, Grep, Glob
---

You are a frontend developer who is meticulous about accessibility.
In the changed components, look for: form fields without labels, images
with no `alt` text, interactions you cannot reach with a keyboard, and
insufficient contrast. Do not write to files; report what you find with
the file and line number.
```

In [!claudeCode] you restrict the tools with `tools`. In [!cursor] the equivalent is `readonly: true`.[^5][^6]

> [!TIP]
>
> **Keep the writer and the checker separate.** The [!claudeCode] docs suggest an author/reviewer setup: one session writes the code, and another session (or a subagent) reviews it in a clean context. A clean context has no attachment to the code that was just written.[^2] [!cursor]'s `verifier` example is the same idea: it tests the work the agent called "done" with suspicion, instead of taking the claim at face value.[^6]

> [!WARNING]
>
> A reviewer told to *"find the gaps"* will find something even in solid work, and chasing it produces needless abstraction and defensive code. Tell the reviewer to report only the gaps that affect correctness or the stated requirements.[^2]

Running several agents at once is in [Parallel agents](/academy/ai/parallel-agents), and connecting the spec, code and test roles into one line is in [Building an agent team](/academy/ai/agent-teams). Every subagent spends its own tokens. Start with two or three focused subagents; don't open dozens of general *"helper"* ones.[^6]

<details>
<summary>Debug Mode ([!cursor])</summary>

<ul>
<li>[!cursor]'s Debug Mode does not fix things by guessing. It produces a few hypotheses first, adds logs to the code, asks you to reproduce the bug, looks at the runtime data to find the root cause and fixes it accordingly. It helps with race conditions, performance problems and *"it used to work"* bugs.[^3]</li>
</ul>

</details>

> [!TIP]
>
> You can watch Cat Wu and [Boris Cherny](https://borischerny.com), who build [!claudeCode], talk about how they use plan mode and subagents in their own workflows.[^7]

## Try it yourself

1. Pick a small feature that touches a few files (sorting the product list by price, say). Ask for it in plan mode, read the plan, then delete or add a step and have it implemented.
2. For the same feature, have the tests written first, watch them fail, then have code written until they pass. Note how many rounds it took.
3. Have a subagent answer *"are there accessibility problems in this change? only report them"*. If you are in [!claudeCode], use `/context` to see how much the main conversation's context moved.

## Sources

1. [Claude Code: How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) *(doc)* — The agent loop, tools, permission modes and checkpoints.
2. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — The explore-plan-implement-commit flow, verification and the author/reviewer setup.
3. [Cursor: Best practices for coding with agents](https://cursor.com/blog/agent-best-practices) *(article)* — Plan mode, the TDD flow, parallel agents and Debug Mode. Lee Robinson, January 9, 2026.
4. [Addy Osmani: My LLM coding workflow going into 2026](https://addyosmani.com/blog/ai-coding-workflow/) *(article)* — Frequent commits, not committing code you cannot explain, and using the agent under supervision.
5. [Claude Code: Subagents](https://code.claude.com/docs/en/sub-agents) *(doc)* — What a subagent is, when to use one, how to write one.
6. [Cursor: Subagents](https://cursor.com/docs/subagents) *(doc)* — Subagents in Cursor, running them in parallel and their cost.
7. [Every: How to Use Claude Code Like the People Who Built It](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it) *(video)* — How Claude Code's own developers use plan mode, subagents and code review.
