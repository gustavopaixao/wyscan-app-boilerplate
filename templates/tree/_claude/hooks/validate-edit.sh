#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): single-file Biome lint of the touched file.
# Exit 2 feeds the issues back to Claude to fix. Non-blocking for the user (edit already applied).
# Scope: api/ and web/* (Biome-linted areas). Mobile is skipped here — the commit gate runs tsc.
set -uo pipefail
input=$(cat)
f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')
[ -n "$f" ] && [ -f "$f" ] || exit 0
case "$f" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac
root=$(git -C "$(dirname "$f")" rev-parse --show-toplevel 2>/dev/null) || exit 0
rel=${f#"$root"/}
case "$rel" in
  api/*)                  pkg="$root/api" ;;
  web/__PROJECT_SLUG__-admin/*) pkg="$root/web/__PROJECT_SLUG__-admin" ;;
  web/__PROJECT_SLUG__-site/*)  pkg="$root/web/__PROJECT_SLUG__-site" ;;
  *) exit 0 ;;
esac
out=$(cd "$pkg" && pnpm exec biome check "$f" 2>&1)
[ $? -eq 0 ] && exit 0
{
  echo "Biome found issues in $rel — fix them (or run \`pnpm lint:fix\` in $(basename "$pkg")):"
  echo "$out"
} >&2
exit 2
