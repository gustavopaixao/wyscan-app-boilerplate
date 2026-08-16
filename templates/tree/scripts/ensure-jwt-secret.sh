#!/usr/bin/env sh
# Generate a strong JWT_SECRET into api/.env, idempotently.
#
# Origin: bugfix 0001. Rules:
#   - Never clobber an existing non-empty JWT_SECRET (safe to re-run).
#   - Never print the generated secret.
#   - Only ever write api/.env (created from api/.env.example when present).
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$REPO_ROOT/api/.env"
EXAMPLE_FILE="$REPO_ROOT/api/.env.example"

# Already configured with a non-empty value → leave it untouched.
if [ -f "$ENV_FILE" ] && grep -Eq '^JWT_SECRET=.+$' "$ENV_FILE"; then
  echo "jwt-secret: JWT_SECRET already set in api/.env — leaving it unchanged."
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "jwt-secret: error: openssl not found; cannot generate a secret." >&2
  echo "  Install openssl, or set JWT_SECRET manually in api/.env." >&2
  exit 1
fi

SECRET="$(openssl rand -base64 48)"

# Seed api/.env from the example on first run so all documented vars are present.
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$EXAMPLE_FILE" ]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    echo "jwt-secret: created api/.env from api/.env.example."
  else
    : > "$ENV_FILE"
    echo "jwt-secret: created empty api/.env."
  fi
fi

# Replace an empty/placeholder JWT_SECRET line if one exists, else append.
if grep -Eq '^JWT_SECRET=' "$ENV_FILE"; then
  TMP_FILE="$(mktemp "${TMPDIR:-/tmp}/__PROJECT_SLUG__-env.XXXXXX")"
  grep -v '^JWT_SECRET=' "$ENV_FILE" > "$TMP_FILE"
  mv "$TMP_FILE" "$ENV_FILE"
fi
printf 'JWT_SECRET=%s\n' "$SECRET" >> "$ENV_FILE"

echo "jwt-secret: generated JWT_SECRET and wrote it to api/.env (value not printed)."
