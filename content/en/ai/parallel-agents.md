---
title: "Parallel agents"
description: "Running several agents at once with git worktree, without overwriting each other's files."
lastVerified: "2026-10-26"
translationKey: "ai/parallel-agents"
---

You don't have to sit and watch an agent while it works on a feature. In the same stretch of time you can give a second agent a bug fix and a third one some research. The problem: if they all work in the same folder they overwrite each other's files. The fix is to give every agent its own working copy.

## What is a worktree?

**A git worktree is a second working folder attached to the same repository.** It has its own files and its own branch, but the commit history and the remote are shared.[^1][^2] One agent writes the coupon feature in the `feature/coupon` worktree while another fixes the cart total in `fix/cart-total`. Neither sees the other's changes.

You can open a worktree without an agent too:[^1]

```bash
git worktree add ../shop-coupon -b feature/coupon
cd ../shop-coupon
pnpm install
```

`git worktree list` shows them all, and when the work is done you delete one with `git worktree remove ../shop-coupon`.[^1]

## Worktrees in Claude Code

[!claudeCode] opens the worktree for you. Start it with a different name in each terminal:[^1]

```bash
claude --worktree coupon
claude --worktree cart-total
```

The worktree is created under `.claude/worktrees/<name>/` in the repository root, on a new branch called `worktree-<name>`. On exit, if there are no changes, the worktree and the branch are deleted on their own. If there are changes, you are asked whether you want to keep them.[^1]

Two settings make life easier:[^1]

- Add the `.claude/worktrees/` folder to `.gitignore`. Otherwise it shows up as untracked files in the main folder.
- A worktree is a clean checkout, so gitignored files like `.env` do not come with it. What you list in a `.worktreeinclude` file at the root is copied into every new worktree.

```text
.env
.env.local
```

Subagents can work in their own worktrees too. Adding `isolation: worktree` to the subagent file's frontmatter is enough.[^1]

## Worktrees in Cursor

In [!cursor] you start an agent in a worktree from the Agents panel. In the editor the `/worktree` command does the same thing, and `/apply-worktree` brings the changes back into the main folder.[^3] You write the setup steps into `.cursor/worktrees.json`:[^3]

```json
{
  "setup-worktree": ["pnpm install", "cp $ROOT_WORKTREE_PATH/.env .env"]
}
```

`/best-of-n` gives the same task to several models at once, each working in its own worktree. You compare the results and take the one you like. It merges none of them on its own.[^3]

> [!WARNING]
>
> Don't symlink `node_modules` into a worktree; it can break the main folder. Run `pnpm install` in every worktree. It is fast, because pnpm links the packages from a shared store.[^3]

## What can run in parallel?

The limit on parallel work is not the number of agents but **how fast you can review**. [Simon Willison](https://simonwillison.net) writes that he can only properly review and merge one large change at a time.[^4] So he puts work that needs little attention alongside it:[^4]

| Goes well in parallel | Keep it in the main task |
| :-- | :-- |
| A small prototype trying out a library | Two features that touch the same files |
| A note explaining a part of the code | Steps that depend on each other *(the API first, then the interface)* |
| Small maintenance like a deprecation warning | Design work you have to decide on |
| A task with a clear spec that is easy to review | Vague work that needs frequent questions |

A clear spec speeds up the review.[^4] Write down the work you are going to hand a parallel agent first, as in the [Spec-driven development](/academy/ai/spec-driven-development) lesson.

Willison has one more suggestion: for a hard piece of work, run an agent purely to **explore**. Don't plan on merging its code. The point is to see which files are hard and how the problem could be solved.[^4]

## Merging

Every worktree is a separate branch. Open a PR from the one that finished, and let the tests and the review run as they would on the main branch. If two worktrees touched the same file, you resolve the conflict while merging. That is why splitting the work across different files from the start matters.

If you are going to run two instances of the application at once, give them separate ports: one `pnpm dev`, the other `pnpm dev --port 3001`.

> [!TIP]
>
> Give every worktree its own name *(`coupon`, `cart-total`)*. In [!claudeCode] you can return to the same session with `claude --worktree coupon --resume`.[^1]

## Try it yourself

- Open two worktrees in two terminals: sorting on the product list in one, a footer copy change in the other. What does `git worktree list` show?
- Open a worktree without a `.worktreeinclude` and run the application. What breaks because `.env` is missing?
- Give the same small bug to two agents in separate worktrees. Are the two fixes the same? Which one is easier to review?
- Close a worktree without making any changes. Is the branch still there?

## Going deeper

- **Official docs:** [!claudeCode] "Run parallel sessions with worktrees"; `--worktree`, `.worktreeinclude`, cleanup and subagent isolation.[^1]
- **Article:** [Simon Willison](https://simonwillison.net), "Embracing the parallel coding agent lifestyle"; which jobs go well in parallel, and the review bottleneck.[^4]
- **Official docs:** [!cursor] "Worktrees"; the setup script, `/best-of-n` and the worktree limit.[^3]

## Sources

1. [Claude Code: Run parallel sessions with worktrees](https://code.claude.com/docs/en/worktrees) *(doc)* — `--worktree`, where the worktree lives, cleanup, `.worktreeinclude` and `isolation: worktree`.
2. [Git: git-worktree](https://git-scm.com/docs/git-worktree) *(doc)* — The commands for adding, listing and removing a worktree.
3. [Cursor: Worktrees](https://cursor.com/docs/configuration/worktrees) *(doc)* — `/worktree`, `/apply-worktree`, `.cursor/worktrees.json` and `/best-of-n`.
4. [Simon Willison](https://simonwillison.net): [Embracing the parallel coding agent lifestyle](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) *(article)* — October 5, 2025. The kinds of work that go well in parallel, the review bottleneck and the exploration agent.
