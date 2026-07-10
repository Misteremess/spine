/**
 * Enriquecimiento del catálogo: rellena los huecos de ediciones que se
 * resolvieron a medias (sin portada, sin sinopsis, sin autores…) volviendo
 * a preguntar a las fuentes. Nunca pisa un dato existente: solo completa.
 * Se dispara en segundo plano al servir del catálogo un registro incompleto
 * y también desde el script scripts/enrich-catalog.ts para el backlog.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index";
import { mergeResults } from "./merge";
import { seriesNameKey } from "./series";
import {
  coverByIsbn,
  fromGoogleBooks,
  fromHardcover,
  fromIsbnDb,
  fromOpenLibrary,
  fromOpenLibrarySearch,
} from "./sources";

/** Devuelve true si completó algún campo. */
export async function enrichEdition(isbn13: string): Promise<boolean> {
  const [ed] = await db
    .select()
    .from(schema.editions)
    .where(eq(schema.editions.isbn13, isbn13))
    .limit(1);
  if (!ed) return false;

  const [work] = await db.select().from(schema.works).where(eq(schema.works.id, ed.workId)).limit(1);
  const authorCount = (
    await db
      .select({ workId: schema.workAuthors.workId })
      .from(schema.workAuthors)
      .where(eq(schema.workAuthors.workId, ed.workId))
  ).length;

  const missing = {
    cover: !ed.coverUrl,
    pages: !ed.pages,
    publishedDate: !ed.publishedDate,
    subtitle: !ed.subtitle,
    language: !ed.language,
    publisher: !ed.publisherId,
    description: !work?.description,
    authors: authorCount === 0,
    series: !work?.seriesId,
    volume: !ed.volumeNumber,
  };
  if (!Object.values(missing).some(Boolean)) return false;

  const settled = await Promise.allSettled([
    fromOpenLibrary(isbn13),
    fromGoogleBooks(isbn13),
    fromIsbnDb(isbn13),
    fromHardcover(isbn13),
  ]);
  const results: import("./sources").SourceResult[] = settled.map((r) =>
    r.status === "fulfilled" ? r.value : null
  );
  if (!results.some((r) => r !== null)) {
    results.push(await fromOpenLibrarySearch(isbn13).catch(() => null));
  }

  const merged = mergeResults(isbn13, results);
  const meta = merged?.metadata;
  const sources: Record<string, string> = { ...(ed.sources ?? {}) };
  let touched = false;

  const edPatch: Partial<typeof schema.editions.$inferInsert> = {};
  if (missing.cover) {
    const cover = meta?.coverUrl ?? (await coverByIsbn(isbn13));
    if (cover) {
      edPatch.coverUrl = cover;
      sources.coverUrl = meta?.coverUrl ? (merged!.sources.coverUrl ?? "enrich") : "cover-by-isbn";
    }
  }
  if (missing.pages && meta?.pages) {
    edPatch.pages = meta.pages;
    sources.pages = merged!.sources.pages ?? "enrich";
  }
  if (missing.publishedDate && meta?.publishedDate) {
    edPatch.publishedDate = meta.publishedDate;
    sources.publishedDate = merged!.sources.publishedDate ?? "enrich";
  }
  if (missing.subtitle && meta?.subtitle) {
    edPatch.subtitle = meta.subtitle;
    sources.subtitle = merged!.sources.subtitle ?? "enrich";
  }
  if (missing.language && meta?.language) {
    edPatch.language = meta.language;
    sources.language = merged!.sources.language ?? "enrich";
  }
  if (missing.volume && meta?.seriesVolume) edPatch.volumeNumber = meta.seriesVolume;

  if (missing.publisher && meta?.publisher) {
    const [p] = await db
      .insert(schema.publishers)
      .values({ name: meta.publisher })
      .onConflictDoUpdate({ target: schema.publishers.name, set: { name: meta.publisher } })
      .returning({ id: schema.publishers.id });
    if (p) {
      edPatch.publisherId = p.id;
      sources.publisher = merged!.sources.publisher ?? "enrich";
    }
  }

  if (Object.keys(edPatch).length > 0) {
    await db
      .update(schema.editions)
      .set({ ...edPatch, sources, updatedAt: new Date() })
      .where(eq(schema.editions.id, ed.id));
    touched = true;
  }

  if (missing.description && meta?.description) {
    await db
      .update(schema.works)
      .set({ description: meta.description })
      .where(eq(schema.works.id, ed.workId));
    touched = true;
  }

  if (missing.authors && meta?.authors?.length) {
    for (const name of meta.authors) {
      const [a] = await db
        .insert(schema.authors)
        .values({ name })
        .onConflictDoUpdate({ target: schema.authors.name, set: { name } })
        .returning({ id: schema.authors.id });
      if (a) {
        await db
          .insert(schema.workAuthors)
          .values({ workId: ed.workId, authorId: a.id })
          .onConflictDoNothing();
      }
    }
    touched = true;
  }

  if (missing.series && meta?.series) {
    const key = seriesNameKey(meta.series);
    const [ser] = await db
      .insert(schema.series)
      .values({ name: meta.series, nameKey: key })
      .onConflictDoUpdate({ target: schema.series.nameKey, set: { nameKey: key } })
      .returning({ id: schema.series.id });
    if (ser) {
      await db
        .update(schema.works)
        .set({ seriesId: ser.id, seriesPosition: meta.seriesVolume ?? null })
        .where(eq(schema.works.id, ed.workId));
      touched = true;
    }
  }

  return touched;
}
