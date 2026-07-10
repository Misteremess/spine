import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";
import { parseGoodreadsCsv, type GoodreadsRow } from "../services/goodreads";
import { findInCatalog, upsertCatalog } from "../services/resolver";
import { coverByIsbn } from "../services/sources";

const BodySchema = z.object({ csv: z.string().min(1) });

const MAX_ROWS = 2000;
const BATCH = 8;

export function importRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /**
   * Import del export CSV de Goodreads (plan §5). Las ediciones nuevas se
   * crean con los metadatos del propio CSV (título, autores, editorial,
   * páginas) — sin tocar OL/GB salvo una comprobación rápida de portada
   * por ISBN. La cascada completa ya enriquecerá el catálogo con el uso.
   */
  app.post(
    "/v1/import/goodreads",
    { bodyLimit: 10 * 1024 * 1024 },
    async (req, reply) => {
      const body = BodySchema.parse(req.body);
      const rows = parseGoodreadsCsv(body.csv);
      if (rows.length === 0) {
        return reply.code(400).send({
          error: "empty_csv",
          message: "No parece un export de Goodreads (falta la columna Title)",
        });
      }
      if (rows.length > MAX_ROWS) {
        return reply.code(400).send({ error: "too_many_rows", max: MAX_ROWS });
      }

      // Lo que ya tienes, para saltar duplicados.
      const owned = await db
        .select({
          editionIsbn: schema.editions.isbn13,
          customIsbn13: schema.userBooks.customIsbn13,
          customTitle: schema.userBooks.customTitle,
        })
        .from(schema.userBooks)
        .leftJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
        .where(eq(schema.userBooks.userId, req.user.id));
      const ownedIsbns = new Set(
        owned.flatMap((o) => [o.editionIsbn, o.customIsbn13].filter(Boolean) as string[])
      );
      const ownedTitles = new Set(
        owned.map((o) => o.customTitle?.toLowerCase()).filter(Boolean) as string[]
      );

      let imported = 0;
      let skipped = 0;
      let failed = 0;

      async function importRow(row: GoodreadsRow): Promise<void> {
        // Duplicados: contra la biblioteca y contra el propio CSV.
        if (row.isbn13) {
          if (ownedIsbns.has(row.isbn13)) {
            skipped++;
            return;
          }
          ownedIsbns.add(row.isbn13);
        } else {
          const key = row.title.toLowerCase();
          if (ownedTitles.has(key)) {
            skipped++;
            return;
          }
          ownedTitles.add(key);
        }

        let editionId: number | null = null;
        if (row.isbn13) {
          const cached = await findInCatalog(row.isbn13);
          if (!cached) {
            await upsertCatalog(
              {
                isbn13: row.isbn13,
                title: row.title,
                subtitle: null,
                authors: row.authors,
                publisher: row.publisher,
                language: null,
                pages: row.pages,
                publishedDate: row.publishedDate,
                coverUrl: await coverByIsbn(row.isbn13),
                description: null,
              },
              { title: "goodreads", coverUrl: "openlibrary-covers" }
            );
          }
          const [ed] = await db
            .select({ id: schema.editions.id })
            .from(schema.editions)
            .where(eq(schema.editions.isbn13, row.isbn13))
            .limit(1);
          editionId = ed?.id ?? null;
        }

        const [book] = await db
          .insert(schema.userBooks)
          .values({
            userId: req.user.id,
            editionId,
            customTitle: editionId ? null : row.title,
            customAuthors: editionId || !row.authors.length ? null : row.authors.join(", "),
            rating: row.rating,
            notes: row.notes,
          })
          .returning({ id: schema.userBooks.id });
        if (!book) throw new Error("insert userBook");

        await db.insert(schema.readings).values({
          userBookId: book.id,
          status: row.status,
          finishedAt: row.status === "finished" ? row.finishedAt : null,
        });
        imported++;
      }

      for (let i = 0; i < rows.length; i += BATCH) {
        await Promise.all(
          rows.slice(i, i + BATCH).map((row) =>
            importRow(row).catch((err) => {
              failed++;
              req.log.warn({ err, title: row.title }, "fila de import fallida");
            })
          )
        );
      }

      return { imported, skipped, failed, total: rows.length };
    }
  );
}
