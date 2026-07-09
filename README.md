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

## Stack previsto

TypeScript end-to-end: Expo/React Native (móvil) · Next.js (web) · Fastify +
Drizzle + PostgreSQL (backend) · infraestructura self-host. Detalle y
justificación de cada decisión en el plan (§11).

## Configuración local

Las herramientas que consultan Google Books necesitan una API key gratuita
(Books API) en un fichero `.env` (ver `tools/fase0-isbn-test/README.md`).
Los ficheros `.env` están excluidos del repositorio.
