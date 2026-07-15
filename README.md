# Spine

**Tu biblioteca, bajo control. Tu lectura, con memoria.**

Spine es una plataforma multiplataforma (Android, iOS y web) para registrar,
organizar y entender tu biblioteca personal: libros, mangas, cómics, sagas y
colecciones por tomos. Un CRM personal para lectores y coleccionistas.

## Estado

🚧 **Fase 0 — Definición y validación** (julio 2026)

- ✅ Plan estratégico de producto completo
- ✅ Validación técnica de la cascada de resolución ISBN (Open Library → Google Books)
- ⬜ Prototipo UX/UI
- ⬜ MVP

## Estructura del repositorio

| Ruta | Contenido |
|---|---|
| [`docs/PLAN-PRODUCTO.md`](docs/PLAN-PRODUCTO.md) | Plan estratégico completo: visión, benchmark, funcionalidades, MVP, arquitectura, stack, modelo de datos, roadmap |
| [`tools/fase0-isbn-test/`](tools/fase0-isbn-test/) | Prueba de validación de la cascada ISBN con ediciones españolas reales |
| [`design/prototipo.html`](design/prototipo.html) | Prototipo UX/UI de las 8 pantallas clave del MVP (modos Noche y Papel) |
| [`landing/`](landing/) | Landing de captura para la beta ([misteremess.github.io/spine](https://misteremess.github.io/spine/)), desplegada vía GitHub Pages |
| [`deploy/docker/README.md`](deploy/docker/README.md) | Despliegue en producción (Docker + Traefik + auto-deploy vía GitHub Actions) |

## Stack previsto

TypeScript end-to-end: Expo/React Native (móvil) · Next.js (web) · Fastify +
Drizzle + PostgreSQL (backend) · infraestructura self-host. Detalle y
justificación de cada decisión en el plan (§11).

## Desarrollo

Requisitos: Node ≥22, pnpm, PostgreSQL local.

```bash
pnpm install
createdb spine_dev
cp apps/api/.env.example apps/api/.env   # y rellena GOOGLE_BOOKS_API_KEY
pnpm --filter @spine/api db:push          # crea las tablas
pnpm dev:api                              # API en http://localhost:3123
pnpm test                                 # tests de todo el monorepo
```

Prueba rápida del resolver: `curl localhost:3123/v1/isbn/9780441172719`

| Workspace | Contenido |
|---|---|
| `apps/api` | Fastify + Drizzle + PostgreSQL. Resolver ISBN (catálogo → Open Library → Google Books) y esquema Work/Edition/Series |
| `packages/shared` | Tipos y utilidades compartidas (validación ISBN, esquemas zod) |

Las API keys viven en ficheros `.env`, excluidos del repositorio.
