#!/bin/bash
# PostToolUse hook: ファイル編集ツール実行後に biome check --write を実行する

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# ファイル編集に該当するツール名
# (VS Code Copilot の tool_name は Chat Debug View で確認可能)
FILE_EDIT_TOOLS=("editFiles" "createFile" "str_replace_editor" "str_replace_based_edit_tool")

for tool in "${FILE_EDIT_TOOLS[@]}"; do
  if [ "$TOOL_NAME" = "$tool" ]; then
    cd "$CWD" || exit 1
    pnpm check
    exit 0
  fi
done

# ファイル編集ツール以外は何もしない
exit 0
