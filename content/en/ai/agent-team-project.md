---
title: "A feature with an AI team"
description: "Adding a cart coupon feature with a team of spec, frontend, test and review agents."
lastVerified: "2026-10-26"
translationKey: "ai/agent-team-project"
---

## Scenario

You have a cart with no coupon support. You are not going to write the coupon feature yourself. You will build a team of four agents and have a lead run the work:

- **spec-writer** turns the request into testable criteria in `SPEC.md` and waits for your approval.
- **frontend-dev** implements the spec and does not touch the test files.
- **qa-tester** writes a test for every criterion, runs them and writes `test-report.md`.
- If a test fails, the report goes back to frontend-dev. At most three rounds.
- **reviewer** reviews the diff against the spec in a clean context.
- The lead summarizes the changed files, the test result and the number of rounds for you.

The point is not the coupon itself but the team working within rules. Where each piece comes from:

| Part | File | Lesson |
| :-- | :-- | :-- |
| Testable criteria, out of scope, boundaries | `SPEC.md` | Spec-driven development |
| Protected files, not finishing until the tests pass | `.claude/settings.json`, `.claude/hooks/` | Hooks and permission modes |
| A tool restriction per role | `.claude/agents/*.md` | Building an agent team |
| The line, the failure loop, the round limit, the summary | `.claude/skills/feature-team/SKILL.md` | Building an agent team, Skills |
| The project rules | `CLAUDE.md` | Prompt and context engineering |

The project's starter and solution are on GitHub: [examples/ai/agent-team](https://github.com/virastack/academy/tree/main/examples/ai/agent-team). Compare your own result with the tests and the `test-report.md` in the solution.

## Step 1: Set up the project

```bash
cd examples/ai/agent-team/starter
npm install
npx playwright install chromium
npm test
```

At the start 3 unit tests and 1 Playwright test pass. The hooks use `jq` to read JSON, so install it if you don't have it.[^1]

## Step 2: Read the roles

Open the four files under `.claude/agents/`. What separates the roles is the `tools` field and the "do not touch" lines.[^2]

| Role | `tools` | Does not touch |
| :-- | :-- | :-- |
| `spec-writer` | `Read, Glob, Grep, Write` | Code |
| `frontend-dev` | `Read, Glob, Grep, Edit, Write, Bash` | The test files |
| `qa-tester` | `Read, Glob, Grep, Write, Bash` | The application code |
| `reviewer` | `Read, Glob, Grep, Bash` | No file at all *(a report only)* |

`qa-tester`'s report always ends with `STATUS: PASS` or `STATUS: FAIL`. The lead looks at that line to decide whether to continue the loop. A clear output format between the agents prevents the same work being done twice and prevents gaps being left.[^3]

## Step 3: Bind the rules to hooks

`.claude/settings.json` registers two hooks:

- `PreToolUse`: blocks writing to `package-lock.json`, `.env` and anything under `.git/`.
- `Stop`: does not let the agent finish while the unit tests are failing, and hands back the error output.[^1]

```json
"Stop": [
  {
    "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/require-tests.sh" }]
  }
]
```

The same file allows the test, build and `git diff` commands up front. `npm install` is forbidden, so the agent cannot add a new package.[^4] That way the team does not wait on you for every command but cannot step outside the boundary either.

## Step 4: Run the team

The lead prompt is written as a skill. Because it has `disable-model-invocation: true`, only you can call it:[^5]

```text
/feature-team add a coupon code to the cart, SALE10 should give 10 percent off
```

The flow:

1. `spec-writer` writes `SPEC.md` and passes its open questions to you. Answer them, read the spec, approve it.
2. `frontend-dev` writes the code and runs `npm run build`.
3. `qa-tester` writes the tests and fills in `test-report.md`.
4. If the report says `STATUS: FAIL`, the lead gives the report back to `frontend-dev`.
5. Once the tests pass, `reviewer` reviews the diff.
6. The lead writes the summary.

On the first run, stop at every step and read the files. If there is a mistake in the spec, fix it in the spec and not in the code.

> [!TIP]
>
> The lead sometimes starts doing the work itself. When that happens, remind it: *"don't write code, hand the work to the subagents"*. The skill's first line says the same thing.

## Step 5: Check the result

When the lead says "done", look at the proof:[^6]

- Does `test-report.md` end with `STATUS: PASS`?
- Does `git diff --stat` show only the files in the "Files" section of `SPEC.md`, plus the tests?
- Does `npm test` pass in your terminal too?

The `SPEC.md` in the solution holds six criteria, and the tests cover five of them. The remaining one *(the single-coupon rule)* is marked "checked by hand" in the report. How did your team handle that criterion?

## Try it yourself

- Delete the "Do not touch the test files" line from `frontend-dev`'s definition and break a test on purpose. Does the agent fix the test or the code?
- Lower the round limit to 1 and make one criterion harder *(rounding to cents, say)*. What does the lead do when it hits the limit?
- Before running `reviewer`, have `frontend-dev` change a file that is not in "Files". Does the reviewer catch it?
- Ask for the same feature without the team, in a single session. Which one spent fewer tokens, and whose result was easier to review?

## Sources

1. [Claude Code: Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide) *(doc)* — Protecting files with `PreToolUse`, the `Stop` hook and reading stdin with `jq`.
2. [Claude Code: Subagents](https://code.claude.com/docs/en/sub-agents) *(doc)* — The subagent file, the `tools` field and chaining.
3. [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) *(article)* — June 13, 2025. The lead giving its workers an objective, an output format and boundaries.
4. [Claude Code: Configure permissions](https://code.claude.com/docs/en/permissions) *(doc)* — The `allow` and `deny` rules.
5. [Claude Code: Skills](https://code.claude.com/docs/en/skills) *(doc)* — A manually invoked skill with `$ARGUMENTS` and `disable-model-invocation`.
6. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Asking for proof and verifying unattended work.
