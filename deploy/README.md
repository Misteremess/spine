# Despliegue en Oracle Cloud Free Tier

Guía para poner la API de Spine en una VM **Always Free** de Oracle (coste cero real).

## 1. Crear la cuenta y la VM (consola web de Oracle)

1. Regístrate en <https://www.oracle.com/cloud/free/> (pide tarjeta para verificar identidad; **no cobra** mientras uses solo recursos Always Free).
2. En la consola: **Compute → Instances → Create instance**.
   - Imagen: **Ubuntu 24.04** (aarch64).
   - Shape: **Ampere A1.Flex** — hasta 4 OCPUs y 24 GB de RAM entran en Always Free (con 2 OCPU / 12 GB sobra).
   - Descarga la clave SSH privada que te genera (o sube la tuya).
3. Abre los puertos web: **Networking → Virtual cloud networks → (tu VCN) → Security lists → Default** → *Add Ingress Rules*:
   - Source `0.0.0.0/0`, TCP, puerto de destino `80`.
   - Source `0.0.0.0/0`, TCP, puerto de destino `443`.
4. Apunta la **IP pública** de la instancia.

## 2. Nombre de dominio gratis (DuckDNS)

La app móvil necesita HTTPS, y para HTTPS hace falta un nombre:

1. Entra en <https://www.duckdns.org> (login con GitHub).
2. Crea el subdominio `spine-api` (→ `spine-api.duckdns.org`) apuntando a la IP pública de la VM.

## 3. Aprovisionar la VM

```bash
ssh -i clave.pem ubuntu@IP_PUBLICA
git clone https://github.com/Misteremess/spine.git
cd spine/deploy
sudo bash setup-vm.sh spine-api.duckdns.org
```

El script instala Node 24 + pnpm + PostgreSQL + Caddy, crea la BD, compila
las dependencias, deja la API como servicio systemd y Caddy sirviendo
`https://spine-api.duckdns.org` con certificado automático de Let's Encrypt.

## 4. Secretos

El script crea `/home/ubuntu/spine/apps/api/.env` con huecos. Rellénalos:

```ini
DATABASE_URL=postgres://spine:CONTRASEÑA_GENERADA@localhost:5432/spine
BETTER_AUTH_SECRET=  # openssl rand -hex 32
BETTER_AUTH_URL=https://spine-api.duckdns.org
GOOGLE_BOOKS_API_KEY=  # la misma key de desarrollo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=  # login SMTP de Brevo
SMTP_PASS=  # clave SMTP de Brevo
EMAIL_FROM=Spine <tu-correo-verificado-en-brevo>
```

Después: `sudo systemctl restart spine-api`.

## 5. Apuntar la app móvil

En `apps/mobile`, publica con la URL de producción:

```bash
EXPO_PUBLIC_API_URL=https://spine-api.duckdns.org npx expo start
```

## Mantenimiento

- Logs: `journalctl -u spine-api -f`
- Actualizar: `cd ~/spine && git pull && pnpm install && sudo systemctl restart spine-api`
- Migraciones: `cd ~/spine/apps/api && pnpm db:push`
