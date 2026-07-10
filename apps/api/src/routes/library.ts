import { toIsbn13 } from "@spine/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";
import { resolveIsbn } from "../services/resolver";

const AddByIsbnSchema = z.object({
  isbn: z.string().min(10).max(17),
  /** true = añadir aunque ya tengas este ISBN (segundo ejemplar). */
  force: z.boolean().default(false),
});

const AddManualSchema = z.object({
  title: z.string().min(1).max(500),
  authors: z.string().max(500).optional(),
  /** ISBN que la cascada no encontró: se conserva para reintentos futuros. */
  isbn: z.string().min(10).max(17).optional(),
  format: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  purchaseDate: z.string().max(10).optional(),
  purchasePriceCents: z.number().int().nonnegative().optional(),
});

const PatchSchema = z
  .object({
    format: z.string().max(50).nullable(),
    purchaseDate: z.string().max(10).nullable(),
    purchasePriceCents: z.number().int().nonnegative().nullable(),
    condition: z.string().max(100).nullable(),
    location: z.string().max(200).nullable(),
    favorite: z.boolean(),
    rating: z.number().int().min(1).max(10).nullable(),
    notes: z.string().max(5000).nullable(),
  })
  .partial();

const StatusSchema = z.object({
  status: z.enum(["pending", "reading", "paused", "finished", "abandoned"]),
  rating: z.number().int().min(1).max(10).optional(),
  finishedAt: z.string().max(10).optional(),
});

const ProgressSchema = z.object({
  page: z.number().int().positive().optional(),
  percent: z.number().int().min(0).max(100).optional(),
  note: z.string().max(2000).optional(),
});

const today = () => new Date().toISOString().slice(0, 10);

async function ownedBook(userId: string, id: number) {
  const rows = await db
    .select()
    .from(schema.userBooks)
    .where(and(eq(schema.userBooks.id, id), eq(schema.userBooks.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function latestReading(userBookId: number) {
  const rows = await db
    .select()
    .from(schema.readings)
    .where(eq(schema.readings.userBookId, userBookId))
    .orderBy(desc(schema.readings.id))
    .limit(1);
  return rows[0] ?? null;
}

export function libraryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /** Añadir por ISBN (escáner o búsqueda): resuelve, detecta duplicados, crea ejemplar. */
  app.post("/v1/library", async (req, reply) => {
    const body = AddByIsbnSchema.parse(req.body);
    const isbn13 = toIsbn13(body.isbn);
    if (!isbn13) return reply.code(400).send({ error: "invalid_isbn" });

    const resolved = await resolveIsbn(isbn13);
    if (!resolved) {
      // El plan §8: un fallo no bloquea — el cliente ofrece crear manual con el ISBN precargado.
      return reply.code(404).send({ error: "not_found", isbn13 });
    }

    const [edition] = await db
      .select({ id: schema.editions.id })
      .from(schema.editions)
      .where(eq(schema.editions.isbn13, isbn13))
      .limit(1);
    if (!edition) return reply.code(500).send({ error: "catalog_inconsistent" });

    if (!body.force) {
      const dup = await db
        .select({ id: schema.userBooks.id })
        .from(schema.userBooks)
        .where(
          and(eq(schema.userBooks.userId, req.user.id), eq(schema.userBooks.editionId, edition.id))
        )
        .limit(1);
      if (dup[0]) {
        return reply.code(409).send({
          error: "duplicate",
          message: "Ya tienes este ISBN. Repite con force=true si es otro ejemplar.",
          userBookId: dup[0].id,
          metadata: resolved.metadata,
        });
      }
    }

    const [book] = await db
      .insert(schema.userBooks)
      .values({ userId: req.user.id, editionId: edition.id })
      .returning();
    if (!book) return reply.code(500).send({ error: "insert_failed" });
    await db.insert(schema.readings).values({ userBookId: book.id });

    return reply.code(201).send({ userBook: book, metadata: resolved.metadata, source: resolved.source });
  });

  /** Alta manual (cuando el escáner no encuentra el ISBN o no hay código). */
  app.post("/v1/library/manual", async (req, reply) => {
    const body = AddManualSchema.parse(req.body);
    const [book] = await db
      .insert(schema.userBooks)
      .values({
        userId: req.user.id,
        customTitle: body.title,
        customAuthors: body.authors ?? null,
        customIsbn13: body.isbn ? toIsbn13(body.isbn) : null,
        format: body.format ?? null,
        location: body.location ?? null,
        purchaseDate: body.purchaseDate ?? null,
        purchasePriceCents: body.purchasePriceCents ?? null,
      })
      .returning();
    if (!book) return reply.code(500).send({ error: "insert_failed" });
    await db.insert(schema.readings).values({ userBookId: book.id });
    return reply.code(201).send({ userBook: book });
  });

  /** Biblioteca completa con metadatos y último estado de lectura. */
  app.get("/v1/library", async (req) => {
    const books = await db
      .select({
        userBook: schema.userBooks,
        edition: {
          isbn13: schema.editions.isbn13,
          title: schema.editions.title,
          coverUrl: schema.editions.coverUrl,
          pages: schema.editions.pages,
          workId: schema.editions.workId,
        },
      })
      .from(schema.userBooks)
      .leftJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
      .where(eq(schema.userBooks.userId, req.user.id))
      .orderBy(desc(schema.userBooks.createdAt));

    const workIds = [...new Set(books.map((b) => b.edition?.workId).filter((id): id is number => id != null))];
    const authorRows = workIds.length
      ? await db
          .select({ workId: schema.workAuthors.workId, name: schema.authors.name })
          .from(schema.workAuthors)
          .innerJoin(schema.authors, eq(schema.workAuthors.authorId, schema.authors.id))
          .where(inArray(schema.workAuthors.workId, workIds))
      : [];
    const authorsByWork = new Map<number, string[]>();
    for (const a of authorRows) {
      authorsByWork.set(a.workId, [...(authorsByWork.get(a.workId) ?? []), a.name]);
    }

    const ids = books.map((b) => b.userBook.id);
    const allReadings = ids.length
      ? await db
          .select()
          .from(schema.readings)
          .where(inArray(schema.readings.userBookId, ids))
          .orderBy(desc(schema.readings.id))
      : [];
    const latest = new Map<number, (typeof allReadings)[number]>();
    for (const r of allReadings) if (!latest.has(r.userBookId)) latest.set(r.userBookId, r);

    return {
      items: books.map((b) => ({
        ...b.userBook,
        title: b.edition?.title ?? b.userBook.customTitle,
        coverUrl: b.edition?.coverUrl ?? null,
        isbn13: b.edition?.isbn13 ?? null,
        pages: b.edition?.pages ?? null,
        authors: b.edition?.workId
          ? (authorsByWork.get(b.edition.workId) ?? [])
          : b.userBook.customAuthors
            ? [b.userBook.customAuthors]
            : [],
        reading: latest.get(b.userBook.id) ?? null,
      })),
    };
  });

  /** Ficha completa: ejemplar + metadatos de la edición + lectura y último progreso. */
  app.get<{ Params: { id: string } }>("/v1/library/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const book = await ownedBook(req.user.id, id);
    if (!book) return reply.code(404).send({ error: "not_found" });

    let edition = null;
    if (book.editionId) {
      const rows = await db
        .select({
          isbn13: schema.editions.isbn13,
          title: schema.editions.title,
          subtitle: schema.editions.subtitle,
          pages: schema.editions.pages,
          publishedDate: schema.editions.publishedDate,
          coverUrl: schema.editions.coverUrl,
          workId: schema.editions.workId,
          publisher: schema.publishers.name,
          description: schema.works.description,
          volumeNumber: schema.editions.volumeNumber,
          seriesPosition: schema.works.seriesPosition,
          seriesName: schema.series.name,
          seriesId: schema.series.id,
        })
        .from(schema.editions)
        .leftJoin(schema.publishers, eq(schema.editions.publisherId, schema.publishers.id))
        .innerJoin(schema.works, eq(schema.editions.workId, schema.works.id))
        .leftJoin(schema.series, eq(schema.works.seriesId, schema.series.id))
        .where(eq(schema.editions.id, book.editionId))
        .limit(1);
      const ed = rows[0];
      if (ed) {
        const authorRows = await db
          .select({ name: schema.authors.name })
          .from(schema.workAuthors)
          .innerJoin(schema.authors, eq(schema.workAuthors.authorId, schema.authors.id))
          .where(eq(schema.workAuthors.workId, ed.workId));
        const { seriesPosition, seriesName, volumeNumber, ...rest } = ed;
        edition = {
          ...rest,
          authors: authorRows.map((a) => a.name),
          series: seriesName,
          seriesVolume: volumeNumber ?? seriesPosition,
        };
      }
    }

    const reading = await latestReading(id);
    const lastProgress = reading
      ? ((await db
          .select()
          .from(schema.progressEntries)
          .where(eq(schema.progressEntries.readingId, reading.id))
          .orderBy(desc(schema.progressEntries.id))
          .limit(1))[0] ?? null)
      : null;

    return { book, edition, reading, lastProgress };
  });

  /** Editar campos del ejemplar. */
  app.patch<{ Params: { id: string } }>("/v1/library/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const patch = PatchSchema.parse(req.body);
    const book = await ownedBook(req.user.id, id);
    if (!book) return reply.code(404).send({ error: "not_found" });
    const [updated] = await db
      .update(schema.userBooks)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.userBooks.id, id))
      .returning();
    return { userBook: updated };
  });

  app.delete<{ Params: { id: string } }>("/v1/library/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const book = await ownedBook(req.user.id, id);
    if (!book) return reply.code(404).send({ error: "not_found" });
    await db.delete(schema.userBooks).where(eq(schema.userBooks.id, id));
    return reply.code(204).send();
  });

  /**
   * Cambiar estado de lectura. Si la última lectura estaba terminada o
   * abandonada y se vuelve a "reading", se crea una lectura nueva (relectura).
   */
  app.post<{ Params: { id: string } }>("/v1/library/:id/status", async (req, reply) => {
    const id = Number(req.params.id);
    const body = StatusSchema.parse(req.body);
    const book = await ownedBook(req.user.id, id);
    if (!book) return reply.code(404).send({ error: "not_found" });

    const current = await latestReading(id);
    const isClosed = current && ["finished", "abandoned"].includes(current.status);

    if (!current || (isClosed && body.status === "reading")) {
      const [created] = await db
        .insert(schema.readings)
        .values({
          userBookId: id,
          status: body.status,
          startedAt: body.status === "reading" ? today() : null,
        })
        .returning();
      return { reading: created, reread: Boolean(current) };
    }

    const [updated] = await db
      .update(schema.readings)
      .set({
        status: body.status,
        startedAt: current.startedAt ?? (body.status === "reading" ? today() : null),
        finishedAt:
          body.status === "finished" ? (body.finishedAt ?? today()) : current.finishedAt,
        rating: body.rating ?? current.rating,
        updatedAt: new Date(),
      })
      .where(eq(schema.readings.id, current.id))
      .returning();
    return { reading: updated, reread: false };
  });

  /** Registrar progreso (el hábito diario: dos toques). */
  app.post<{ Params: { id: string } }>("/v1/library/:id/progress", async (req, reply) => {
    const id = Number(req.params.id);
    const body = ProgressSchema.parse(req.body);
    if (body.page === undefined && body.percent === undefined) {
      return reply.code(400).send({ error: "empty_progress", message: "Indica página o porcentaje" });
    }
    const book = await ownedBook(req.user.id, id);
    if (!book) return reply.code(404).send({ error: "not_found" });

    let reading = await latestReading(id);
    if (!reading || ["finished", "abandoned"].includes(reading.status)) {
      const [created] = await db
        .insert(schema.readings)
        .values({ userBookId: id, status: "reading", startedAt: today() })
        .returning();
      reading = created!;
    } else if (reading.status !== "reading") {
      // registrar progreso promociona automáticamente a "leyendo"
      await db
        .update(schema.readings)
        .set({ status: "reading", startedAt: reading.startedAt ?? today(), updatedAt: new Date() })
        .where(eq(schema.readings.id, reading.id));
    }

    const [entry] = await db
      .insert(schema.progressEntries)
      .values({
        readingId: reading.id,
        page: body.page ?? null,
        percent: body.percent ?? null,
        note: body.note ?? null,
      })
      .returning();
    return reply.code(201).send({ progress: entry });
  });
}
