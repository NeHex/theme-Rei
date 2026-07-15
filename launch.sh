#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

command -v node >/dev/null 2>&1 || {
  echo "node is required" >&2
  exit 1
}
command -v npm >/dev/null 2>&1 || {
  echo "npm is required" >&2
  exit 1
}
command -v pm2 >/dev/null 2>&1 || {
  echo "pm2 is required" >&2
  exit 1
}

if [[ -f .env ]]; then
  echo "Starting Rei theme with .env configuration"
else
  echo "Warning: .env is missing; defaults will be used" >&2
fi

pm2 start ecosystem.config.cjs --update-env
