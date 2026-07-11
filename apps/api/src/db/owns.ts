import { and, eq } from "drizzle-orm";
import { db, schema } from "./index";

/** ¿Es este ejemplar del usuario? Aísla datos por usuario (plan §10). */
export async function ownsBook(userId: string, userBookId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.userBooks.id })
    .from(schema.userBooks)
    .where(and(eq(schema.userBooks.id, userBookId), eq(schema.userBooks.userId, userId)))
    .limit(1);
  return Boolean(row);
}
