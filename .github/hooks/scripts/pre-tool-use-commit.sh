#!/bin/bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r ".toolName // empty")
CWD=$(echo "$INPUT" | jq -r ".cwd // empty")

echo "PreToolUse triggered: toolName=$TOOL_NAME" >> logs/session.log

if [ "$TOOL_NAME" = "report_progress" ]; then
  cd "$CWD" || exit 1
  echo "=== Pre-commit: running build and tests ===" >> logs/session.log
  pnpm build && pnpm test
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "Build or tests failed. Fix errors before committing." >> logs/session.log
    exit 2
  fi
  echo "=== Pre-commit checks passed ===" >> logs/session.log
  exit 0
fi

if [ "$TOOL_NAME" = "bash" ] || [ "$TOOL_NAME" = "runInTerminal" ]; then
  COMMAND=$(echo "$INPUT" | jq -r ".toolArgs // empty" | jq -r ".command // empty")
  if ! echo "$COMMAND" | grep -qE "git\s+commit"; then
    exit 0
  fi
  cd "$CWD" || exit 1
  echo "=== Pre-commit: running build and tests ===" >> logs/session.log
  pnpm build && pnpm test
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "Build or tests failed. Fix errors before committing." >> logs/session.log
    exit 2
  fi
  echo "=== Pre-commit checks passed ===" >> logs/session.log
  exit 0
fi

exit 0