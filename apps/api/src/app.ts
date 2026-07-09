import { toIsbn13 } from "@spine/shared";
import Fastify from "fastify";
import { ZodError } from "zod";
import { auth } from "./auth";
import { libraryRoutes } from "./routes/library";
import { wishlistRoutes } from "./routes/wishlist";
import { resolveIsbn } from "./services/resolver";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.setErrorHandler((err: unknown, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "validation", issues: err.issues });
    }
    app.log.error(err);
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    return reply.code(status).send({ error: "internal" });
  });

  app.get("/v1/health", async () => ({ ok: true }));

  // --- Better Auth: /api/auth/* (sign-up, sign-in, session, sign-out…) ---
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
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

  // --- Catálogo (público de momento; rate limiting antes de exponerlo) ---
  app.get<{ Params: { isbn: string } }>("/v1/isbn/:isbn", async (req, reply) => {
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

  return app;
}
