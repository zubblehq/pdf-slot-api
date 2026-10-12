#!/usr/bin/env bash
# The whole thing, locally: Postgres, the API, the web app -- with bulk
# generation working, which needs all three.
#
#   scripts/dev-stack.sh        start everything
#   scripts/dev-stack.sh stop   stop everything
#
# The web app only shows "Generate from data" when it has an API to talk
# to (VITE_API_URL); without one it runs on browser storage alone and bulk
# generation is not offered at all.
#
# It also writes apps/api/.env on first run if there is none: the file is
# gitignored, so a fresh clone has nothing for the API to start from.
#
# Servers are detached from the shell that starts them, so closing the
# terminal does not take them with it.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS="${TMPDIR:-/tmp}/pdfslot-dev"
mkdir -p "$LOGS"

if [ "${1:-}" = "stop" ]; then
  pkill -f 'nitro dev' 2>/dev/null || true
  pkill -f 'vite --port 5173' 2>/dev/null || true
  docker rm -f pdfslot-pg > /dev/null 2>&1 || true
  echo "stopped"
  exit 0
fi

if [ ! -f "$ROOT/apps/api/.env" ]; then
  echo "writing apps/api/.env for local development..."
  cat > "$ROOT/apps/api/.env" <<'ENV'
# Local development only. Written by scripts/dev-stack.sh; gitignored.
DATABASE_URL=postgres://postgres:pw@localhost:55432/pdfslot
# Local files instead of a blob service -- see apps/api/src/runtime.ts.
BLOB_DIR=.blobs
API_KEY=local-dev-key
WEB_ORIGIN=http://localhost:5173
# Must match VITE_CORE_VERSION below, or every job is refused.
CORE_VERSION=local
ENV
fi

if ! docker ps --filter name=pdfslot-pg --format '{{.Names}}' | grep -q pdfslot-pg; then
  echo "starting Postgres..."
  docker run --rm -d --name pdfslot-pg -e POSTGRES_PASSWORD=pw -p 55432:5432 postgres:17 > /dev/null
  for _ in $(seq 1 30); do
    docker exec pdfslot-pg pg_isready -U postgres > /dev/null 2>&1 && break
    sleep 1
  done
  docker exec pdfslot-pg psql -U postgres -c "CREATE DATABASE pdfslot" > /dev/null 2>&1 || true
  (cd "$ROOT/apps/api" && npm run db:migrate > "$LOGS/migrate.log" 2>&1) && echo "migrations applied"
fi

pkill -f 'nitro dev' 2>/dev/null || true
pkill -f 'next dev -p 5173' 2>/dev/null || true
sleep 2

cd "$ROOT/apps/api"
setsid nohup npm run dev > "$LOGS/api.log" 2>&1 < /dev/null &
cd "$ROOT/apps/web"
# VITE_CORE_VERSION is set on both sides to the same value on purpose: the
# version guard (see CORE_VERSION_HEADER) must not fire locally, where there
# is one copy of core and nothing to disagree about.
VITE_API_URL=http://localhost:3000 VITE_CORE_VERSION=local \
  setsid nohup npx vite --port 5173 > "$LOGS/web.log" 2>&1 < /dev/null &

for _ in $(seq 1 40); do
  api=$(curl -s -m 2 -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || true)
  web=$(curl -s -m 2 -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null || true)
  if [ "$api" = "200" ] && [ "$web" = "200" ]; then
    echo
    echo "  http://localhost:5173"
    echo "  API key for generating: $(grep '^API_KEY=' "$ROOT/apps/api/.env" | cut -d= -f2-)"
    echo
    echo "  logs: $LOGS"
    exit 0
  fi
  sleep 3
done
echo "did not come up: api=${api:-} web=${web:-}; see $LOGS"
exit 1
