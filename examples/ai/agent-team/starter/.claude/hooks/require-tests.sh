#!/bin/bash
# Stop hook: do not let the agent finish while unit tests fail.
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi

if ! OUTPUT=$(npm run test:unit --silent 2>&1); then
  echo "Unit tests are failing. Fix them before finishing:" >&2
  echo "$OUTPUT" | tail -n 30 >&2
  exit 2
fi
