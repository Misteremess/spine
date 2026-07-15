#!/usr/bin/env bash
# Backup diario de Postgres. Pensado para el crontab del usuario "max" (no
# root, no /var/log — ver deploy/docker/README.md para el crontab exacto).
set -euo pipefail

APP_DIR="$HOME/spine"
BACKUP_DIR="${APP_DIR}/deploy/docker/backups"
RETENTION_DAYS=14
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "${APP_DIR}"
mkdir -p "${BACKUP_DIR}"

set -a
source .env.production
set +a

docker compose -f docker-compose.production.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
  > "${BACKUP_DIR}/spine-${STAMP}.sql"

gzip "${BACKUP_DIR}/spine-${STAMP}.sql"
find "${BACKUP_DIR}" -name "spine-*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "$(date -Iseconds) backup OK: spine-${STAMP}.sql.gz"
