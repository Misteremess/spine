import { asc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";

/** Escapa un campo para CSV (comillas dobles si hay coma, comilla o salto). */
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Export y borrado de cuenta (plan §15, RGPD): los datos del usuario nunca
 * son rehenes. Export completo siempre, gratis; borrado self-service.
 */
export function accountRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /** Reúne toda la biblioteca del usuario con sus metadatos y lecturas. */
  async function fullLibrary(userId: string) {
    const books = await db
      .select({
        userBook: schema.userBooks,
        edition: {
          isbn13: schema.editions.isbn13,
          title: schema.editions.title,
          pages: schema.editions.pages,
          publishedDate: schema.editions.publishedDate,
          coverUrl: schema.editions.coverUrl,
          publisher: schema.publishers.name,
          workId: schema.editions.workId,
        },
      })
      .from(schema.userBooks)
      .leftJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
      .leftJoin(schema.publishers, eq(schema.editions.publisherId, schema.publishers.id))
      .where(eq(schema.userBooks.userId, userId));

    const ids = books.map((b) => b.userBook.id);
    const workIds = [...new Set(books.map((b) => b.edition?.workId).filter((x): x is number => x != null))];
    const authorRows = workIds.length
      ? await db
          .select({ workId: schema.workAuthors.workId, name: schema.authors.name })
          .from(schema.workAuthors)
          .innerJoin(schema.authors, eq(schema.workAuthors.authorId, schema.authors.id))
          .where(inArray(schema.workAuthors.workId, workIds))
      : [];
    const authorsByWork = new Map<number, string[]>();
    for (const a of authorRows) authorsByWork.set(a.workId, [...(authorsByWork.get(a.workId) ?? []), a.name]);

    // Orden ascendente por id: el último del array es la lectura más reciente
    // (la que usa el CSV para la columna "status").
    const readings = ids.length
      ? await db
          .select()
          .from(schema.readings)
          .where(inArray(schema.readings.userBookId, ids))
          .orderBy(asc(schema.readings.id))
      : [];
    const readingsByBook = new Map<number, typeof readings>();
    for (const r of readings) readingsByBook.set(r.userBookId, [...(readingsByBook.get(r.userBookId) ?? []), r]);

    return books.map((b) => ({
      id: b.userBook.id,
      title: b.edition?.title ?? b.userBook.customTitle,
      authors: b.edition?.workId
        ? (authorsByWork.get(b.edition.workId) ?? [])
        : b.userBook.customAuthors
          ? [b.userBook.customAuthors]
          : [],
      isbn13: b.edition?.isbn13 ?? b.userBook.customIsbn13,
      publisher: b.edition?.publisher ?? null,
      pages: b.edition?.pages ?? null,
      format: b.userBook.format,
      location: b.userBook.location,
      condition: b.userBook.condition,
      purchaseDate: b.userBook.purchaseDate,
      purchasePriceCents: b.userBook.purchasePriceCents,
      favorite: b.userBook.favorite,
      rating: b.userBook.rating,
      notes: b.userBook.notes,
      readings: (readingsByBook.get(b.userBook.id) ?? []).map((r) => ({
        status: r.status,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        rating: r.rating,
      })),
    }));
  }

  /** Export completo en JSON (plan §5.12). */
  app.get("/v1/export", async (req, reply) => {
    const library = await fullLibrary(req.user.id);
    const [wishlist, goals] = await Promise.all([
      db.select().from(schema.wishlistItems).where(eq(schema.wishlistItems.userId, req.user.id)),
      db.select().from(schema.readingGoals).where(eq(schema.readingGoals.userId, req.user.id)),
    ]);
    reply.header("Content-Disposition", `attachment; filename="spine-export-${req.user.id}.json"`);
    return {
      exportedAt: new Date().toISOString(),
      user: { id: req.user.id, email: req.user.email, name: req.user.name },
      library,
      wishlist,
      goals,
    };
  });

  /** Export de la biblioteca en CSV (compatible con hojas de cálculo). */
  app.get("/v1/export.csv", async (req, reply) => {
    const library = await fullLibrary(req.user.id);
    const cols = [
      "title",
      "authors",
      "isbn13",
      "publisher",
      "pages",
      "format",
      "location",
      "purchaseDate",
      "purchasePriceEur",
      "favorite",
      "rating",
      "status",
    ];
    const lines = [cols.join(",")];
    for (const b of library) {
      const last = b.readings[b.readings.length - 1];
      lines.push(
        [
          csvCell(b.title),
          csvCell(b.authors.join("; ")),
          csvCell(b.isbn13),
          csvCell(b.publisher),
          csvCell(b.pages),
          csvCell(b.format),
          csvCell(b.location),
          csvCell(b.purchaseDate),
          csvCell(b.purchasePriceCents != null ? (b.purchasePriceCents / 100).toFixed(2) : ""),
          csvCell(b.favorite ? "sí" : ""),
          csvCell(b.rating != null ? (b.rating / 2).toString() : ""),
          csvCell(last?.status ?? ""),
        ].join(",")
      );
    }
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="spine-biblioteca.csv"`);
    // BOM para que Excel respete los acentos.
    return "﻿" + lines.join("\n");
  });

  /**
   * Borrar la cuenta (RGPD). El FK onDelete cascade de `user` arrastra
   * sesiones, ejemplares, lecturas, notas, préstamos, etiquetas, etc.
   * El usuario debe confirmar escribiendo su email.
   */
  app.delete("/v1/account", async (req, reply) => {
    const body = (req.body ?? {}) as { confirm?: string };
    if (body.confirm !== req.user.email) {
      return reply.code(400).send({
        error: "confirm_required",
        message: "Escribe tu email para confirmar el borrado",
      });
    }
    await db.delete(schema.user).where(eq(schema.user.id, req.user.id));
    return { ok: true };
  });
}
