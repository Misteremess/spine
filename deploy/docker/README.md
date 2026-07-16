# Despliegue en el VPS compartido (Docker + Traefik)

Spine comparte VPS con n8n, Chatwoot, Portainer, Uptime Kuma y Elevate.
El Traefik v2.11 del stack de n8n (`n8n-traefik-1`) es el único contenedor
que publica 80/443; todo lo demás se conecta a la red externa `proxy` y se
expone solo con labels, nunca publicando puertos propios.

- Web: `https://spine.hyperfocus.es`
- API: `https://api-spine.hyperfocus.es`
- Imágenes: `ghcr.io/misteremess/spine-api` y `ghcr.io/misteremess/spine-web`,
  construidas en GitHub Actions (`.github/workflows/deploy.yml`) en cada push
  a `main` (gate: typecheck + tests de todo el monorepo).

## Aprovisionamiento inicial (una sola vez, manual)

Estos pasos los ejecuta el usuario desde su propia sesión SSH ya
autenticada en el VPS — no los automatiza este repo.

1. **Deploy key dedicada de solo lectura** (no reutilizar `github-deploy` ni
   `elevate_deploy`, que son de otros proyectos):

   ```bash
   ssh max@VPS_IP
   ssh-keygen -t ed25519 -f ~/.ssh/spine_deploy -N "" -C "spine-deploy"
   cat ~/.ssh/spine_deploy.pub
   ```

   Añade la pública en GitHub → repo `spine` → Settings → Deploy keys →
   Add deploy key (sin permiso de escritura).

2. **Clonar el repo** con esa key:

   ```bash
   GIT_SSH_COMMAND="ssh -i ~/.ssh/spine_deploy" git clone git@github.com:Misteremess/spine.git ~/spine
   cd ~/spine
   git config core.sshCommand "ssh -i ~/.ssh/spine_deploy"
   ```

3. **Variables de entorno de producción**:

   ```bash
   cp .env.production.example .env.production
   # Rellena POSTGRES_PASSWORD (openssl rand -hex 24, NUNCA base64),
   # BETTER_AUTH_SECRET (openssl rand -hex 32), SMTP_*, GOOGLE_BOOKS_API_KEY,
   # ISBNDB_KEY, HARDCOVER_TOKEN. DATABASE_URL debe usar la MISMA contraseña
   # que POSTGRES_PASSWORD.
   ```

4. **Primer arranque**:

   ```bash
   docker compose -f docker-compose.production.yml --env-file .env.production pull
   docker compose -f docker-compose.production.yml --env-file .env.production up -d
   ```

   (`--env-file` es obligatorio: Compose solo carga `.env` automáticamente,
   no `.env.production`.)

   Tras el primer push a `main` que publique imágenes, comprueba en GitHub →
   repo → Packages que `spine-api` y `spine-web` queden como **públicos**
   (Package settings → Change visibility). Si son privados, `docker compose
   pull` en el VPS fallará por falta de autenticación — o si prefieres
   mantenerlos privados, haz `docker login ghcr.io` una vez en el VPS con un
   PAT con scope `read:packages`.

5. **Esquema de base de datos** (Drizzle usa `db:push`, no hay migraciones):

   ```bash
   docker compose -f docker-compose.production.yml exec api pnpm --filter @spine/api db:push
   ```

   Repite este paso manualmente cuando `apps/api/src/db/schema.ts` cambie —
   deliberadamente NO está automatizado en el deploy para evitar aplicar
   cambios de esquema sin revisión en cada push.

6. **Secrets en GitHub** (repo → Settings → Secrets and variables → Actions):
   - `VPS_HOST`, `VPS_USER` (`max`), `VPS_SSH_KEY` (clave privada
     `spine_deploy`, la que autoriza `git pull` — no confundir con una clave
     de acceso interactivo al servidor).

7. **Cron de backups** (usuario `max`, no root, log dentro del repo):

   ```bash
   crontab -e
   # Añade:
   0 4 * * * /bin/bash $HOME/spine/deploy/docker/backup.sh >> $HOME/spine/deploy/docker/backup.log 2>&1
   ```

## Auto-deploy

Cada push a `main` que toque `apps/api`, `apps/web`, `apps/mobile`,
`packages/shared` o los ficheros de Docker: corre tests → build y push de
imágenes a GHCR → SSH al VPS y ejecuta `deploy/docker/deploy.sh`
(`git pull` + `docker compose pull` + `up -d` + healthcheck contra ambos
subdominios).

## Mantenimiento

- Logs: `docker compose -f docker-compose.production.yml logs -f api web`
- Redeploy manual: `bash ~/spine/deploy/docker/deploy.sh`
- Backups: `ls ~/spine/deploy/docker/backups/`
