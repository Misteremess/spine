#!/usr/bin/env bash
# Aprovisiona una VM Ubuntu 24.04 (Oracle Always Free) para la API de Spine.
# Uso: sudo bash setup-vm.sh spine-api.duckdns.org
set -euo pipefail

DOMAIN="${1:?Uso: sudo bash setup-vm.sh <dominio>}"
APP_DIR="/home/ubuntu/spine"
DB_PASS="$(openssl rand -hex 16)"

echo "== Swap (imprescindible en la E2.1.Micro de 1 GB) =="
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== Node 24 + pnpm =="
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs git
npm install -g pnpm@11

echo "== PostgreSQL =="
apt-get install -y postgresql
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='spine'" | grep -q 1 ||
  sudo -u postgres psql -c "CREATE ROLE spine LOGIN PASSWORD '${DB_PASS}'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='spine'" | grep -q 1 ||
  sudo -u postgres createdb -O spine spine

echo "== Caddy (HTTPS automático) =="
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' |
  gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' |
  tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
	reverse_proxy localhost:3123
}
EOF
systemctl reload caddy

echo "== Código y dependencias =="
if [ ! -d "${APP_DIR}" ]; then
  sudo -u ubuntu git clone https://github.com/Misteremess/spine.git "${APP_DIR}"
fi
cd "${APP_DIR}"
sudo -u ubuntu pnpm install --frozen-lockfile

echo "== Variables de entorno =="
ENV_FILE="${APP_DIR}/apps/api/.env"
if [ ! -f "${ENV_FILE}" ]; then
  sudo -u ubuntu tee "${ENV_FILE}" > /dev/null <<EOF
DATABASE_URL=postgres://spine:${DB_PASS}@localhost:5432/spine
BETTER_AUTH_SECRET=$(openssl rand -hex 32)
BETTER_AUTH_URL=https://${DOMAIN}
GOOGLE_BOOKS_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EOF
  echo ">> Rellena GOOGLE_BOOKS_API_KEY y los SMTP_* en ${ENV_FILE}"
fi

echo "== Esquema de base de datos =="
cd "${APP_DIR}/apps/api" && sudo -u ubuntu pnpm db:push

echo "== Servicio systemd =="
cp "${APP_DIR}/deploy/spine-api.service" /etc/systemd/system/spine-api.service
systemctl daemon-reload
systemctl enable --now spine-api

# Ubuntu de Oracle trae iptables restrictivo además de la security list.
iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 80 -j ACCEPT
iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 443 -j ACCEPT
apt-get install -y iptables-persistent >/dev/null 2>&1 || true
netfilter-persistent save >/dev/null 2>&1 || true

echo
echo "✔ Listo. Comprueba: curl https://${DOMAIN}/v1/health"
echo "  Logs: journalctl -u spine-api -f"
