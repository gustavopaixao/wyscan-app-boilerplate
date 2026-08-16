#!/usr/bin/env bash
# PreToolUse(Bash) hook: auto-approve compound commands that combine `cd`
# with output redirection, which the harness otherwise flags as
# "manual approval required to prevent path resolution bypass".
#
# Emits a PreToolUse "allow" decision only for that specific shape; every
# other command produces no output so normal permission flow is untouched.
set -euo pipefail

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"

# Condition 1: a `cd` invocation (at start, or after a shell separator/space).
has_cd() { printf '%s' "$cmd" | grep -qE '(^|[;&|(]|[[:space:]])cd([[:space:]]|$)'; }

# Condition 2: an output redirection (>, >>, or N>) that isn't part of >&.
has_redirect() { printf '%s' "$cmd" | grep -qE '[0-9]?>>?[^&]|[0-9]?>>?$'; }

if has_cd && has_redirect; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Auto-approved: cd + output redirection compound command (path-resolution guard suppressed by user setting)."}}'
fi

exit 0
