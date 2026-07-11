import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index";
import { ownsBook } from "../db/owns";
import { requireUser } from "../plugins/require-user";

const NoteSchema = z.object({
  text: z.string().min(1).max(10000),
  page: z.number().int().min(0).max(100000).nullable().optional(),
  isQuote: z.boolean().default(false),
  spoiler: z.boolean().default(false),
});

/** Notas y citas por ejemplar (plan §5.8). Privadas, Markdown. */
export function notesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.get<{ Params: { id: string } }>("/v1/library/:id/notes", async (req, reply) => {
    const id = Number(req.params.id);
    if (!(await ownsBook(req.user.id, id))) return reply.code(404).send({ error: "not_found" });
    const items = await db
      .select()
      .from(schema.notes)
      .where(eq(schema.notes.userBookId, id))
      .orderBy(desc(schema.notes.createdAt));
    return { items };
  });

  app.post<{ Params: { id: string } }>("/v1/library/:id/notes", async (req, reply) => {
    const id = Number(req.params.id);
    if (!(await ownsBook(req.user.id, id))) return reply.code(404).send({ error: "not_found" });
    const body = NoteSchema.parse(req.body);
    const [note] = await db
      .insert(schema.notes)
      .values({
        userId: req.user.id,
        userBookId: id,
        text: body.text,
        page: body.page ?? null,
        isQuote: body.isQuote,
        spoiler: body.spoiler,
      })
      .returning();
    return reply.code(201).send({ note });
  });

  app.patch<{ Params: { id: string } }>("/v1/notes/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const body = NoteSchema.partial().parse(req.body);
    const [existing] = await db
      .select()
      .from(schema.notes)
      .where(and(eq(schema.notes.id, id), eq(schema.notes.userId, req.user.id)))
      .limit(1);
    if (!existing) return reply.code(404).send({ error: "not_found" });
    const [note] = await db
      .update(schema.notes)
      .set({
        text: body.text ?? existing.text,
        page: body.page === undefined ? existing.page : body.page,
        isQuote: body.isQuote ?? existing.isQuote,
        spoiler: body.spoiler ?? existing.spoiler,
        updatedAt: new Date(),
      })
      .where(eq(schema.notes.id, id))
      .returning();
    return { note };
  });

  app.delete<{ Params: { id: string } }>("/v1/notes/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const res = await db
      .delete(schema.notes)
      .where(and(eq(schema.notes.id, id), eq(schema.notes.userId, req.user.id)))
      .returning({ id: schema.notes.id });
    if (!res[0]) return reply.code(404).send({ error: "not_found" });
    return reply.code(204).send();
  });
}
