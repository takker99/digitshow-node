#!/bin/bash

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
CWD=$(echo "$INPUT" | jq -r '.cwd')

# ファイル編集に該当するツール名
FILE_EDIT_TOOLS=("create_file" "replace_string_in_file" "multi_replace_string_in_file")

for tool in "${FILE_EDIT_TOOLS[@]}"; do
  if [ "$TOOL_NAME" = "$tool" ]; then
    cd "$CWD" || exit 1

    # pnpm checkを実行し、出力をキャプチャ
    CHECK_OUTPUT=$(pnpm check 2>&1)
    CHECK_EXIT_CODE=$?

    # エラーがある場合、エラー内容をPostToolUse outputに含める
    if [ $CHECK_EXIT_CODE -ne 0 ]; then
      jq -n \
        --arg output "$CHECK_OUTPUT" \
        '{
          "decision": "block",
          "reason": "Code quality check failed",
          "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": ("pnpm check failed with output:\n" + $output)
          }
        }'
      exit 1
    else
      echo '{"continue":true}'
      exit 0
    fi
  fi
done
