/**
 * Reseñas públicas por obra: estrellas (medias, 1..10) + texto opcional.
 * Una reseña por usuario y obra; la media comunitaria viaja con el listado.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";

const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(10),
  text: z.string().trim().max(10000).optional(),
  spoilers: z.boolean().optional(),
});

export function reviewsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.get<{ Params: { id: string } }>("/v1/works/:id/reviews", async (req, reply) => {
    const workId = Number(req.params.id);
    if (!Number.isInteger(workId)) return reply.code(400).send({ error: "invalid_id" });

    const rows = await db
      .select({
        id: schema.reviews.id,
        rating: schema.reviews.rating,
        text: schema.reviews.text,
        spoilers: schema.reviews.spoilers,
        createdAt: schema.reviews.createdAt,
        updatedAt: schema.reviews.updatedAt,
        userId: schema.reviews.userId,
        userName: schema.user.name,
      })
      .from(schema.reviews)
      .innerJoin(schema.user, eq(schema.reviews.userId, schema.user.id))
      .where(eq(schema.reviews.workId, workId))
      .orderBy(desc(schema.reviews.updatedAt))
      .limit(100);

    const mine = rows.find((r) => r.userId === req.user.id) ?? null;
    const count = rows.length;
    const average = count
      ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : null;

    return {
      reviews: rows.map(({ userId, ...r }) => ({ ...r, own: userId === req.user.id })),
      count,
      /** Media comunitaria en medias estrellas (1..10). */
      average,
      mine: mine ? { id: mine.id, rating: mine.rating, text: mine.text, spoilers: mine.spoilers } : null,
    };
  });

  /** Crear o actualizar TU reseña de la obra (upsert). */
  app.put<{ Params: { id: string } }>("/v1/works/:id/review", async (req, reply) => {
    const workId = Number(req.params.id);
    if (!Number.isInteger(workId)) return reply.code(400).send({ error: "invalid_id" });
    const body = ReviewSchema.parse(req.body);

    const [work] = await db.select({ id: schema.works.id }).from(schema.works).where(eq(schema.works.id, workId)).limit(1);
    if (!work) return reply.code(404).send({ error: "not_found" });

    const [review] = await db
      .insert(schema.reviews)
      .values({
        userId: req.user.id,
        workId,
        rating: body.rating,
        text: body.text || null,
        spoilers: body.spoilers ?? false,
      })
      .onConflictDoUpdate({
        target: [schema.reviews.userId, schema.reviews.workId],
        set: {
          rating: body.rating,
          text: body.text || null,
          spoilers: body.spoilers ?? false,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return { review };
  });

  app.delete<{ Params: { id: string } }>("/v1/works/:id/review", async (req, reply) => {
    const workId = Number(req.params.id);
    const deleted = await db
      .delete(schema.reviews)
      .where(and(eq(schema.reviews.workId, workId), eq(schema.reviews.userId, req.user.id)))
      .returning({ id: schema.reviews.id });
    if (deleted.length === 0) return reply.code(404).send({ error: "not_found" });
    return reply.code(204).send();
  });
}
