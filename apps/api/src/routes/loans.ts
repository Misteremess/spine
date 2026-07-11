import { and, desc, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index";
import { ownsBook } from "../db/owns";
import { requireUser } from "../plugins/require-user";

const today = () => new Date().toISOString().slice(0, 10);

const LoanSchema = z.object({
  borrower: z.string().min(1).max(200),
  loanedAt: z.string().max(10).optional(),
  dueAt: z.string().max(10).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/** Préstamos del plan §5/§6: a quién, cuándo, recordatorio y devolución. */
export function loansRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireUser);

  /** Todos los préstamos activos del usuario (badge "prestado a…"). */
  app.get("/v1/loans", async (req) => {
    const items = await db
      .select({
        loan: schema.loans,
        title: schema.editions.title,
        customTitle: schema.userBooks.customTitle,
        coverUrl: schema.editions.coverUrl,
      })
      .from(schema.loans)
      .innerJoin(schema.userBooks, eq(schema.loans.userBookId, schema.userBooks.id))
      .leftJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
      .where(and(eq(schema.loans.userId, req.user.id), isNull(schema.loans.returnedAt)))
      .orderBy(desc(schema.loans.loanedAt));
    return {
      items: items.map((r) => ({
        ...r.loan,
        title: r.title ?? r.customTitle,
        coverUrl: r.coverUrl,
      })),
    };
  });

  /** Historial de préstamos de un ejemplar (el activo primero). */
  app.get<{ Params: { id: string } }>("/v1/library/:id/loans", async (req, reply) => {
    const id = Number(req.params.id);
    if (!(await ownsBook(req.user.id, id))) return reply.code(404).send({ error: "not_found" });
    const items = await db
      .select()
      .from(schema.loans)
      .where(eq(schema.loans.userBookId, id))
      .orderBy(desc(schema.loans.loanedAt));
    return { items, active: items.find((l) => l.returnedAt === null) ?? null };
  });

  /** Prestar el ejemplar. Rechaza si ya está prestado. */
  app.post<{ Params: { id: string } }>("/v1/library/:id/loans", async (req, reply) => {
    const id = Number(req.params.id);
    if (!(await ownsBook(req.user.id, id))) return reply.code(404).send({ error: "not_found" });
    const body = LoanSchema.parse(req.body);
    const [active] = await db
      .select({ id: schema.loans.id })
      .from(schema.loans)
      .where(and(eq(schema.loans.userBookId, id), isNull(schema.loans.returnedAt)))
      .limit(1);
    if (active) {
      return reply.code(409).send({ error: "already_loaned", message: "Ya está prestado" });
    }
    const [loan] = await db
      .insert(schema.loans)
      .values({
        userId: req.user.id,
        userBookId: id,
        borrower: body.borrower,
        loanedAt: body.loanedAt ?? today(),
        dueAt: body.dueAt ?? null,
        notes: body.notes ?? null,
      })
      .returning();
    return reply.code(201).send({ loan });
  });

  /** Marcar devuelto ("me lo devolvió"): guarda historial. */
  app.post<{ Params: { id: string } }>("/v1/loans/:id/return", async (req, reply) => {
    const id = Number(req.params.id);
    const [loan] = await db
      .update(schema.loans)
      .set({ returnedAt: today() })
      .where(
        and(
          eq(schema.loans.id, id),
          eq(schema.loans.userId, req.user.id),
          isNull(schema.loans.returnedAt)
        )
      )
      .returning();
    if (!loan) return reply.code(404).send({ error: "not_found" });
    return { loan };
  });

  app.delete<{ Params: { id: string } }>("/v1/loans/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const res = await db
      .delete(schema.loans)
      .where(and(eq(schema.loans.id, id), eq(schema.loans.userId, req.user.id)))
      .returning({ id: schema.loans.id });
    if (!res[0]) return reply.code(404).send({ error: "not_found" });
    return reply.code(204).send();
  });
}
