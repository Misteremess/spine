import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { toIsbn13 } from "@spine/shared";
import Fastify from "fastify";
import { ZodError } from "zod";
import { auth } from "./auth";
import { env } from "./env";
import { collectionsRoutes } from "./routes/collections";
import { importRoutes } from "./routes/import";
import { libraryRoutes } from "./routes/library";
import { statsRoutes } from "./routes/stats";
import { wishlistRoutes } from "./routes/wishlist";
import { resolveIsbn } from "./services/resolver";

export async function buildApp() {
  const app = Fastify({ logger: true });

  // El frontend web vive en otro origen; cookies de sesión via CORS.
  await app.register(cors, {
    origin: [env.WEB_ORIGIN],
    credentials: true,
  });

  // Límite global por IP; protege sobre todo la cuota gratuita de Google
  // Books detrás del resolver. En memoria: suficiente con un solo proceso.
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      error: "rate_limited",
      message: `Demasiadas peticiones. Vuelve a intentarlo en ${ctx.after}.`,
    }),
  });

  app.setErrorHandler((err: unknown, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation", issues: err.issues });
    }
    const e = err as { statusCode?: number; error?: string; message?: string };
    const status = e.statusCode ?? 500;
    // Los 4xx (rate limit, payload demasiado grande…) viajan con su mensaje;
    // solo los 5xx se ocultan tras "internal".
    if (status < 500) {
      return reply.code(status).send({ error: e.error ?? "request_error", message: e.message });
    }
    app.log.error(err);
    return reply.code(status).send({ error: "internal" });
  });

  app.get("/v1/health", async () => ({ ok: true }));

  // --- Better Auth: /api/auth/* (sign-up, sign-in, session, sign-out…) ---
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    // Frena fuerza bruta en credenciales. getSession queda dentro del
    // límite: la app móvil lo llama pocas veces por sesión.
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    async handler(request, reply) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) headers.append(key, Array.isArray(value) ? value.join(", ") : value.toString());
      }
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      const response = await auth.handler(req);
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    },
  });

  // --- Catálogo. 60/min permite el escaneo en ráfaga sin abrir la puerta
  // a que alguien vacíe la cuota de las fuentes externas. ---
  app.get<{ Params: { isbn: string } }>("/v1/isbn/:isbn", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const isbn13 = toIsbn13(req.params.isbn);
    if (!isbn13) {
      return reply.code(400).send({ error: "invalid_isbn", message: "No es un ISBN-10/13 válido" });
    }
    const result = await resolveIsbn(isbn13);
    if (!result) {
      return reply.code(404).send({
        error: "not_found",
        message: "Ninguna fuente conoce este ISBN todavía",
        isbn13,
      });
    }
    return result;
  });

  // --- Plano usuario (requiere sesión) ---
  app.register(async (scope) => libraryRoutes(scope));
  app.register(async (scope) => wishlistRoutes(scope));
  app.register(async (scope) => collectionsRoutes(scope));
  app.register(async (scope) => statsRoutes(scope));
  app.register(async (scope) => importRoutes(scope));

  return app;
}
