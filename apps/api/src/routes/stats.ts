import { desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";

/** yyyy-mm-dd en hora local del servidor. */
function isoDay(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function statsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /**
   * Estadísticas del plan §5.7: posesión vs lectura (tsundoku), ritmo,
   * racha, valor de colección y series. La biblioteca personal es pequeña
   * (cientos de filas): se agrega en JS con pocas consultas.
   */
  app.get("/v1/stats", async (req) => {
    const books = await db
      .select({
        id: schema.userBooks.id,
        editionId: schema.userBooks.editionId,
        purchasePriceCents: schema.userBooks.purchasePriceCents,
        pages: schema.editions.pages,
        workId: schema.editions.workId,
      })
      .from(schema.userBooks)
      .leftJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
      .where(eq(schema.userBooks.userId, req.user.id));

    const ids = books.map((b) => b.id);
    const pagesByBook = new Map(books.map((b) => [b.id, b.pages ?? 0]));

    const readings = ids.length
      ? await db
          .select()
          .from(schema.readings)
          .where(inArray(schema.readings.userBookId, ids))
          .orderBy(desc(schema.readings.id))
      : [];

    // --- Estado actual (última lectura por ejemplar) ---
    const latest = new Map<number, (typeof readings)[number]>();
    for (const r of readings) if (!latest.has(r.userBookId)) latest.set(r.userBookId, r);
    const byStatus: Record<string, number> = {};
    for (const b of books) {
      const st = latest.get(b.id)?.status ?? "pending";
      byStatus[st] = (byStatus[st] ?? 0) + 1;
    }
    const finishedBooks = byStatus.finished ?? 0;

    // --- Terminados por mes (últimos 12) y totales del año ---
    const now = new Date();
    const year = String(now.getFullYear());
    const months: { month: string; finished: number; pages: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: isoDay(d).slice(0, 7), finished: 0, pages: 0 });
    }
    const monthIndex = new Map(months.map((m, i) => [m.month, i]));
    let finishedThisYear = 0;
    let pagesThisYear = 0;
    for (const r of readings) {
      if (r.status !== "finished" || !r.finishedAt) continue;
      const pages = pagesByBook.get(r.userBookId) ?? 0;
      const idx = monthIndex.get(r.finishedAt.slice(0, 7));
      if (idx !== undefined) {
        months[idx]!.finished++;
        months[idx]!.pages += pages;
      }
      if (r.finishedAt.startsWith(year)) {
        finishedThisYear++;
        pagesThisYear += pages;
      }
    }

    // --- Racha: días consecutivos con progreso registrado ---
    const readingIds = readings.map((r) => r.id);
    const entries = readingIds.length
      ? await db
          .select({ createdAt: schema.progressEntries.createdAt })
          .from(schema.progressEntries)
          .where(inArray(schema.progressEntries.readingId, readingIds))
      : [];
    const days = new Set(entries.map((e) => isoDay(e.createdAt)));
    let streak = 0;
    // La racha sigue viva si hoy aún no has leído pero ayer sí.
    const cursor = new Date();
    if (!days.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(isoDay(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // --- Colección ---
    const valueCents = books.reduce((acc, b) => acc + (b.purchasePriceCents ?? 0), 0);

    // --- Series: completas vs en curso ---
    const workIds = [...new Set(books.map((b) => b.workId).filter((id): id is number => id != null))];
    const seriesRows = workIds.length
      ? await db
          .select({
            workId: schema.works.id,
            seriesId: schema.works.seriesId,
            totalVolumes: schema.series.totalVolumes,
            volume: schema.works.seriesPosition,
          })
          .from(schema.works)
          .innerJoin(schema.series, eq(schema.works.seriesId, schema.series.id))
          .where(inArray(schema.works.id, workIds))
      : [];
    const bySeries = new Map<number, { total: number | null; owned: Set<number> }>();
    for (const s of seriesRows) {
      if (s.seriesId === null) continue;
      const g = bySeries.get(s.seriesId) ?? { total: s.totalVolumes, owned: new Set<number>() };
      if (s.volume !== null) g.owned.add(s.volume);
      bySeries.set(s.seriesId, g);
    }
    let seriesComplete = 0;
    for (const g of bySeries.values()) {
      if (g.total !== null && g.owned.size >= g.total) seriesComplete++;
    }

    // --- Top autores por libros en la biblioteca ---
    const authorRows = workIds.length
      ? await db
          .select({ workId: schema.workAuthors.workId, name: schema.authors.name })
          .from(schema.workAuthors)
          .innerJoin(schema.authors, eq(schema.workAuthors.authorId, schema.authors.id))
          .where(inArray(schema.workAuthors.workId, workIds))
      : [];
    const authorByWork = new Map<number, string[]>();
    for (const a of authorRows) {
      authorByWork.set(a.workId, [...(authorByWork.get(a.workId) ?? []), a.name]);
    }
    const authorCount = new Map<string, number>();
    for (const b of books) {
      for (const name of b.workId ? (authorByWork.get(b.workId) ?? []) : []) {
        authorCount.set(name, (authorCount.get(name) ?? 0) + 1);
      }
    }
    const topAuthors = [...authorCount.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      library: {
        total: books.length,
        byStatus,
        /** % de lo que tienes que ya has leído (anti-tsundoku). */
        readPct: books.length ? Math.round((finishedBooks / books.length) * 100) : 0,
      },
      thisYear: { finished: finishedThisYear, pages: pagesThisYear },
      months,
      streakDays: streak,
      collection: {
        valueCents,
        series: bySeries.size,
        seriesComplete,
      },
      topAuthors,
    };
  });
}
