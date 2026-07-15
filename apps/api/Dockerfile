# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json

# El "..." arrastra las dependencias de los workspaces de los que @spine/api
# depende (packages/shared) sin instalar los pesados de apps/web/apps/mobile.
RUN pnpm install --filter=@spine/api... --frozen-lockfile

FROM node:22-alpine AS runtime
WORKDIR /repo
RUN apk add --no-cache curl && corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

ENV NODE_ENV=production
EXPOSE 3123
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3123/v1/health || exit 1

CMD ["pnpm", "--filter", "@spine/api", "start"]
