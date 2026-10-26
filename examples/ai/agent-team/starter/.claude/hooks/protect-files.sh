#!/bin/bash
# PreToolUse hook: block edits to lockfiles, env files and git internals.
FILE_PATH=$(jq -r '.tool_input.file_path // empty')

for pattern in ".env" "package-lock.json" ".git/"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH is protected" >&2
    exit 2
  fi
done

exit 0
