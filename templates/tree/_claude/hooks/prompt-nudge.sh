#!/usr/bin/env bash
# UserPromptSubmit: inject a lightweight reminder of the relevant __PROJECT_NAME__ agent/command
# based on keywords in the prompt. Non-blocking; adds context only.
set -uo pipefail
input=$(cat)
p=$(printf '%s' "$input" | jq -r '.prompt // empty' | tr '[:upper:]' '[:lower:]')
[ -n "$p" ] || exit 0

n=""
add(){ n="${n}- ${1}
"; }
case "$p" in *security*|*vulnerab*|*owasp*|*injection*|*authentic*|*authoriz*|*secret*) add "Security-sensitive — consider \`/security-scan\` (security agent)." ;; esac
case "$p" in *architecture*|*"design pattern"*|*solid*|*"tech debt"*|*"technical debt"*|*"clean code"*) add "Architecture concern — consider \`/architect-review\`." ;; esac
case "$p" in *accessib*|*"dark mode"*|*theming*|*"ux review"*|*"user experience"*|*"a11y"*) add "UX/accessibility — consider \`/ux-review\`." ;; esac
case "$p" in *translat*|*localiz*|*i18n*|*"missing key"*) add "Localization — consider \`/translator\`." ;; esac
case "$p" in *"load test"*|*"performance"*|*benchmark*|*bottleneck*|*throughput*) add "Performance — consider \`/loadtest\`." ;; esac
case "$p" in *"feature parity"*|*"both platforms"*|*"other platform"*|*"cross-platform"*) add "Parity — consider \`/feature-parity\`." ;; esac
[ -n "$n" ] || exit 0

ctx="Suggested __PROJECT_NAME__ agents for this request (optional):
${n}"
jq -nc --arg c "$ctx" '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:$c}}'
exit 0
