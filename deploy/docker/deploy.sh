#!/usr/bin/env bash
# Se ejecuta por SSH desde .github/workflows/deploy.yml en cada push a main
# ya con test gate en verde e imágenes nuevas publicadas en ghcr.io.
set -euo pipefail

APP_DIR="$HOME/spine"
COMPOSE="docker compose -f docker-compose.production.yml --env-file .env.production"

cd "${APP_DIR}"
git pull --ff-only

${COMPOSE} pull
${COMPOSE} up -d

echo "== Healthcheck post-deploy =="
wait_for() {
  local url="$1"
  for _ in $(seq 1 15); do
    curl -fsS -o /dev/null "$url" && return 0
    sleep 2
  done
  echo "✘ $url no respondió a tiempo"
  return 1
}
wait_for https://api-spine.hyperfocus.es/v1/health
wait_for https://spine.hyperfocus.es/
echo "✔ Deploy OK"
