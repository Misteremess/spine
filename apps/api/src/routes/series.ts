/**
 * Detalle de saga (plan §5.5 al completo): la rejilla de tomos 1..N con
 * tenidos/huecos, la ficha enriquecida y el radar de novedades bajo demanda.
 */
import { and, asc, desc, eq, ilike, inArray, isNotNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";
import { refreshSeries } from "../services/series-info";

async function seriesDetail(seriesId: number, userId: string) {
  const [ser] = await db
    .select()
    .from(schema.series)
    .where(eq(schema.series.id, seriesId))
    .limit(1);
  if (!ser) return null;

  // Tus tomos de esta serie.
  const owned = await db
    .select({
      userBookId: schema.userBooks.id,
      editionId: schema.editions.id,
      title: schema.editions.title,
      coverUrl: schema.editions.coverUrl,
      volume: schema.editions.volumeNumber,
      seriesPosition: schema.works.seriesPosition,
    })
    .from(schema.userBooks)
    .innerJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
    .innerJoin(schema.works, eq(schema.editions.workId, schema.works.id))
    .where(and(eq(schema.userBooks.userId, userId), eq(schema.works.seriesId, seriesId)));

  // Estado de lectura de tus tomos: el progreso triple del prototipo
  // (tengo / leídos / publicados) necesita saber cuáles terminaste.
  const readingRows = owned.length
    ? await db
        .select({ userBookId: schema.readings.userBookId, status: schema.readings.status })
        .from(schema.readings)
        .where(inArray(schema.readings.userBookId, owned.map((b) => b.userBookId)))
        .orderBy(desc(schema.readings.id))
    : [];
  const readingByBook = new Map<number, string>();
  for (const r of readingRows) {
    if (!readingByBook.has(r.userBookId)) readingByBook.set(r.userBookId, r.status);
  }

  // Tomos que el radar conoce (título, fecha, ISBN → añadir a wishlist).
  const releases = await db
    .select()
    .from(schema.seriesReleases)
    .where(eq(schema.seriesReleases.seriesId, seriesId))
    .orderBy(asc(schema.seriesReleases.volumeNumber));

  const ownedByVolume = new Map<number, (typeof owned)[number]>();
  for (const b of owned) {
    const v = b.volume ?? b.seriesPosition;
    if (v !== null && !ownedByVolume.has(v)) ownedByVolume.set(v, b);
  }
  const releaseByVolume = new Map(releases.map((r) => [r.volumeNumber, r]));

  const maxOwned = ownedByVolume.size ? Math.max(...ownedByVolume.keys()) : 0;
  const maxKnown = Math.max(
    ser.totalVolumes ?? 0,
    ser.latestVolume ?? 0,
    maxOwned,
    releases.at(-1)?.volumeNumber ?? 0
  );

  const today = new Date().toISOString().slice(0, 10);
  const volumes = [];
  for (let n = 1; n <= maxKnown; n++) {
    const mine = ownedByVolume.get(n);
    const rel = releaseByVolume.get(n);
    const upcoming = !!rel?.publishedDate && rel.publishedDate.slice(0, 10) > today;
    volumes.push({
      volume: n,
      owned: !!mine,
      read: mine ? readingByBook.get(mine.userBookId) === "finished" : false,
      userBookId: mine?.userBookId ?? null,
      editionId: mine?.editionId ?? null,
      title: mine?.title ?? rel?.title ?? null,
      coverUrl: mine?.coverUrl ?? rel?.coverUrl ?? null,
      isbn13: mine ? null : (rel?.isbn13 ?? null),
      publishedDate: rel?.publishedDate ?? null,
      upcoming,
    });
  }
  // Tomos tuyos sin número conocido: fuera de la rejilla pero visibles.
  const unnumbered = owned
    .filter((b) => (b.volume ?? b.seriesPosition) === null)
    .map((b) => ({ userBookId: b.userBookId, title: b.title, coverUrl: b.coverUrl }));

  const missing = volumes.filter((v) => !v.owned && !v.upcoming).map((v) => v.volume);
  const upcoming = volumes
    .filter((v) => v.upcoming)
    .map((v) => ({
      volume: v.volume,
      title: v.title,
      publishedDate: v.publishedDate,
      isbn13: v.isbn13,
      coverUrl: v.coverUrl,
    }));

  const readCount = volumes.filter((v) => v.read).length;

  // Reseñas de la SAGA: las que valoran la serie entera (seriesId) más las
  // de cualquier obra que pertenezca a ella. `mine` es TU reseña de la saga.
  const seriesReviewRows = await db
    .select({
      id: schema.reviews.id,
      rating: schema.reviews.rating,
      text: schema.reviews.text,
      spoilers: schema.reviews.spoilers,
      createdAt: schema.reviews.createdAt,
      userId: schema.reviews.userId,
      userName: schema.user.name,
    })
    .from(schema.reviews)
    .innerJoin(schema.user, eq(schema.reviews.userId, schema.user.id))
    .where(eq(schema.reviews.seriesId, seriesId))
    .orderBy(desc(schema.reviews.updatedAt))
    .limit(50);

  const workReviewRows = await db
    .select({
      id: schema.reviews.id,
      rating: schema.reviews.rating,
      text: schema.reviews.text,
      spoilers: schema.reviews.spoilers,
      createdAt: schema.reviews.createdAt,
      userId: schema.reviews.userId,
      userName: schema.user.name,
      workTitle: schema.works.title,
    })
    .from(schema.reviews)
    .innerJoin(schema.works, eq(schema.reviews.workId, schema.works.id))
    .innerJoin(schema.user, eq(schema.reviews.userId, schema.user.id))
    .where(eq(schema.works.seriesId, seriesId))
    .orderBy(desc(schema.reviews.updatedAt))
    .limit(50);

  const reviewRows = [
    ...seriesReviewRows.map((r) => ({ ...r, workTitle: null as string | null })),
    ...workReviewRows,
  ];
  const reviewCount = reviewRows.length;
  const average =
    reviewCount > 0
      ? Math.round((reviewRows.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : null;
  const mineRow = seriesReviewRows.find((r) => r.userId === userId) ?? null;

  return {
    series: {
      id: ser.id,
      name: ser.name,
      type: ser.type,
      status: ser.status,
      totalVolumes: ser.totalVolumes,
      latestVolume: ser.latestVolume,
      latestVolumeDate: ser.latestVolumeDate,
      coverUrl: ser.coverUrl,
      description: ser.description,
      checkedAt: ser.checkedAt,
    },
    volumes,
    unnumbered,
    ownedCount: ownedByVolume.size + unnumbered.length,
    readCount,
    missing,
    upcoming,
    reviews: {
      average,
      count: reviewCount,
      items: reviewRows.slice(0, 20).map(({ userId: reviewerId, ...r }) => ({
        ...r,
        own: reviewerId === userId,
      })),
      mine: mineRow ? { rating: mineRow.rating, text: mineRow.text, spoilers: mineRow.spoilers } : null,
    },
  };
}

export function seriesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /**
   * Buscar sagas para reasignar un tomo (plan §5.5): sin `q` devuelve las
   * sagas que ya tienes; con `q` busca por nombre en todo el catálogo. Las
   * tuyas salen primero. Resuelve el "este tomo está en la saga equivocada".
   */
  app.get<{ Querystring: { q?: string } }>("/v1/series", async (req) => {
    const q = (req.query.q ?? "").trim();

    // IDs de sagas donde ya tienes algún tomo.
    const ownRows = await db
      .selectDistinct({ seriesId: schema.works.seriesId })
      .from(schema.userBooks)
      .innerJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
      .innerJoin(schema.works, eq(schema.editions.workId, schema.works.id))
      .where(and(eq(schema.userBooks.userId, req.user.id), isNotNull(schema.works.seriesId)));
    const ownIds = new Set(ownRows.map((r) => r.seriesId).filter((id): id is number => id != null));

    let rows: { id: number; name: string; totalVolumes: number | null }[];
    if (q) {
      rows = await db
        .select({ id: schema.series.id, name: schema.series.name, totalVolumes: schema.series.totalVolumes })
        .from(schema.series)
        .where(ilike(schema.series.name, `%${q}%`))
        .orderBy(asc(schema.series.name))
        .limit(30);
    } else if (ownIds.size) {
      rows = await db
        .select({ id: schema.series.id, name: schema.series.name, totalVolumes: schema.series.totalVolumes })
        .from(schema.series)
        .where(inArray(schema.series.id, [...ownIds]))
        .orderBy(asc(schema.series.name));
    } else {
      rows = [];
    }

    return {
      items: rows
        .map((r) => ({ ...r, owned: ownIds.has(r.id) }))
        .sort((a, b) => Number(b.owned) - Number(a.owned) || a.name.localeCompare(b.name)),
    };
  });

  app.get<{ Params: { id: string } }>("/v1/series/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "invalid_id" });
    const detail = await seriesDetail(id, req.user.id);
    if (!detail) return reply.code(404).send({ error: "not_found" });
    return detail;
  });

  /**
   * Refresco manual del radar ("comprobar novedades ahora"). Si la ficha
   * se comprobó hace <1 h no repite las llamadas externas.
   */
  app.post<{ Params: { id: string } }>("/v1/series/:id/refresh", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "invalid_id" });
    const [ser] = await db.select().from(schema.series).where(eq(schema.series.id, id)).limit(1);
    if (!ser) return reply.code(404).send({ error: "not_found" });

    const fresh = ser.checkedAt && Date.now() - ser.checkedAt.getTime() < 60 * 60 * 1000;
    if (!fresh) await refreshSeries(id);
    const detail = await seriesDetail(id, req.user.id);
    return { ...detail, refreshed: !fresh };
  });
}

export function notificationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.get("/v1/notifications", async (req) => {
    const rows = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, req.user.id))
      .orderBy(desc(schema.notifications.id))
      .limit(50);
    const unread = rows.filter((n) => !n.readAt).length;
    return { notifications: rows, unreadCount: unread };
  });

  app.post<{ Params: { id: string } }>("/v1/notifications/:id/read", async (req, reply) => {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(schema.notifications)
      .set({ readAt: new Date() })
      .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, req.user.id)))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { notification: updated };
  });

  app.post("/v1/notifications/read-all", async (req) => {
    await db
      .update(schema.notifications)
      .set({ readAt: new Date() })
      .where(eq(schema.notifications.userId, req.user.id));
    return { ok: true };
  });
}
