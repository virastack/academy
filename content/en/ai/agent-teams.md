---
title: "Building an agent team"
description: "A line of spec, frontend, test and review subagents, the failure loop, the lead's summary and agent teams."
lastVerified: "2026-10-26"
translationKey: "ai/agent-teams"
---

The goal is this: one agent writes the spec, a second writes the code, a third tests it. If a test fails, the work goes back to the agent that writes code. At the end a **lead** *(a managing agent)* summarizes for you what was done. First, let's look at which work actually needs a team.

## The pattern first, the tool second

[!anthropic]'s agent guide separates two things. A **workflow** is a flow whose steps are known in advance, fixed in code or in a prompt. An **agent** decides its own steps.[^1] An agent team is a combination of a few known patterns:[^1]

| Pattern | What it does | Frontend example |
| :-- | :-- | :-- |
| **Chaining** | Each step processes the previous one's output | The spec, then the code, then the tests |
| **Parallel** | Does independent jobs at the same time | A security, a performance and an accessibility review |
| **Orchestrator-worker** | The lead splits the work, hands it to workers and combines the result | The lead handing tasks out to roles |
| **Evaluator loop** | One produces, the other checks it and gives feedback | Going back to the frontend when a test fails |

The guide's main advice: find the simplest solution that works, and add complexity only when it improves the result measurably.[^1] A single agent's plan mode and one test command are enough for most work.

## Writing the roles

Every role is a subagent file *(see [Agentic coding](/academy/ai/agentic-coding))*. In [!claudeCode] they go under `.claude/agents/`. What really defines a role is the `tools` field: what it is allowed to touch.[^2]

```markdown
---
name: frontend-dev
description: Implements UI tasks from SPEC.md. Use after the spec is approved or when tests fail.
tools: Read, Edit, Write, Bash
---

You are a React and Tailwind developer. Write the code for the task in SPEC.md.
Use the existing components, do not add a new package. Do not touch the test files.
When you are done, list the files you changed and the commands you ran.
```

```markdown
---
name: qa-tester
description: Writes and runs tests against SPEC.md acceptance criteria. Use after frontend-dev finishes.
tools: Read, Write, Bash
---

Write and run a Vitest or Playwright test for every acceptance criterion in SPEC.md.
Do not touch the application code. Write the result into test-report.md:
the passing and failing tests, and the error output of the failures.
```

The other two roles are written to the same pattern:

| Role | `tools` | Its output |
| :-- | :-- | :-- |
| `spec-writer` | `Read, Write` | `SPEC.md` |
| `frontend-dev` | `Read, Edit, Write, Bash` | Code |
| `qa-tester` | `Read, Write, Bash` | Tests and `test-report.md` |
| `reviewer` | `Read, Grep, Glob` | Findings *(a report only)* |

It matters that the roles hand work to each other through files. The agents share `SPEC.md` and `test-report.md` rather than conversations, so each one starts with a clean context.

## The lead: setting up the line

The lead is not a separate file; it is your main session. The subagents return their results to it, and it passes them on to the next one.[^2] The lesson from [!anthropic]'s own multi-agent system: the lead has to give every worker **the objective, the output format, the tools it will use and its boundaries** explicitly. A vague instruction leads to the same work being done twice, or to a gap being left.[^3]

```text
Build the cart coupon code feature with this line:

1. spec-writer: clarify it with the user and write SPEC.md. Wait for my approval.
2. frontend-dev: implement the tasks in SPEC.md.
3. qa-tester: test the acceptance criteria and write test-report.md.
4. If any test fails, give the report to frontend-dev and go back to step 2.
   At most 3 rounds. If it does not pass in 3 rounds, stop and ask me.
5. reviewer: review the diff against SPEC.md. Report only the findings that
   affect correctness and the criteria.
6. Give me a summary: the files changed, the test result, the number of
   rounds, and anything left open.
```

The round limit keeps the loop from running forever. Telling the reviewer to *"report only what affects correctness"* also cuts out needless rounds of correction.[^4] If you would rather not take the agent's word that the tests really pass, add the `Stop` hook from the [Hooks and permission modes](/academy/ai/hooks) lesson.

> [!TIP]
>
> Walk the line by hand once first: ask for every step yourself and see where it gets stuck. Once the flow settles, turn the lead prompt into a skill *(see [Skills](/academy/ai/skills))*.

## Agent teams

Subagents only report back to the lead. In [!claudeCode]'s **agent teams** feature, every member is a separate session, takes work from a shared task list and **messages the others directly**.[^5]

| | Subagents | Agent teams |
| :-- | :-- | :-- |
| **Communication** | The result goes back to the lead | The members talk to each other |
| **Coordination** | The lead manages it | A shared task list |
| **Tokens** | Fewer | Every member is a separate session, so far more |
| **What it's best at** | Focused work where the result is enough | Work that needs discussion and mutual checking |

The feature is experimental and off by default. You turn it on by setting the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` variable to `1` in the settings.[^5] The docs list the strongest uses like this: research and review, modules independent of each other, and debugging with competing hypotheses *(where the members try to disprove each other's theory)*.[^5] Three to five members is suggested as a start. Two members editing the same file leads to one overwriting the other, so split the work by file ownership.[^5]

```text
Build a three-member team to review PR #42:
one looks at security, one at performance, one at test coverage.
Have them question each other's findings and give me a single list.
```

> [!WARNING]
>
> Agent teams ships with known limitations around resuming a session, task state and shutdown.[^5] Start with the subagent line before you put your daily work on it.

## When you don't need it

In [!anthropic]'s measurements, agents spend about 4 times the tokens of a chat, and multi-agent systems about 15 times.[^3] The same post says that work with a lot of dependencies between the agents and little to parallelize is not a fit for multiple agents, and that most coding work falls into that group.[^3]

| Build a team | One agent is enough |
| :-- | :-- |
| A long feature whose roles touch separate files | A change spanning a few files |
| Work where the writer and the checker have to be separate | A quick bug fix |
| A parallel review from different angles | Design work that needs constant back and forth |

The same line can be set up in [!cursor]. The subagents go under `.cursor/agents/`, and [!cursor] reads the `.claude/agents/` folder too.[^6]

## Try it yourself

- Write the `frontend-dev` and `qa-tester` files and run the lead prompt on a small feature. How many rounds did the tests take to pass?
- Remove `Write` from `qa-tester`'s `tools` list. What happens when it cannot write the report file?
- Write one acceptance criterion so it cannot be tested, on purpose. How does `qa-tester` report that?
- Turn on agent teams and have three members review the same PR, then have a single subagent review it. How different are the findings?

## Going deeper

- **Article:** [!anthropic], "Building effective agents"; the chaining, routing, parallel, orchestrator-worker and evaluator patterns.[^1]
- **Article:** [!anthropic], "How we built our multi-agent research system"; the lead handing out tasks, token cost and the limits of multiple agents.[^3]
- **Official docs:** [!claudeCode] "Agent teams"; managing members, the task list, quality hooks and the limitations.[^5]

## Sources

1. [Anthropic: Building effective agents](https://www.anthropic.com/research/building-effective-agents) *(article)* — Erik Schluntz and Barry Zhang, December 19, 2024. The difference between a workflow and an agent, and the five basic patterns.
2. [Claude Code: Subagents](https://code.claude.com/docs/en/sub-agents) *(doc)* — The subagent file, the `tools` field and chaining subagents.
3. [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) *(article)* — June 13, 2025. Lead and worker agents, describing a task, token cost and the work it does not suit.
4. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — An independent reviewer, and limiting the reviewer to findings that affect correctness.
5. [Claude Code: Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams) *(doc)* — Turning agent teams on, how it differs from subagents, use cases and limitations.
6. [Cursor: Subagents](https://cursor.com/docs/subagents) *(doc)* — Subagent files in Cursor and `.claude/agents/` support.
