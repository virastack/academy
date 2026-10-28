---
title: "Hooks and permission modes"
description: "Binding the agent to rules: format, lint and test gates, blocking dangerous commands, and permission modes."
lastVerified: "2026-10-26"
translationKey: "ai/hooks"
---

You wrote *"run the tests after every change"* in `CLAUDE.md`, and the agent still skips it sometimes. That is not a bug. A rule file goes to the model as context and following it is not guaranteed *(see [Prompt and context engineering](/academy/ai/prompt-and-context-engineering))*. For something that has to happen every time, without exception, you use a hook.[^1]

## What is a hook?

**A hook is a shell command that runs automatically at particular moments in the agent's work.**[^2] It kicks in after the agent edits a file, before it runs a command, or when it says it is finished. The model does not decide; the command runs every time.[^2]

The three moments that help most in frontend work:

| Moment | [!claudeCode] | [!cursor] | Example |
| :-- | :-- | :-- | :-- |
| **Before a tool runs** | `PreToolUse` | `preToolUse`, `beforeShellExecution` | Block writing to `.env` |
| **After a file is edited** | `PostToolUse` | `afterFileEdit` | Format with Prettier |
| **When the agent finishes** | `Stop` | `stop` | Don't let it finish until the tests pass |

In both tools the hooks are written into the project folder and can be committed to the repository: `.claude/settings.json` in [!claudeCode] and `.cursor/hooks.json` in [!cursor].[^2][^3] That way everyone on the team runs their agent under the same rules.

## Format after every edit

Use `PostToolUse` to make the code the agent writes follow your formatting rules. The `matcher` makes the hook run only after tools that edit files:[^2]

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

When the hook runs, the event's details arrive on the command's stdin as JSON. The path of the edited file is in the `tool_input.file_path` field, and `jq` pulls it out and hands it to Prettier.[^2] You can run `npx eslint --fix` in the same place.

## Block a dangerous operation

A `PreToolUse` hook kicks in before the tool runs and can stop the operation. The rule is simple: if the script ends with **exit code 2**, the operation is blocked and the message you write to stderr goes back to the agent as feedback.[^2] The agent reads the reason and tries another route.

```bash
#!/bin/bash
# .claude/hooks/protect-files.sh
FILE_PATH=$(jq -r '.tool_input.file_path // empty')

for pattern in ".env" "pnpm-lock.yaml" ".git/"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH is protected" >&2
    exit 2
  fi
done

exit 0
```

Make the script executable with `chmod +x` and register it under `PreToolUse` with the `Edit|Write` matcher.[^2] Exit code 0 does not approve the operation, it only declines to object. The normal permission flow still runs.[^2]

## Don't let it finish until the tests pass

The `Stop` hook runs when the agent finishes its answer. Exit code 2 here means *"not done yet"*: the agent does not stop and carries on working with the message from stderr.[^1][^2] That turns *"fix it until the tests pass"* from a request into a rule:

```bash
#!/bin/bash
# .claude/hooks/require-tests.sh
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi

if ! OUTPUT=$(pnpm test --run 2>&1); then
  echo "Tests are failing. Fix them before finishing:" >&2
  echo "$OUTPUT" | tail -n 30 >&2
  exit 2
fi
```

The `stop_hook_active` check prevents an infinite loop. [!claudeCode] ignores a `Stop` hook once it has blocked eight times in a row.[^2]

> [!WARNING]
>
> The `Stop` hook runs not only when the work is finished but whenever the agent finishes **any** answer.[^2] It runs the tests even when you only asked a question. If you have a long test suite, run the tests for the changed files only.

## Permission modes

Hooks enforce a rule. Permission modes decide **how much the agent does without asking**. In [!claudeCode] you cycle through the modes with `Shift+Tab`:[^4]

| Mode | What the agent does | When |
| :-- | :-- | :-- |
| **Manual** *(default)* | Asks before edits and commands | A codebase you don't know |
| **acceptEdits** | Edits files without asking, asks for commands | After the plan is approved |
| **plan** | Only reads and proposes a plan | Before a large change |
| **auto** | Does everything, with a separate model blocking risky operations | Long, unattended work |
| **bypassPermissions** | Asks nothing | Only in an isolated container or VM |

Approving things constantly is tiring. After the tenth approval you start clicking without reading.[^1] Instead, allow the commands you trust up front and forbid the dangerous ones:[^4][^5]

```json
{
  "permissions": {
    "allow": ["Bash(pnpm test *)", "Bash(pnpm lint)"],
    "ask": ["Bash(git push *)"],
    "deny": ["Bash(rm -rf *)", "Read(./.env)"]
  }
}
```

The `deny` rules hold in every mode, `bypassPermissions` included.[^4] A block from a `PreToolUse` hook cannot be worked around by changing the mode either.[^2]

> [!CAUTION]
>
> Hooks are shell commands that run with your own user permissions. Read the script before running a hook that came from a plugin or someone else's repository.

## Which one when

| What you need | The tool |
| :-- | :-- |
| A preference, a style, an architectural decision | `CLAUDE.md` / `AGENTS.md` |
| A repeated workflow | A skill *(see [Skills](/academy/ai/skills))* |
| Something that has to happen every time, without exception | A hook |
| What the agent is allowed to touch | Permission rules and the permission mode |

If the agent keeps ignoring a line in your rule file and that line really is a requirement, move it into a hook.[^1]

## Try it yourself

- Add the Prettier hook and ask the agent to write a file with single-quoted strings in it. What happens to the quotes when the file is saved?
- Add the `.env` protection hook and tell the agent *"add a comment line to .env"*. What does the agent do once it is blocked?
- Break a test on purpose and turn on the `Stop` hook. How many rounds does the agent take to fix the test and stop?
- Run the `/hooks` command in [!claudeCode]. Which hooks appear bound to which event?

## Going deeper

- **Official docs:** [!claudeCode] "Automate actions with hooks"; all the events, matchers, prompt-based hooks and common mistakes.[^2]
- **Official docs:** [!cursor] "Hooks"; the event list, the `permission` output and team hooks.[^3]
- **Official docs:** [!claudeCode] "Permission modes"; the detail of each mode and how auto mode decides.[^4]

## Sources

1. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — A rule file is advice, a hook is definite; verification with a Stop hook, and approval fatigue.
2. [Claude Code: Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide) *(doc)* — The events, the stdin JSON, exit code 2, the Prettier and file-protection examples, and the Stop hook limit.
3. [Cursor: Hooks](https://cursor.com/docs/agent/hooks) *(doc)* — `.cursor/hooks.json`, the event list and what the exit codes mean.
4. [Claude Code: Permission modes](https://code.claude.com/docs/en/permission-modes) *(doc)* — The manual, acceptEdits, plan, auto, dontAsk and bypassPermissions modes.
5. [Claude Code: Configure permissions](https://code.claude.com/docs/en/permissions) *(doc)* — How to write `allow`, `ask` and `deny` rules, and their precedence.
