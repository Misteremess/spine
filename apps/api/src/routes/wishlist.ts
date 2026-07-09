import { toIsbn13 } from "@spine/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";
import { resolveIsbn } from "../services/resolver";

const AddSchema = z
  .object({
    isbn: z.string().min(10).max(17).optional(),
    title: z.string().min(1).max(500).optional(),
    priority: z.number().int().min(1).max(3).default(2),
    targetPriceCents: z.number().int().nonnegative().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => v.isbn || v.title, { message: "isbn o title, al menos uno" });

const PurchasedSchema = z.object({
  purchaseDate: z.string().max(10).optional(),
  purchasePriceCents: z.number().int().nonnegative().optional(),
});

export function wishlistRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.get("/v1/wishlist", async (req) => {
    const items = await db
      .select({
        item: schema.wishlistItems,
        edition: {
          isbn13: schema.editions.isbn13,
          title: schema.editions.title,
          coverUrl: schema.editions.coverUrl,
        },
      })
      .from(schema.wishlistItems)
      .leftJoin(schema.editions, eq(schema.wishlistItems.editionId, schema.editions.id))
      .where(eq(schema.wishlistItems.userId, req.user.id))
      .orderBy(schema.wishlistItems.priority, desc(schema.wishlistItems.createdAt));

    return {
      items: items.map((r) => ({
        ...r.item,
        title: r.edition?.title ?? r.item.title,
        isbn13: r.edition?.isbn13 ?? null,
        coverUrl: r.edition?.coverUrl ?? null,
      })),
    };
  });

  app.post("/v1/wishlist", async (req, reply) => {
    const body = AddSchema.parse(req.body);

    let editionId: number | null = null;
    if (body.isbn) {
      const isbn13 = toIsbn13(body.isbn);
      if (!isbn13) return reply.code(400).send({ error: "invalid_isbn" });
      const resolved = await resolveIsbn(isbn13);
      if (resolved) {
        const [ed] = await db
          .select({ id: schema.editions.id })
          .from(schema.editions)
          .where(eq(schema.editions.isbn13, isbn13))
          .limit(1);
        editionId = ed?.id ?? null;
      }
    }

    const [item] = await db
      .insert(schema.wishlistItems)
      .values({
        userId: req.user.id,
        editionId,
        title: body.title ?? null,
        priority: body.priority,
        targetPriceCents: body.targetPriceCents ?? null,
        notes: body.notes ?? null,
      })
      .returning();
    return reply.code(201).send({ item });
  });

  /** "Lo compré": pasa de la wishlist a la biblioteca en un toque (plan §8). */
  app.post<{ Params: { id: string } }>("/v1/wishlist/:id/purchased", async (req, reply) => {
    const id = Number(req.params.id);
    const body = PurchasedSchema.parse(req.body);

    const [item] = await db
      .select()
      .from(schema.wishlistItems)
      .where(and(eq(schema.wishlistItems.id, id), eq(schema.wishlistItems.userId, req.user.id)))
      .limit(1);
    if (!item) return reply.code(404).send({ error: "not_found" });

    const [book] = await db
      .insert(schema.userBooks)
      .values({
        userId: req.user.id,
        editionId: item.editionId,
        customTitle: item.editionId ? null : item.title,
        purchaseDate: body.purchaseDate ?? new Date().toISOString().slice(0, 10),
        purchasePriceCents: body.purchasePriceCents ?? null,
      })
      .returning();
    if (!book) return reply.code(500).send({ error: "insert_failed" });
    await db.insert(schema.readings).values({ userBookId: book.id });
    await db.delete(schema.wishlistItems).where(eq(schema.wishlistItems.id, id));

    return reply.code(201).send({ userBook: book });
  });

  app.delete<{ Params: { id: string } }>("/v1/wishlist/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const [item] = await db
      .select({ id: schema.wishlistItems.id })
      .from(schema.wishlistItems)
      .where(and(eq(schema.wishlistItems.id, id), eq(schema.wishlistItems.userId, req.user.id)))
      .limit(1);
    if (!item) return reply.code(404).send({ error: "not_found" });
    await db.delete(schema.wishlistItems).where(eq(schema.wishlistItems.id, id));
    return reply.code(204).send();
  });
}
