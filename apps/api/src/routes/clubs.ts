/**
 * Clubs de lectura: grupo privado con código de invitación de 6 letras,
 * libro actual elegido por quien lo administra y un hilo de debate.
 */
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index";
import { requireUser } from "../plugins/require-user";

const CreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});
const PostSchema = z.object({ text: z.string().trim().min(1).max(4000) });

/** Sin caracteres ambiguos (0/O, 1/I/L) para poder dictarlo en voz alta. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function inviteCode(): string {
  const bytes = randomBytes(6);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

async function membership(clubId: number, userId: string) {
  const [m] = await db
    .select()
    .from(schema.clubMembers)
    .where(and(eq(schema.clubMembers.clubId, clubId), eq(schema.clubMembers.userId, userId)))
    .limit(1);
  return m ?? null;
}

async function workCard(workId: number | null) {
  if (!workId) return null;
  const [w] = await db
    .select({ id: schema.works.id, title: schema.works.title })
    .from(schema.works)
    .where(eq(schema.works.id, workId))
    .limit(1);
  if (!w) return null;
  const [ed] = await db
    .select({ coverUrl: schema.editions.coverUrl, isbn13: schema.editions.isbn13 })
    .from(schema.editions)
    .where(eq(schema.editions.workId, workId))
    .limit(1);
  return { ...w, coverUrl: ed?.coverUrl ?? null, isbn13: ed?.isbn13 ?? null };
}

export function clubsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  app.post("/v1/clubs", async (req, reply) => {
    const body = CreateSchema.parse(req.body);
    const club = await db.transaction(async (tx) => {
      const [c] = await tx
        .insert(schema.clubs)
        .values({
          name: body.name,
          description: body.description ?? null,
          inviteCode: inviteCode(),
          ownerId: req.user.id,
        })
        .returning();
      if (!c) throw new Error("no se pudo crear el club");
      await tx.insert(schema.clubMembers).values({ clubId: c.id, userId: req.user.id, role: "owner" });
      return c;
    });
    return reply.code(201).send({ club });
  });

  /** Tus clubs, con nº de miembros y el libro actual. */
  app.get("/v1/clubs", async (req) => {
    const mine = await db
      .select({ club: schema.clubs, role: schema.clubMembers.role })
      .from(schema.clubMembers)
      .innerJoin(schema.clubs, eq(schema.clubMembers.clubId, schema.clubs.id))
      .where(eq(schema.clubMembers.userId, req.user.id))
      .orderBy(desc(schema.clubs.id));

    const ids = mine.map((m) => m.club.id);
    const counts = ids.length
      ? await db
          .select({ clubId: schema.clubMembers.clubId, n: sql<number>`count(*)::int` })
          .from(schema.clubMembers)
          .where(inArray(schema.clubMembers.clubId, ids))
          .groupBy(schema.clubMembers.clubId)
      : [];
    const countBy = new Map(counts.map((c) => [c.clubId, c.n]));

    const clubs = [];
    for (const m of mine) {
      clubs.push({
        id: m.club.id,
        name: m.club.name,
        description: m.club.description,
        inviteCode: m.club.inviteCode,
        role: m.role,
        members: countBy.get(m.club.id) ?? 1,
        currentWork: await workCard(m.club.currentWorkId),
      });
    }
    return { clubs };
  });

  app.post("/v1/clubs/join", async (req, reply) => {
    const code = z.object({ code: z.string().trim().toUpperCase().length(6) }).parse(req.body).code;
    const [club] = await db.select().from(schema.clubs).where(eq(schema.clubs.inviteCode, code)).limit(1);
    if (!club) return reply.code(404).send({ error: "not_found", message: "Código no válido" });
    await db
      .insert(schema.clubMembers)
      .values({ clubId: club.id, userId: req.user.id })
      .onConflictDoNothing();
    return { club: { id: club.id, name: club.name } };
  });

  app.get<{ Params: { id: string } }>("/v1/clubs/:id", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "invalid_id" });
    const me = await membership(id, req.user.id);
    if (!me) return reply.code(404).send({ error: "not_found" });

    const [club] = await db.select().from(schema.clubs).where(eq(schema.clubs.id, id)).limit(1);
    if (!club) return reply.code(404).send({ error: "not_found" });

    const members = await db
      .select({ name: schema.user.name, role: schema.clubMembers.role, userId: schema.clubMembers.userId })
      .from(schema.clubMembers)
      .innerJoin(schema.user, eq(schema.clubMembers.userId, schema.user.id))
      .where(eq(schema.clubMembers.clubId, id))
      .orderBy(asc(schema.clubMembers.joinedAt));

    const posts = await db
      .select({
        id: schema.clubPosts.id,
        text: schema.clubPosts.text,
        createdAt: schema.clubPosts.createdAt,
        userId: schema.clubPosts.userId,
        userName: schema.user.name,
      })
      .from(schema.clubPosts)
      .innerJoin(schema.user, eq(schema.clubPosts.userId, schema.user.id))
      .where(eq(schema.clubPosts.clubId, id))
      .orderBy(desc(schema.clubPosts.id))
      .limit(100);

    return {
      club: {
        id: club.id,
        name: club.name,
        description: club.description,
        inviteCode: club.inviteCode,
        role: me.role,
        currentWork: await workCard(club.currentWorkId),
      },
      members: members.map((m) => ({ name: m.name, role: m.role, you: m.userId === req.user.id })),
      posts: posts
        .reverse()
        .map(({ userId, ...p }) => ({ ...p, own: userId === req.user.id })),
    };
  });

  app.post<{ Params: { id: string } }>("/v1/clubs/:id/posts", async (req, reply) => {
    const id = Number(req.params.id);
    const me = await membership(id, req.user.id);
    if (!me) return reply.code(404).send({ error: "not_found" });
    const body = PostSchema.parse(req.body);

    const [post] = await db
      .insert(schema.clubPosts)
      .values({ clubId: id, userId: req.user.id, text: body.text })
      .returning();

    // Avisar al resto de miembros, pero solo si no arrastran ya un aviso
    // sin leer de este club (un debate animado no debe generar 50 avisos).
    const [club] = await db.select().from(schema.clubs).where(eq(schema.clubs.id, id)).limit(1);
    const others = await db
      .select({ userId: schema.clubMembers.userId })
      .from(schema.clubMembers)
      .where(and(eq(schema.clubMembers.clubId, id), sql`${schema.clubMembers.userId} <> ${req.user.id}`));
    if (others.length > 0 && club) {
      const pending = await db
        .select({ userId: schema.notifications.userId })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.type, "club_post"),
            isNull(schema.notifications.readAt),
            sql`${schema.notifications.data} ->> 'clubId' = ${String(id)}`
          )
        );
      const alreadyNotified = new Set(pending.map((p) => p.userId));
      const values = others
        .filter((o) => !alreadyNotified.has(o.userId))
        .map((o) => ({
          userId: o.userId,
          type: "club_post",
          title: `Nuevos mensajes en ${club.name}`,
          body: body.text.length > 120 ? `${body.text.slice(0, 117)}…` : body.text,
          data: { clubId: id } as Record<string, unknown>,
        }));
      if (values.length > 0) await db.insert(schema.notifications).values(values);
    }

    return reply.code(201).send({ post });
  });

  /** Cambiar nombre, descripción o libro actual (solo owner). */
  app.patch<{ Params: { id: string } }>("/v1/clubs/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const me = await membership(id, req.user.id);
    if (!me) return reply.code(404).send({ error: "not_found" });
    if (me.role !== "owner") return reply.code(403).send({ error: "forbidden" });

    const body = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        description: z.string().trim().max(500).nullish(),
        /** Se acepta editionId (lo que la app conoce) y se resuelve a work. */
        editionId: z.number().int().nullish(),
      })
      .parse(req.body);

    const patch: Partial<typeof schema.clubs.$inferInsert> = {};
    if (body.name) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.editionId !== undefined) {
      if (body.editionId === null) {
        patch.currentWorkId = null;
      } else {
        const [ed] = await db
          .select({ workId: schema.editions.workId })
          .from(schema.editions)
          .where(eq(schema.editions.id, body.editionId))
          .limit(1);
        if (!ed) return reply.code(404).send({ error: "edition_not_found" });
        patch.currentWorkId = ed.workId;
      }
    }
    if (Object.keys(patch).length === 0) return reply.code(400).send({ error: "empty_patch" });

    await db.update(schema.clubs).set(patch).where(eq(schema.clubs.id, id));
    const [club] = await db.select().from(schema.clubs).where(eq(schema.clubs.id, id)).limit(1);
    return { club: { ...club, currentWork: await workCard(club?.currentWorkId ?? null) } };
  });

  app.post<{ Params: { id: string } }>("/v1/clubs/:id/leave", async (req, reply) => {
    const id = Number(req.params.id);
    const me = await membership(id, req.user.id);
    if (!me) return reply.code(404).send({ error: "not_found" });

    if (me.role === "owner") {
      // El último que apaga la luz: si quedan miembros, hereda el más antiguo.
      const rest = await db
        .select()
        .from(schema.clubMembers)
        .where(and(eq(schema.clubMembers.clubId, id), sql`${schema.clubMembers.userId} <> ${req.user.id}`))
        .orderBy(asc(schema.clubMembers.joinedAt))
        .limit(1);
      if (rest[0]) {
        await db
          .update(schema.clubMembers)
          .set({ role: "owner" })
          .where(and(eq(schema.clubMembers.clubId, id), eq(schema.clubMembers.userId, rest[0].userId)));
        await db.update(schema.clubs).set({ ownerId: rest[0].userId }).where(eq(schema.clubs.id, id));
        await db
          .delete(schema.clubMembers)
          .where(and(eq(schema.clubMembers.clubId, id), eq(schema.clubMembers.userId, req.user.id)));
      } else {
        await db.delete(schema.clubs).where(eq(schema.clubs.id, id));
      }
    } else {
      await db
        .delete(schema.clubMembers)
        .where(and(eq(schema.clubMembers.clubId, id), eq(schema.clubMembers.userId, req.user.id)));
    }
    return reply.code(204).send();
  });
}
