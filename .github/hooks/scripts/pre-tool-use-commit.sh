#!/bin/bash
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r ".toolName // empty")
CWD=$(echo "$INPUT" | jq -r ".cwd // empty")

echo "PreToolUse triggered: toolName=$TOOL_NAME" >> logs/session.log

# Coding Agent: report_progress function の場合
if [ "$TOOL_NAME" = "report_progress" ]; then
  cd "$CWD" || exit 1
  echo "=== Pre-commit: running build and tests ===" >> logs/session.log
  pnpm test
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "Build or tests failed. Fix errors before committing." >> logs/session.log
    exit 2
  fi
  echo "=== Pre-commit checks passed ===" >> logs/session.log
  exit 0
fi

# MCP git commit tools (e.g., mcp_git_wsl__git_commit)
if echo "$TOOL_NAME" | grep -qE "mcp.*git.*commit"; then
  cd "$CWD" || exit 1
  echo "=== Pre-commit: running build and tests (MCP git commit) ===" >> logs/session.log
  pnpm test
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "Build or tests failed. Fix errors before committing." >> logs/session.log
    exit 2
  fi
  echo "=== Pre-commit checks passed ===" >> logs/session.log
  exit 0
fi

# VS Code agent: bash / runInTerminal tool の場合
if [ "$TOOL_NAME" = "bash" ] || [ "$TOOL_NAME" = "runInTerminal" ]; then
  COMMAND=$(echo "$INPUT" | jq -r ".toolArgs // empty" | jq -r ".command // empty")
  if ! echo "$COMMAND" | grep -qE "git\s+commit"; then
    exit 0
  fi
  cd "$CWD" || exit 1
  echo "=== Pre-commit: running build and tests ===" >> logs/session.log
  pnpm test
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "Build or tests failed. Fix errors before committing." >> logs/session.log
    exit 2
  fi
  echo "=== Pre-commit checks passed ===" >> logs/session.log
  exit 0
fi

exit 0