import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index";
import { ownsBook } from "../db/owns";
import { requireUser } from "../plugins/require-user";

const TagSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().max(20).nullable().optional(),
});

/** Etiquetas del usuario (plan §5.1) y su asignación a ejemplares. */
export function tagsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /** Todas las etiquetas del usuario con su número de libros. */
  app.get("/v1/tags", async (req) => {
    const rows = await db.select().from(schema.tags).where(eq(schema.tags.userId, req.user.id));
    const ids = rows.map((t) => t.id);
    const counts = ids.length
      ? await db
          .select({ tagId: schema.userBookTags.tagId })
          .from(schema.userBookTags)
          .where(inArray(schema.userBookTags.tagId, ids))
      : [];
    const byTag = new Map<number, number>();
    for (const c of counts) byTag.set(c.tagId, (byTag.get(c.tagId) ?? 0) + 1);
    return {
      items: rows
        .map((t) => ({ ...t, count: byTag.get(t.id) ?? 0 }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

  app.post("/v1/tags", async (req, reply) => {
    const body = TagSchema.parse(req.body);
    const [tag] = await db
      .insert(schema.tags)
      .values({ userId: req.user.id, name: body.name, color: body.color ?? null })
      .onConflictDoUpdate({
        target: [schema.tags.userId, schema.tags.name],
        set: { color: body.color ?? null },
      })
      .returning();
    return reply.code(201).send({ tag });
  });

  app.delete<{ Params: { id: string } }>("/v1/tags/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const res = await db
      .delete(schema.tags)
      .where(and(eq(schema.tags.id, id), eq(schema.tags.userId, req.user.id)))
      .returning({ id: schema.tags.id });
    if (!res[0]) return reply.code(404).send({ error: "not_found" });
    return reply.code(204).send();
  });

  /** Etiquetas de un ejemplar. */
  app.get<{ Params: { id: string } }>("/v1/library/:id/tags", async (req, reply) => {
    const id = Number(req.params.id);
    if (!(await ownsBook(req.user.id, id))) return reply.code(404).send({ error: "not_found" });
    const rows = await db
      .select({ tag: schema.tags })
      .from(schema.userBookTags)
      .innerJoin(schema.tags, eq(schema.userBookTags.tagId, schema.tags.id))
      .where(eq(schema.userBookTags.userBookId, id));
    return { items: rows.map((r) => r.tag) };
  });

  /** Asignar una etiqueta (por id o por nombre, creándola si hace falta). */
  app.post<{ Params: { id: string } }>("/v1/library/:id/tags", async (req, reply) => {
    const id = Number(req.params.id);
    if (!(await ownsBook(req.user.id, id))) return reply.code(404).send({ error: "not_found" });
    const body = z
      .object({ tagId: z.number().int().optional(), name: z.string().min(1).max(60).optional() })
      .parse(req.body);

    let tagId = body.tagId;
    if (!tagId && body.name) {
      const [tag] = await db
        .insert(schema.tags)
        .values({ userId: req.user.id, name: body.name })
        .onConflictDoUpdate({
          target: [schema.tags.userId, schema.tags.name],
          set: { name: body.name },
        })
        .returning({ id: schema.tags.id });
      tagId = tag?.id;
    }
    if (!tagId) return reply.code(400).send({ error: "missing_tag" });

    // Verifica que la etiqueta sea del usuario antes de asignarla.
    const [owned] = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(and(eq(schema.tags.id, tagId), eq(schema.tags.userId, req.user.id)))
      .limit(1);
    if (!owned) return reply.code(404).send({ error: "tag_not_found" });

    await db
      .insert(schema.userBookTags)
      .values({ userBookId: id, tagId })
      .onConflictDoNothing();
    return reply.code(201).send({ ok: true, tagId });
  });

  app.delete<{ Params: { id: string; tagId: string } }>(
    "/v1/library/:id/tags/:tagId",
    async (req, reply) => {
      const id = Number(req.params.id);
      const tagId = Number(req.params.tagId);
      if (!(await ownsBook(req.user.id, id))) return reply.code(404).send({ error: "not_found" });
      await db
        .delete(schema.userBookTags)
        .where(
          and(eq(schema.userBookTags.userBookId, id), eq(schema.userBookTags.tagId, tagId))
        );
      return reply.code(204).send();
    }
  );
}
