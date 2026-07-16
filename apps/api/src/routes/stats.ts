import { desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";

/** yyyy-mm-dd en hora local del servidor. */
function isoDay(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * yyyy-mm-dd en la zona horaria DEL USUARIO (`?tz=Europe/Madrid`). Sin esto,
 * el servidor (UTC en producción) parte el día a las 00:00 UTC: una lectura
 * a las 23:30 en España cae en el día siguiente y rompe rachas y meses.
 */
function makeDayFn(tz: string | undefined): (d: Date) => string {
  if (tz) {
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return (d) => fmt.format(d);
    } catch {
      /* tz inválida: caemos a la hora del servidor */
    }
  }
  return isoDay;
}

export function statsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /**
   * Estadísticas del plan §5.7: posesión vs lectura (tsundoku), ritmo,
   * racha, valor de colección y series. La biblioteca personal es pequeña
   * (cientos de filas): se agrega en JS con pocas consultas.
   */
  app.get<{ Querystring: { tz?: string } }>("/v1/stats", async (req) => {
    const day = makeDayFn(req.query.tz);
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
    const todayStr = day(new Date());
    const year = todayStr.slice(0, 4);
    const months: { month: string; finished: number; pages: number }[] = [];
    const [y0, m0] = [Number(todayStr.slice(0, 4)), Number(todayStr.slice(5, 7))];
    for (let i = 11; i >= 0; i--) {
      const total = y0 * 12 + (m0 - 1) - i;
      const y = Math.floor(total / 12);
      const m = (total % 12) + 1;
      months.push({ month: `${y}-${String(m).padStart(2, "0")}`, finished: 0, pages: 0 });
    }
    const monthIndex = new Map(months.map((m, i) => [m.month, i]));
    let finishedThisYear = 0;
    let pagesThisYear = 0;
    let finishedAllTime = 0;
    let pagesAllTime = 0;
    for (const r of readings) {
      if (r.status !== "finished" || !r.finishedAt) continue;
      const pages = pagesByBook.get(r.userBookId) ?? 0;
      finishedAllTime++;
      pagesAllTime += pages;
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
    const days = new Set(entries.map((e) => day(e.createdAt)));
    // Retrocede un día sobre una fecha yyyy-mm-dd sin depender de la tz del servidor.
    const prevDay = (s: string) => {
      const t = Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
      return new Date(t - 86400000).toISOString().slice(0, 10);
    };
    let streak = 0;
    // La racha sigue viva si hoy aún no has leído pero ayer sí.
    let cursor = todayStr;
    if (!days.has(cursor)) cursor = prevDay(cursor);
    while (days.has(cursor)) {
      streak++;
      cursor = prevDay(cursor);
    }

    // --- Leyendo ahora (con su último progreso) para el dashboard ---
    const readingBooks = books.filter((b) => latest.get(b.id)?.status === "reading");
    const readingLatestIds = readingBooks.map((b) => latest.get(b.id)!.id);
    const progRows = readingLatestIds.length
      ? await db
          .select({
            readingId: schema.progressEntries.readingId,
            page: schema.progressEntries.page,
            percent: schema.progressEntries.percent,
          })
          .from(schema.progressEntries)
          .where(inArray(schema.progressEntries.readingId, readingLatestIds))
          .orderBy(desc(schema.progressEntries.id))
      : [];
    const progByReading = new Map<number, { page: number | null; percent: number | null }>();
    for (const p of progRows) if (!progByReading.has(p.readingId)) progByReading.set(p.readingId, p);

    const readingIdsForTitle = readingBooks.map((b) => b.id);
    const titleRows = readingIdsForTitle.length
      ? await db
          .select({
            id: schema.userBooks.id,
            customTitle: schema.userBooks.customTitle,
            title: schema.editions.title,
            coverUrl: schema.editions.coverUrl,
          })
          .from(schema.userBooks)
          .leftJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
          .where(inArray(schema.userBooks.id, readingIdsForTitle))
      : [];
    const titleById = new Map(titleRows.map((r) => [r.id, r]));

    const readingNow = readingBooks
      .map((b) => {
        const info = titleById.get(b.id);
        const prog = progByReading.get(latest.get(b.id)!.id);
        const pages = pagesByBook.get(b.id) || null;
        const percent =
          prog?.percent ?? (prog?.page && pages ? Math.min(100, Math.round((prog.page / pages) * 100)) : null);
        return {
          id: b.id,
          title: info?.title ?? info?.customTitle ?? "Sin título",
          coverUrl: info?.coverUrl ?? null,
          page: prog?.page ?? null,
          pages,
          percent,
        };
      })
      .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));

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
      allTime: { finished: finishedAllTime, pages: pagesAllTime },
      readingNow,
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

  /**
   * Resumen anual "Wrapped" (plan §5.7 / §6): el ritual compartible de fin
   * de año. Destaca lo mejor del año lector para hacer captura y compartir.
   */
  app.get<{ Querystring: { year?: string; tz?: string } }>("/v1/wrapped", async (req) => {
    const day = makeDayFn(req.query.tz);
    const year = Number(req.query.year) || Number(day(new Date()).slice(0, 4));
    const y = String(year);

    const books = await db
      .select({
        id: schema.userBooks.id,
        rating: schema.userBooks.rating,
        createdAt: schema.userBooks.createdAt,
        pages: schema.editions.pages,
        title: schema.editions.title,
        customTitle: schema.userBooks.customTitle,
        coverUrl: schema.editions.coverUrl,
        workId: schema.editions.workId,
      })
      .from(schema.userBooks)
      .leftJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
      .where(eq(schema.userBooks.userId, req.user.id));

    const byId = new Map(books.map((b) => [b.id, b]));
    const ids = books.map((b) => b.id);
    const readings = ids.length
      ? await db.select().from(schema.readings).where(inArray(schema.readings.userBookId, ids))
      : [];

    // Lecturas terminadas ESTE año.
    const finishedThisYear = readings.filter(
      (r) => r.status === "finished" && r.finishedAt?.startsWith(y)
    );

    let pages = 0;
    const monthCount = new Array(12).fill(0);
    let longest: { title: string; pages: number } | null = null;
    let best: { title: string; rating: number; coverUrl: string | null } | null = null;
    const authorTally = new Map<string, number>();

    const workIds = [...new Set(finishedThisYear.map((r) => byId.get(r.userBookId)?.workId).filter((x): x is number => x != null))];
    const authorRows = workIds.length
      ? await db
          .select({ workId: schema.workAuthors.workId, name: schema.authors.name })
          .from(schema.workAuthors)
          .innerJoin(schema.authors, eq(schema.workAuthors.authorId, schema.authors.id))
          .where(inArray(schema.workAuthors.workId, workIds))
      : [];
    const authorsByWork = new Map<number, string[]>();
    for (const a of authorRows) authorsByWork.set(a.workId, [...(authorsByWork.get(a.workId) ?? []), a.name]);

    for (const r of finishedThisYear) {
      const b = byId.get(r.userBookId);
      if (!b) continue;
      const title = b.title ?? b.customTitle ?? "Sin título";
      pages += b.pages ?? 0;
      if (r.finishedAt) monthCount[Number(r.finishedAt.slice(5, 7)) - 1]!++;
      if (b.pages && (!longest || b.pages > longest.pages)) longest = { title, pages: b.pages };
      const rating = r.rating ?? b.rating;
      if (rating && (!best || rating > best.rating)) best = { title, rating, coverUrl: b.coverUrl };
      for (const name of b.workId ? (authorsByWork.get(b.workId) ?? []) : []) {
        authorTally.set(name, (authorTally.get(name) ?? 0) + 1);
      }
    }

    const topAuthor = [...authorTally.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const busiestIdx = monthCount.indexOf(Math.max(...monthCount));
    const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const addedThisYear = books.filter((b) => day(b.createdAt).startsWith(y)).length;

    return {
      year,
      finished: finishedThisYear.length,
      pages,
      addedThisYear,
      // Tsundoku del año: compraste X, leíste Y.
      tsundoku: { added: addedThisYear, finished: finishedThisYear.length },
      longest,
      best,
      topAuthor: topAuthor ? { name: topAuthor[0], count: topAuthor[1] } : null,
      busiestMonth:
        finishedThisYear.length > 0 && monthCount[busiestIdx]! > 0
          ? { name: MONTHS[busiestIdx], count: monthCount[busiestIdx] }
          : null,
    };
  });
}
