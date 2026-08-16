#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit secrets before deploying."
else
  echo ".env already exists — skipped."
fi

echo ""
echo "Next steps:"
echo "  1. Edit .env (JWT_SECRET, MONGODB_URL, CORS_ORIGIN, Mailgun, attestation, …)"
echo "     Play Integrity (Android prep): copy Fastlane SA JSON to secrets/google-play-sa.json"
echo "     See docs/runbooks/production-api-docker.md#google-play-integrity-credentials-android-attestation-prep"
echo "     Dedicated MongoDB (port 27019, recommended):"
echo "       ./scripts/setup-bundled-mongodb.sh"
echo "       docker compose -f docker-compose.yml -f docker-compose.mongodb-bundled.yml up -d"
echo "     Or reuse an existing MongoDB container:"
echo "       export __PROJECT_CONST___MONGO_PASSWORD='…' && MONGO_CONTAINER=… ./scripts/setup-mongodb-user.sh"
echo "  2. Configure host nginx (see nginx/host-nginx.conf.example → /etc/nginx/sites-available/)"
echo "  3. export VERSION=1.0.0 IMAGE_REGISTRY=__IMAGE_REGISTRY__"
echo "  4. docker compose pull && docker compose up -d  # add -f docker-compose.mongodb-external.yml if needed"
echo "     Or: make upgrade VERSION=1.0.0  # bundled Mongo: uses docker-compose.mongodb-bundled.yml"
echo "  5. sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "Day-to-day ops: docs/runbooks/production-api-day-to-day.md"
