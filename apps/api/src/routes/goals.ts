import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";

const GoalSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  type: z.enum(["books", "pages"]).default("books"),
  target: z.number().int().min(1).max(100000),
});

/** Reto anual del plan §5.11: objetivo de libros o páginas y su progreso real. */
export function goalsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /** Objetivos del año (por defecto el actual) con progreso calculado. */
  app.get<{ Querystring: { year?: string } }>("/v1/goals", async (req) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const goals = await db
      .select()
      .from(schema.readingGoals)
      .where(and(eq(schema.readingGoals.userId, req.user.id), eq(schema.readingGoals.year, year)));

    // Progreso real del año: libros terminados y páginas de esos libros.
    const books = await db
      .select({ id: schema.userBooks.id, pages: schema.editions.pages })
      .from(schema.userBooks)
      .leftJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
      .where(eq(schema.userBooks.userId, req.user.id));
    const pagesByBook = new Map(books.map((b) => [b.id, b.pages ?? 0]));
    const ids = books.map((b) => b.id);
    const readings = ids.length
      ? await db.select().from(schema.readings).where(inArray(schema.readings.userBookId, ids))
      : [];
    let finished = 0;
    let pages = 0;
    for (const r of readings) {
      if (r.status === "finished" && r.finishedAt?.startsWith(String(year))) {
        finished++;
        pages += pagesByBook.get(r.userBookId) ?? 0;
      }
    }

    return {
      year,
      progress: { books: finished, pages },
      goals: goals.map((g) => ({
        ...g,
        current: g.type === "pages" ? pages : finished,
        pct: Math.min(100, Math.round(((g.type === "pages" ? pages : finished) / g.target) * 100)),
      })),
    };
  });

  /** Fijar (o actualizar) un objetivo. target=0 lo elimina. */
  app.put("/v1/goals", async (req) => {
    const body = GoalSchema.parse(req.body);
    const [goal] = await db
      .insert(schema.readingGoals)
      .values({ userId: req.user.id, year: body.year, type: body.type, target: body.target })
      .onConflictDoUpdate({
        target: [schema.readingGoals.userId, schema.readingGoals.year, schema.readingGoals.type],
        set: { target: body.target, updatedAt: new Date() },
      })
      .returning();
    return { goal };
  });

  app.delete<{ Querystring: { year?: string; type?: string } }>("/v1/goals", async (req) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const type = req.query.type === "pages" ? "pages" : "books";
    await db
      .delete(schema.readingGoals)
      .where(
        and(
          eq(schema.readingGoals.userId, req.user.id),
          eq(schema.readingGoals.year, year),
          eq(schema.readingGoals.type, type)
        )
      );
    return { ok: true };
  });
}
