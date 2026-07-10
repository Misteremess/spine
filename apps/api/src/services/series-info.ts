/**
 * Ficha viva de las sagas: cuántos tomos existen, cuáles faltan y qué
 * novedades salen. Dos fuentes que se complementan:
 *  - AniList (gratis, sin key): estado de publicación, portada, sinopsis y
 *    total de tomos — pero solo fija `volumes` cuando la serie TERMINA.
 *  - Google Books como radar: buscar el título de la serie devuelve los
 *    tomos publicados (con fecha, incluso futura) → último tomo + próximos.
 * El radar corre periódicamente; cuando detecta un tomo nuevo avisa a todos
 * los usuarios que tienen algún tomo de esa saga.
 */
import { eq, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "../db/index";
import { env } from "../env";
import { extractFromTitle, seriesNameKey } from "./series";

const UA = "Spine/0.1 (+https://github.com/Misteremess/spine)";

/** Comparación laxa de títulos: minúsculas, sin acentos ni signos. */
function simplify(s: string): string {
  return seriesNameKey(s).replace(/\s+/g, "");
}

/** Limpia HTML de sinopsis y decodifica entidades (AniList doble-escapa). */
function cleanDescription(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titlesMatch(a: string, b: string): boolean {
  const sa = simplify(a);
  const sb = simplify(b);
  if (sa.length < 4 || sb.length < 4) return sa === sb;
  return sa.includes(sb) || sb.includes(sa);
}

/**
 * Las editoriales españolas cuelgan el formato del nombre de la serie
 * ("Love Hina Edición Deluxe", "Dragon Ball Ultimate"): para buscar fuera
 * hay que quitar el sufijo editorial.
 */
export function stripEditionSuffix(name: string): string {
  const cleaned = name
    .replace(
      /\s*[,.:;(-]*\s*\b(edición|edicion|ed\.)\s+(deluxe|especial|integral|definitiva|coleccionista|kanzenban|maximum|aniversario|2\s*en\s*1|3\s*en\s*1)\b.*$/iu,
      ""
    )
    .replace(/\s*[,.:;(-]*\s*\b(deluxe|kanzenban|ultimate|integral|omnibus)\s*(edition)?\s*$/iu, "")
    .trim();
  return cleaned.length >= 3 ? cleaned : name;
}

export type AniListInfo = {
  id: number;
  status: "ongoing" | "completed" | "unknown";
  totalVolumes: number | null;
  coverUrl: string | null;
  description: string | null;
  isManga: boolean;
};

/**
 * Busca la serie en AniList y devuelve su ficha SOLO si el título coincide
 * de verdad (el buscador devuelve siempre "algo": hay que validar).
 */
export async function fetchAniListInfo(name: string): Promise<AniListInfo | null> {
  const direct = await queryAniList(name);
  if (direct) return direct;
  const stripped = stripEditionSuffix(name);
  return stripped === name ? null : queryAniList(stripped);
}

async function queryAniList(name: string): Promise<AniListInfo | null> {
  const query = `query($s: String) {
    Media(search: $s, type: MANGA) {
      id volumes status format
      title { romaji english native }
      synonyms
      coverImage { large }
      description(asHtml: false)
    }
  }`;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ query, variables: { s: name } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const media = ((await res.json()) as Record<string, any>)?.data?.Media;
    if (!media) return null;

    const candidates: string[] = [
      media.title?.romaji,
      media.title?.english,
      media.title?.native,
      ...(Array.isArray(media.synonyms) ? media.synonyms : []),
    ].filter((t): t is string => typeof t === "string");
    if (!candidates.some((t) => titlesMatch(t, name) || titlesMatch(t, stripEditionSuffix(name)))) {
      return null;
    }

    const status =
      media.status === "FINISHED"
        ? ("completed" as const)
        : media.status === "RELEASING"
          ? ("ongoing" as const)
          : ("unknown" as const);

    return {
      id: media.id,
      status,
      // AniList solo rellena `volumes` al terminar la serie: es el total real.
      totalVolumes:
        typeof media.volumes === "number" && media.volumes > 0 ? media.volumes : null,
      coverUrl: typeof media.coverImage?.large === "string" ? media.coverImage.large : null,
      description:
        typeof media.description === "string" ? cleanDescription(media.description) : null,
      isManga: media.format === "MANGA" || media.format === "ONE_SHOT",
    };
  } catch {
    return null;
  }
}

export type ReleaseHit = {
  volumeNumber: number;
  title: string;
  isbn13: string | null;
  publishedDate: string | null;
  coverUrl: string | null;
};

/**
 * Radar de Google Books: busca el título de la serie y extrae los tomos
 * numerados. `lang` acota al mercado del usuario (las novedades que
 * importan son las de TU edición, no la japonesa).
 */
export async function scanGoogleBooksReleases(
  name: string,
  lang: string | null
): Promise<ReleaseHit[]> {
  const hits = await scanGoogleBooksOnce(name, lang);
  if (hits.length > 0) return hits;
  // Serie nicho en ese idioma: reintentar sin acotar y con el nombre limpio.
  const stripped = stripEditionSuffix(name);
  if (lang) {
    const noLang = await scanGoogleBooksOnce(stripped, null);
    if (noLang.length > 0) return noLang;
  }
  return stripped === name ? [] : scanGoogleBooksOnce(stripped, lang);
}

async function scanGoogleBooksOnce(name: string, lang: string | null): Promise<ReleaseHit[]> {
  if (!env.GOOGLE_BOOKS_API_KEY) return [];
  // El buscador de GB no entiende "×" (SPY×FAMILY): en los títulos impresos
  // españoles es "Spy x Family".
  const q = encodeURIComponent(`intitle:"${name.replace(/×/g, " x ").replace(/\s{2,}/g, " ")}"`);
  const langParam = lang ? `&langRestrict=${encodeURIComponent(lang)}` : "";
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=${q}${langParam}` +
    `&orderBy=newest&maxResults=40&key=${env.GOOGLE_BOOKS_API_KEY}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const items = ((await res.json()) as Record<string, any>)?.items;
    if (!Array.isArray(items)) return [];

    const key = seriesNameKey(name);
    const byVolume = new Map<number, ReleaseHit>();
    for (const it of items) {
      const vi = it?.volumeInfo;
      if (!vi || typeof vi.title !== "string") continue;
      const hit = extractFromTitle(vi.title);
      if (!hit?.volume) continue;
      // El título extraído debe ser la MISMA serie, no una parecida.
      const hitKey = seriesNameKey(hit.name);
      if (hitKey !== key && !titlesMatch(hit.name, name)) continue;

      const isbn13 = Array.isArray(vi.industryIdentifiers)
        ? (vi.industryIdentifiers.find((x: any) => x?.type === "ISBN_13")?.identifier ?? null)
        : null;
      const prev = byVolume.get(hit.volume);
      const entry: ReleaseHit = {
        volumeNumber: hit.volume,
        title: vi.title,
        isbn13: typeof isbn13 === "string" ? isbn13 : null,
        publishedDate: typeof vi.publishedDate === "string" ? vi.publishedDate : null,
        coverUrl:
          typeof vi.imageLinks?.thumbnail === "string"
            ? vi.imageLinks.thumbnail.replace("http://", "https://")
            : null,
      };
      // Ante ediciones duplicadas del mismo tomo, prioriza la que tenga ISBN.
      if (!prev || (!prev.isbn13 && entry.isbn13)) byVolume.set(hit.volume, entry);
    }
    return [...byVolume.values()].sort((a, b) => a.volumeNumber - b.volumeNumber);
  } catch {
    return [];
  }
}

/** Idioma dominante de las ediciones que los usuarios tienen de esta serie. */
async function dominantLanguage(seriesId: number): Promise<string | null> {
  const rows = await db
    .select({ language: schema.editions.language, n: sql<number>`count(*)` })
    .from(schema.editions)
    .innerJoin(schema.works, eq(schema.editions.workId, schema.works.id))
    .where(eq(schema.works.seriesId, seriesId))
    .groupBy(schema.editions.language)
    .orderBy(sql`count(*) desc`);
  return rows.find((r) => r.language)?.language ?? null;
}

/** Usuarios que tienen al menos un tomo de la serie (a quienes avisar). */
async function ownersOf(seriesId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: schema.userBooks.userId })
    .from(schema.userBooks)
    .innerJoin(schema.editions, eq(schema.userBooks.editionId, schema.editions.id))
    .innerJoin(schema.works, eq(schema.editions.workId, schema.works.id))
    .where(eq(schema.works.seriesId, seriesId));
  return rows.map((r) => r.userId);
}

function isFutureDate(published: string | null): boolean {
  if (!published) return false;
  const d = new Date(published.length === 4 ? `${published}-12-31` : published);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

/**
 * Refresca la ficha de una serie y devuelve cuántos tomos nuevos detectó.
 * En la PRIMERA pasada solo cataloga (avisar del backlist entero sería spam);
 * a partir de ahí, cada tomo nuevo genera un aviso a cada dueño.
 */
export async function refreshSeries(seriesId: number): Promise<{ newVolumes: ReleaseHit[] }> {
  const [ser] = await db.select().from(schema.series).where(eq(schema.series.id, seriesId)).limit(1);
  if (!ser) return { newVolumes: [] };
  const firstScan = !ser.checkedAt;

  const [ani, releases] = await Promise.all([
    // Sin ficha AniList previa se intenta; con ella, se re-consulta por si terminó.
    fetchAniListInfo(ser.name),
    scanGoogleBooksReleases(ser.name, await dominantLanguage(seriesId)),
  ]);

  const patch: Partial<typeof schema.series.$inferInsert> = { checkedAt: new Date() };
  if (ani) {
    patch.anilistId = ani.id;
    if (ani.status !== "unknown") patch.status = ani.status;
    if (!ser.totalVolumes && ani.totalVolumes) patch.totalVolumes = ani.totalVolumes;
    if (!ser.coverUrl && ani.coverUrl) patch.coverUrl = ani.coverUrl;
    if (!ser.description && ani.description) patch.description = ani.description;
    if (ani.isManga && ser.type === "saga") patch.type = "manga";
  }

  const newVolumes: ReleaseHit[] = [];
  for (const r of releases) {
    const inserted = await db
      .insert(schema.seriesReleases)
      .values({ seriesId, ...r })
      .onConflictDoNothing()
      .returning({ id: schema.seriesReleases.id });
    if (inserted.length > 0 && !firstScan) newVolumes.push(r);
  }

  const maxRelease = releases.at(-1);
  if (maxRelease && (!ser.latestVolume || maxRelease.volumeNumber > ser.latestVolume)) {
    patch.latestVolume = maxRelease.volumeNumber;
    patch.latestVolumeDate = maxRelease.publishedDate;
  }
  await db.update(schema.series).set(patch).where(eq(schema.series.id, seriesId));

  if (newVolumes.length > 0) {
    const owners = await ownersOf(seriesId);
    if (owners.length > 0) {
      const values = owners.flatMap((userId) =>
        newVolumes.map((v) => ({
          userId,
          type: isFutureDate(v.publishedDate) ? "upcoming_volume" : "new_volume",
          title: isFutureDate(v.publishedDate)
            ? `Próximo tomo de ${ser.name}`
            : `Nuevo tomo de ${ser.name}`,
          body: v.publishedDate ? `${v.title} · ${v.publishedDate}` : v.title,
          data: {
            seriesId,
            volume: v.volumeNumber,
            isbn13: v.isbn13,
            coverUrl: v.coverUrl,
          } as Record<string, unknown>,
        }))
      );
      await db.insert(schema.notifications).values(values);
    }
  }

  return { newVolumes };
}

/**
 * Pasada del radar sobre las series con dueño y ficha caducada (>20 h).
 * Secuencial y con pausa: respeta los límites de AniList (90/min) y GB.
 */
export async function refreshStaleSeries(limit = 30): Promise<number> {
  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const stale = await db
    .selectDistinct({ id: schema.series.id })
    .from(schema.series)
    .innerJoin(schema.works, eq(schema.works.seriesId, schema.series.id))
    .innerJoin(schema.editions, eq(schema.editions.workId, schema.works.id))
    .innerJoin(schema.userBooks, eq(schema.userBooks.editionId, schema.editions.id))
    .where(or(isNull(schema.series.checkedAt), lt(schema.series.checkedAt, cutoff)))
    .limit(limit);

  let refreshed = 0;
  for (const s of stale) {
    try {
      await refreshSeries(s.id);
      refreshed++;
    } catch {
      /* una serie fallida no detiene la pasada */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return refreshed;
}
