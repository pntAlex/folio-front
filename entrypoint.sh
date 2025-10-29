#!/bin/sh
set -e

MODE="${NODE_ENV:-production}"

if [ "$MODE" = "development" ] || [ "$MODE" = "dev" ]; then
  echo "Starting Bun static server in watch mode (development)"
  exec bun --watch server.ts
fi

echo "Starting Bun static server (mode: $MODE)"
exec bun server.ts
