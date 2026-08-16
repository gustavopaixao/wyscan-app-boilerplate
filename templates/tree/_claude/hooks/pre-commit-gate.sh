#!/usr/bin/env bash
# PreToolUse (Bash): BLOCK `git commit` unless lint/type-check/tests pass for the staged areas.
# Mirrors the mandatory gates in .cursor/rules/skills.mdc (Git skill). Exit 2 blocks the commit.
set -uo pipefail
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
# Only act on commands that run `git commit` (also matches compound `cd x && git commit`).
printf '%s' "$cmd" | grep -Eq '(^|[;&|[:space:]])git([[:space:]]+[^;&|]*)?[[:space:]]+commit([[:space:]]|$)' || exit 0
# Skip --no-verify / amend-only? Honor --no-verify as an explicit opt-out.
printf '%s' "$cmd" | grep -Eq -- '--no-verify' && exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0
staged=$(git diff --cached --name-only)
[ -z "$staged" ] && exit 0   # nothing staged — let git report it

fail=0; report=""
tmp=$(mktemp)
run() { # label  dir  cmd...
  local label="$1" dir="$2"; shift 2
  for c in "$@"; do
    if ( cd "$dir" && eval "$c" ) >"$tmp" 2>&1; then
      :
    else
      report="${report}
--- ${label}: \`${c}\` FAILED ---
$(tail -40 "$tmp")
"
      fail=1
    fi
  done
}

printf '%s\n' "$staged" | grep -q '^api/'                  && run "api"       "$root/api"                  "pnpm lint" "pnpm test"
printf '%s\n' "$staged" | grep -q '^web/__PROJECT_SLUG__-site/'  && run "web-site"  "$root/web/__PROJECT_SLUG__-site"  "pnpm lint" "pnpm type-check"
printf '%s\n' "$staged" | grep -q '^web/__PROJECT_SLUG__-admin/' && run "web-admin" "$root/web/__PROJECT_SLUG__-admin" "pnpm lint" "pnpm type-check" "pnpm test"
printf '%s\n' "$staged" | grep -q '^mobile/'               && run "mobile"    "$root/mobile"               "pnpm exec tsc --noEmit"
rm -f "$tmp"

if [ "$fail" -ne 0 ]; then
  {
    echo "🚫 Commit blocked — required checks failed for staged changes:"
    echo "$report"
    echo "Fix the failures above, re-stage, and commit again (or use --no-verify to bypass intentionally)."
  } >&2
  exit 2
fi
exit 0
