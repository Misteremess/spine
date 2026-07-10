import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, schema } from "../src/db/index";

/** Vacía todas las tablas entre suites (la BD es spine_test, ver vitest.config). */
export async function resetDb() {
  await db.execute(sql`
    TRUNCATE "user", session, account, verification,
      publishers, authors, series, works, work_authors, editions, resolution_log,
      user_books, readings, progress_entries, wishlist_items,
      series_releases, notifications, reviews, clubs, club_members, club_posts
    RESTART IDENTITY CASCADE
  `);
}

/** Registra un usuario vía Better Auth y devuelve la cookie de sesión. */
export async function signUp(app: FastifyInstance, email: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload: { email, password: "contraseña-de-test", name: "Test" },
  });
  if (res.statusCode !== 200) throw new Error(`sign-up falló: ${res.statusCode} ${res.body}`);
  const setCookie = res.headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const cookie = raw?.split(";")[0];
  if (!cookie) throw new Error("sign-up sin cookie de sesión");
  return cookie;
}

/** Siembra una edición en el catálogo (para resolver sin tocar la red). */
export async function seedEdition(opts: {
  isbn13: string;
  title: string;
  authors?: string[];
  pages?: number;
  seriesName?: string;
  volumeNumber?: number;
}) {
  let seriesId: number | null = null;
  if (opts.seriesName) {
    const key = opts.seriesName.toLowerCase();
    const [ser] = await db
      .insert(schema.series)
      .values({ name: opts.seriesName, nameKey: key })
      .onConflictDoUpdate({ target: schema.series.nameKey, set: { nameKey: key } })
      .returning({ id: schema.series.id });
    seriesId = ser?.id ?? null;
  }

  const [work] = await db
    .insert(schema.works)
    .values({ title: opts.title, seriesId, seriesPosition: opts.volumeNumber ?? null })
    .returning({ id: schema.works.id });
  if (!work) throw new Error("seed: work");

  for (const name of opts.authors ?? []) {
    const [a] = await db
      .insert(schema.authors)
      .values({ name })
      .onConflictDoUpdate({ target: schema.authors.name, set: { name } })
      .returning({ id: schema.authors.id });
    if (a) await db.insert(schema.workAuthors).values({ workId: work.id, authorId: a.id });
  }

  await db.insert(schema.editions).values({
    workId: work.id,
    isbn13: opts.isbn13,
    title: opts.title,
    pages: opts.pages ?? null,
    volumeNumber: opts.volumeNumber ?? null,
  });
}
