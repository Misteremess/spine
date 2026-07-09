/**
 * Resolver ISBN de producción: catálogo propio → Open Library → Google Books.
 * Cada ISBN se resuelve UNA vez contra las APIs externas; después vive en
 * nuestro catálogo (plan §13: las fuentes son semilla, no dependencia).
 */
import type { BookMetadata, ResolveResponse } from "@spine/shared";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index";
import { mergeResults } from "./merge";
import { fromGoogleBooks, fromOpenLibrary } from "./sources";

async function findInCatalog(isbn13: string): Promise<BookMetadata | null> {
  const rows = await db
    .select()
    .from(schema.editions)
    .where(eq(schema.editions.isbn13, isbn13))
    .limit(1);
  const ed = rows[0];
  if (!ed) return null;

  const authorRows = await db
    .select({ name: schema.authors.name })
    .from(schema.workAuthors)
    .innerJoin(schema.authors, eq(schema.workAuthors.authorId, schema.authors.id))
    .where(eq(schema.workAuthors.workId, ed.workId));

  const pub = ed.publisherId
    ? await db.select().from(schema.publishers).where(eq(schema.publishers.id, ed.publisherId)).limit(1)
    : [];

  const work = await db.select().from(schema.works).where(eq(schema.works.id, ed.workId)).limit(1);

  return {
    isbn13: ed.isbn13,
    title: ed.title,
    subtitle: ed.subtitle,
    authors: authorRows.map((a) => a.name),
    publisher: pub[0]?.name ?? null,
    language: ed.language,
    pages: ed.pages,
    publishedDate: ed.publishedDate,
    coverUrl: ed.coverUrl,
    description: work[0]?.description ?? null,
  };
}

async function upsertCatalog(meta: BookMetadata, sources: Record<string, string>): Promise<void> {
  await db.transaction(async (tx) => {
    let publisherId: number | null = null;
    if (meta.publisher) {
      const [p] = await tx
        .insert(schema.publishers)
        .values({ name: meta.publisher })
        .onConflictDoUpdate({ target: schema.publishers.name, set: { name: meta.publisher } })
        .returning({ id: schema.publishers.id });
      publisherId = p?.id ?? null;
    }

    const [work] = await tx
      .insert(schema.works)
      .values({ title: meta.title, description: meta.description ?? null })
      .returning({ id: schema.works.id });
    if (!work) throw new Error("no se pudo crear el work");

    for (const name of meta.authors ?? []) {
      const [a] = await tx
        .insert(schema.authors)
        .values({ name })
        .onConflictDoUpdate({ target: schema.authors.name, set: { name } })
        .returning({ id: schema.authors.id });
      if (a) {
        await tx
          .insert(schema.workAuthors)
          .values({ workId: work.id, authorId: a.id })
          .onConflictDoNothing();
      }
    }

    await tx
      .insert(schema.editions)
      .values({
        workId: work.id,
        isbn13: meta.isbn13,
        title: meta.title,
        subtitle: meta.subtitle ?? null,
        publisherId,
        language: meta.language ?? null,
        pages: meta.pages ?? null,
        publishedDate: meta.publishedDate ?? null,
        coverUrl: meta.coverUrl ?? null,
        sources,
      })
      .onConflictDoNothing({ target: schema.editions.isbn13 });
  });
}

async function logResolution(isbn13: string, resolved: boolean, source: string | null, ms: number) {
  try {
    await db.insert(schema.resolutionLog).values({ isbn13, resolved, source, ms });
  } catch {
    /* la métrica nunca debe tumbar una resolución */
  }
}

export async function resolveIsbn(isbn13: string): Promise<ResolveResponse | null> {
  const t0 = Date.now();

  const cached = await findInCatalog(isbn13);
  if (cached) {
    void logResolution(isbn13, true, "catalog", Date.now() - t0);
    return { metadata: cached, source: "catalog", cached: true };
  }

  const [ol, gb] = await Promise.allSettled([fromOpenLibrary(isbn13), fromGoogleBooks(isbn13)]);
  const results = [
    ol.status === "fulfilled" ? ol.value : null,
    gb.status === "fulfilled" ? gb.value : null,
  ];

  const merged = mergeResults(isbn13, results);
  if (!merged) {
    void logResolution(isbn13, false, null, Date.now() - t0);
    return null;
  }

  await upsertCatalog(merged.metadata, merged.sources);

  const usedSources = new Set(Object.values(merged.sources));
  const source =
    usedSources.size > 1 ? "merged" : ((usedSources.values().next().value ?? "merged") as ResolveResponse["source"]);
  void logResolution(isbn13, true, source, Date.now() - t0);

  return { metadata: merged.metadata, source, cached: false };
}
