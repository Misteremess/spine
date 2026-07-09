import { toIsbn13 } from "@spine/shared";
import Fastify from "fastify";
import { resolveIsbn } from "./services/resolver.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/v1/health", async () => ({ ok: true }));

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

  return app;
}
