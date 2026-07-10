/**
 * Detalle de saga (plan §5.5 al completo): la rejilla de tomos 1..N con
 * tenidos/huecos, la ficha enriquecida y el radar de novedades bajo demanda.
 */
import { and, asc, desc, eq } from "drizzle-orm";
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
    missing,
    upcoming,
  };
}

export function seriesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

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
