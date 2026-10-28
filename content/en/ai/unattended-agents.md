---
title: "Unattended agents"
description: "Agents in the cloud and in the background, assigning work with @claude on GitHub, automatic PR review and verifying the result."
lastVerified: "2026-10-26"
translationKey: "ai/unattended-agents"
---

So far the agent has run on your computer, with you sitting in front of it. But plenty of work can move forward without waiting for you. Starting a bug fix from your phone and reviewing its PR in the evening, or having every PR reviewed automatically, are examples. In this lesson we take the agent off your machine and away from your screen.

## Three routes

| Route | Where it runs | How you start it | The result |
| :-- | :-- | :-- | :-- |
| **A cloud session** | On the provider's virtual machine | The browser, the mobile app, the terminal | A branch and a PR |
| **An agent in CI** | On a GitHub Actions runner | `@claude` in a PR or an issue, or automatically on every PR | A PR comment or a commit |
| **Headless** | On your machine or in a script | `claude -p "..."` | Terminal output or JSON |

## A cloud session

A cloud session is an agent session that runs on a virtual machine the provider manages instead of your machine. It keeps working even if you close your laptop, and you can look in on it from any device.[^1] In [!claudeCode] you start one at [claude.ai/code](https://claude.ai/code), from the Code tab of the mobile app, or from the terminal:[^1]

```bash
claude --cloud "Fix the pagination bug in the product list and run the tests"
```

The virtual machine clones the repository from GitHub, not your local folder. If you have local commits, push them first.[^1] Every `--cloud` command opens a separate session, so you can start several jobs at once.[^1] When the work is done you open a PR, or pull the session with its branch into your terminal with `claude --teleport` and carry on there.[^1]

The flow the [!claudeCode] docs suggest: work the plan out together locally in plan mode, write it to a file and push it, then hand the implementation to the cloud.[^1] The `SPEC.md` from the [Spec-driven development](/academy/ai/spec-driven-development) lesson is exactly for this.

**Having the PR watched:** with Auto-fix on, the agent watches the CI failures and review comments on the PR. When the fix is clear it pushes it itself, and when a comment is ambiguous it asks you.[^1]

The equivalent in [!cursor] is Cloud Agents. You start one from the web, from mobile, from Slack, or by writing `@cursor` in a PR. The agent works on a separate branch and opens a PR with screenshots.[^2]

> [!NOTE]
>
> A cloud session draws on your plan's usage limit. Every session you start in parallel consumes the limit proportionally.[^1]

## An agent on GitHub

With [!claudeCode] GitHub Actions you put the agent inside your repository. The easiest setup is the `/install-github-app` command in [!claudeCode]. It installs the GitHub App, adds the key as a repository secret and prepares a PR for the workflow file.[^3] After that you can assign the agent work in any issue or PR comment:[^3]

```text
@claude fix the TypeError in CartSummary and add a test
```

To run the agent on every PR by itself, you give the workflow a `prompt`. In that case the agent does not wait to be mentioned.[^3] A workflow that reviews every PR automatically:[^3]

```yaml
# .github/workflows/code-review.yml
name: Code Review
on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened]
jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          plugin_marketplaces: "https://github.com/anthropics/claude-code.git"
          plugins: "code-review@claude-code-plugins"
          prompt: "/code-review:code-review --comment ${{ github.repository }}/pull/${{ github.event.pull_request.number }}"
          claude_args: '--allowedTools "mcp__github_inline_comment__create_inline_comment"'
```

`--comment` has the findings written to the PR as line comments. Draft PRs are skipped.[^3] The agent reviews by reading the project's `CLAUDE.md`. Write your review criteria there.[^3]

The cost has two parts: GitHub Actions minutes and tokens. Limit the number of rounds with `--max-turns` inside `claude_args`, and the duration by adding `timeout-minutes` to the workflow.[^3]

> [!CAUTION]
>
> Never write the API key into the workflow file. Store it as a repository secret and give the workflow only the permissions it needs.[^3]

## Headless

`claude -p` runs the agent with a single command, without opening a chat. It becomes part of a script, a pre-commit hook or a CI step:[^4]

```bash
claude -p "Fix the lint errors in the changed files" \
  --allowedTools "Edit,Bash(pnpm lint *)"
```

`--output-format json` gives the result in a form a script can read. `--allowedTools` makes sure only the tools you permitted are used while it runs unattended.[^4]

## Verifying the result

The longer the agent runs unattended, the more the independent check before you call the work done matters.[^4] Three rules:

1. **Give it a goal that can be checked.** Without a check it can run, the agent stops at "this looks done".[^4] Put the test command in the prompt, or use the `Stop` hook from the [Hooks and permission modes](/academy/ai/hooks) lesson.
2. **Ask for proof.** The test output, the command that was run, a screenshot. Reading the proof is faster than verifying everything from scratch.[^4]
3. **Isolate risky work.** [Simon Willison](https://simonwillison.net) hands risky work to agents running asynchronously in the cloud instead of in a local terminal.[^5] There the agent cannot touch your machine or your keys.

> [!WARNING]
>
> Issue and PR comments can be written by anyone, and an instruction can be hidden in text the agent reads *(see [Security and cost](/academy/ai/security-and-cost))*. With Auto-fix on, the agent also writes comments on your behalf. Turn Auto-fix off in repositories that have deploy automation triggered by a comment.[^1]

## Try it yourself

- Start a small job with `claude --cloud` and close the terminal. What is the agent doing when you look in on the session from your phone?
- Run `/install-github-app` in a test repository and write a small request with `@claude` in an issue. Is the result a comment or a PR?
- Turn on the automatic review workflow and send a deliberately broken PR. Does the review find the bug?
- Run the same request with `claude -p` once with `--allowedTools` and once without. What is the difference?

## Going deeper

- **Official docs:** [!claudeCode] "Use Claude Code in the cloud"; the cloud environments, `--teleport`, Auto-fix and security.[^1]
- **Official docs:** [!claudeCode] "GitHub Actions"; the setup, example workflows and keeping the cost down.[^3]
- **Article:** [Simon Willison](https://simonwillison.net), "Embracing the parallel coding agent lifestyle"; which work he gives to local and to cloud agents.[^5]

## Sources

1. [Claude Code: Use Claude Code in the cloud](https://code.claude.com/docs/en/claude-code-on-the-web) *(doc)* — The cloud session, `--cloud`, `--teleport`, Auto-fix, limits and security.
2. [Cursor: Cloud Agents](https://cursor.com/docs/cloud-agent) *(doc)* — Agents running in the cloud, the ways to start them and delivery as a PR.
3. [Claude Code: GitHub Actions](https://code.claude.com/docs/en/github-actions) *(doc)* — `/install-github-app`, `@claude`, the automatic review workflow, secrets and cost.
4. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Headless mode, `--allowedTools`, verification and independent review.
5. [Simon Willison](https://simonwillison.net): [Embracing the parallel coding agent lifestyle](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) *(article)* — October 5, 2025. Asynchronous cloud agents for risky work.
