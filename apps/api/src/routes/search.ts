/**
 * Búsqueda de libros con datos reales (Google Books) para elegir a mano:
 * la usa la wishlist y el alta cuando el escáner no encuentra el ISBN.
 * Si el texto ES un ISBN, resuelve la ficha completa por la cascada.
 */
import { toIsbn13 } from "@spine/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser } from "../plugins/require-user";
import { resolveIsbn } from "../services/resolver";
import { searchBooks } from "../services/sources";

const QuerySchema = z.object({ q: z.string().trim().min(2).max(120) });

export function searchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.get("/v1/search", {
    config: { rateLimit: { max: 40, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_query" });
    const q = parsed.data.q;

    // Si teclearon un ISBN, resolver la ficha real y devolverla como único candidato.
    const isbn13 = toIsbn13(q.replace(/[\s-]/g, ""));
    if (isbn13) {
      const resolved = await resolveIsbn(isbn13).catch(() => null);
      if (resolved) {
        const m = resolved.metadata;
        return {
          candidates: [
            {
              isbn13: m.isbn13,
              title: m.title,
              authors: m.authors ?? [],
              publisher: m.publisher ?? null,
              publishedDate: m.publishedDate ?? null,
              pages: m.pages ?? null,
              coverUrl: m.coverUrl ?? null,
            },
          ],
        };
      }
    }

    const candidates = await searchBooks(q);
    return { candidates };
  });
}
