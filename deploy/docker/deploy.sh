#!/usr/bin/env bash
# Se ejecuta por SSH desde .github/workflows/deploy.yml en cada push a main
# ya con test gate en verde e imágenes nuevas publicadas en ghcr.io.
set -euo pipefail

APP_DIR="$HOME/spine"
COMPOSE="docker compose -f docker-compose.production.yml"

cd "${APP_DIR}"
git pull --ff-only

${COMPOSE} pull
${COMPOSE} up -d

echo "== Healthcheck post-deploy =="
sleep 5
curl -fsS https://api-spine.hyperfocus.es/v1/health
curl -fsS -o /dev/null https://spine.hyperfocus.es/
echo "✔ Deploy OK"
