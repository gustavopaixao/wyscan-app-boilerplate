#!/usr/bin/env bash
# PostToolUse (Write): when a UI .tsx file is written, suggest a UX/UI review. Non-blocking.
set -uo pipefail
input=$(cat)
f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')
[ -n "$f" ] || exit 0
case "$f" in *.tsx) ;; *) exit 0 ;; esac
root=$(git -C "$(dirname "$f")" rev-parse --show-toplevel 2>/dev/null) || exit 0
rel=${f#"$root"/}
case "$rel" in
  mobile/components/*|mobile/app/*|\
  web/__PROJECT_SLUG__-admin/*components*|web/__PROJECT_SLUG__-admin/*app/*|\
  web/__PROJECT_SLUG__-site/*components*|web/__PROJECT_SLUG__-site/*app/*) ;;
  *) exit 0 ;;
esac
jq -nc --arg f "$rel" '{systemMessage:("🎨 New/updated UI file \($f) — consider /ux-review and /ui-review before shipping.")}'
exit 0
