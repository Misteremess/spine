import { desc, eq, inArray, isNotNull, and } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";

export function collectionsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /**
   * Vista coleccionista (plan §5.5): tus libros agrupados por serie,
   * con los tomos que tienes, su estado de lectura y los huecos.
   */
  app.get("/v1/collections", async (req) => {
    const rows = await db
      .select({
        userBookId: schema.userBooks.id,
        editionId: schema.editions.id,
        title: schema.editions.title,
        coverUrl: schema.editions.coverUrl,
        volume: schema.editions.volumeNumber,
        seriesPosition: schema.works.seriesPosition,
        seriesId: schema.series.id,
        seriesName: schema.series.name,
        totalVolumes: schema.series.totalVolumes,
      })
      .from(schema.userBooks)
      .innerJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
      .innerJoin(schema.works, eq(schema.editions.workId, schema.works.id))
      .innerJoin(schema.series, eq(schema.works.seriesId, schema.series.id))
      .where(and(eq(schema.userBooks.userId, req.user.id), isNotNull(schema.works.seriesId)));

    // Último estado de lectura por ejemplar, para colorear los tomos.
    const ids = rows.map((r) => r.userBookId);
    const readings = ids.length
      ? await db
          .select()
          .from(schema.readings)
          .where(inArray(schema.readings.userBookId, ids))
          .orderBy(desc(schema.readings.id))
      : [];
    const statusByBook = new Map<number, string>();
    for (const r of readings) {
      if (!statusByBook.has(r.userBookId)) statusByBook.set(r.userBookId, r.status);
    }

    type Volume = {
      volume: number | null;
      userBookId: number;
      title: string;
      coverUrl: string | null;
      status: string;
    };
    const bySeries = new Map<
      number,
      { id: number; name: string; totalVolumes: number | null; volumes: Volume[] }
    >();

    for (const r of rows) {
      let group = bySeries.get(r.seriesId);
      if (!group) {
        group = { id: r.seriesId, name: r.seriesName, totalVolumes: r.totalVolumes, volumes: [] };
        bySeries.set(r.seriesId, group);
      }
      group.volumes.push({
        volume: r.volume ?? r.seriesPosition,
        userBookId: r.userBookId,
        title: r.title,
        coverUrl: r.coverUrl,
        status: statusByBook.get(r.userBookId) ?? "pending",
      });
    }

    const collections = [...bySeries.values()]
      .map((g) => {
        const owned = new Set(
          g.volumes.map((v) => v.volume).filter((n): n is number => n !== null)
        );
        const maxOwned = owned.size ? Math.max(...owned) : 0;
        const horizon = g.totalVolumes ?? maxOwned;
        const missing: number[] = [];
        for (let n = 1; n <= horizon; n++) if (!owned.has(n)) missing.push(n);
        g.volumes.sort((a, b) => (a.volume ?? 0) - (b.volume ?? 0));
        return {
          series: { id: g.id, name: g.name, totalVolumes: g.totalVolumes },
          volumes: g.volumes,
          ownedCount: g.volumes.length,
          maxOwned,
          missing,
        };
      })
      .sort((a, b) => b.ownedCount - a.ownedCount || a.series.name.localeCompare(b.series.name));

    return { collections };
  });

  /** Fijar el total de tomos de una serie ("son 23 en total"). */
  app.patch<{ Params: { id: string } }>("/v1/collections/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const body = req.body as { totalVolumes?: number | null };
    const total =
      body?.totalVolumes === null || body?.totalVolumes === undefined
        ? null
        : Number(body.totalVolumes);
    if (total !== null && (!Number.isInteger(total) || total < 1 || total > 500)) {
      return reply.code(400).send({ error: "invalid_total" });
    }

    // Solo puedes tocar series de las que tienes algún tomo.
    const owns = await db
      .select({ id: schema.userBooks.id })
      .from(schema.userBooks)
      .innerJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
      .innerJoin(schema.works, eq(schema.editions.workId, schema.works.id))
      .where(and(eq(schema.userBooks.userId, req.user.id), eq(schema.works.seriesId, id)))
      .limit(1);
    if (!owns[0]) return reply.code(404).send({ error: "not_found" });

    const [updated] = await db
      .update(schema.series)
      .set({ totalVolumes: total })
      .where(eq(schema.series.id, id))
      .returning();
    return { series: updated };
  });
}
