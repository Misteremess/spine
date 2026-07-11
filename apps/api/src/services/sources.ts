/**
 * Clientes de las fuentes externas de la cascada (plan §13).
 * Fuentes activas: ISBNdb (mejor cobertura ES, de pago), OpenLibrary y
 * Hardcover (gratis). Google Books retirado por riesgo de coste/cuota.
 * Lección de fase 0: OL guarda autores/portada a nivel de work → seguir
 * SIEMPRE el enlace edition→work.
 */
import type { BookMetadata } from "@spine/shared";
import { env } from "../env";
import { extractSeries } from "./series";

const UA = "Spine/0.1 (+https://github.com/Misteremess/spine)";

async function fetchJson(
  url: string,
  { timeoutMs = 8000, retries = 2 }: { timeoutMs?: number; retries?: number } = {}
): Promise<{ status: number; data: unknown }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return { status: res.status, data: null };
      return { status: res.status, data: await res.json() };
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

/** Campos parciales + procedencia por campo. */
export type SourceResult = { partial: Partial<BookMetadata>; source: string } | null;

export async function fromOpenLibrary(isbn13: string): Promise<SourceResult> {
  const { status, data } = await fetchJson(`https://openlibrary.org/isbn/${isbn13}.json`);
  if (status !== 200 || data === null || typeof data !== "object") return null;
  const ed = data as Record<string, any>;

  const partial: Partial<BookMetadata> = {
    isbn13,
    title: typeof ed.title === "string" ? ed.title : undefined,
    subtitle: typeof ed.subtitle === "string" ? ed.subtitle : undefined,
    publisher: Array.isArray(ed.publishers) ? ed.publishers[0] : undefined,
    pages: typeof ed.number_of_pages === "number" ? ed.number_of_pages : undefined,
    publishedDate: typeof ed.publish_date === "string" ? ed.publish_date : undefined,
    coverUrl: Array.isArray(ed.covers) && ed.covers[0]
      ? `https://covers.openlibrary.org/b/id/${ed.covers[0]}-L.jpg`
      : undefined,
  };

  // Autores a nivel de edición…
  let authorKeys: string[] = Array.isArray(ed.authors)
    ? ed.authors.map((a: any) => a?.key).filter(Boolean)
    : [];

  // …y si faltan datos, seguir el enlace al work (hallazgo clave de fase 0).
  const workKey: string | undefined = ed.works?.[0]?.key;
  if (workKey && (authorKeys.length === 0 || !partial.coverUrl || !partial.description)) {
    try {
      const wk = await fetchJson(`https://openlibrary.org${workKey}.json`);
      if (wk.status === 200 && wk.data && typeof wk.data === "object") {
        const w = wk.data as Record<string, any>;
        if (authorKeys.length === 0 && Array.isArray(w.authors)) {
          authorKeys = w.authors.map((a: any) => a?.author?.key).filter(Boolean);
        }
        if (!partial.coverUrl && Array.isArray(w.covers) && w.covers[0]) {
          partial.coverUrl = `https://covers.openlibrary.org/b/id/${w.covers[0]}-L.jpg`;
        }
        const desc = typeof w.description === "string" ? w.description : w.description?.value;
        if (typeof desc === "string") partial.description = desc;
      }
    } catch {
      /* el work es un extra: si falla seguimos con lo que hay */
    }
  }

  // Nombres de autores (máximo 4 peticiones).
  const names: string[] = [];
  for (const key of authorKeys.slice(0, 4)) {
    try {
      const a = await fetchJson(`https://openlibrary.org${key}.json`);
      const name = (a.data as Record<string, any> | null)?.name;
      if (typeof name === "string") names.push(name);
    } catch {
      /* autor individual no bloquea */
    }
  }
  if (names.length > 0) partial.authors = names;

  // Serie: OL la declara a veces en la edición; si no, heurística del título.
  if (partial.title) {
    const olSeries = Array.isArray(ed.series)
      ? ed.series.filter((s: unknown): s is string => typeof s === "string")
      : undefined;
    const hit = extractSeries(partial.title, olSeries);
    if (hit) {
      partial.series = hit.name;
      partial.seriesVolume = hit.volume;
    }
  }

  return { partial, source: "openlibrary" };
}

/**
 * Portada por ISBN, independiente de las fichas: índice de covers de Open
 * Library (gratis). ISBNdb ya cubre el ~98% de portadas en la cascada, así
 * que esto es solo la red de seguridad para lo que falte. (El fallback de
 * imágenes de Google Books se retiró: nada de Google.)
 */
export async function coverByIsbn(isbn13: string): Promise<string | null> {
  const ol = `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg?default=false`;
  try {
    const res = await fetch(ol, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return ol;
  } catch {
    /* sin portada disponible */
  }
  return null;
}

/**
 * Último recurso de metadatos: el buscador de OL a veces conoce ISBNs que
 * el endpoint /isbn/ no tiene enlazados (rescata ~10% de los fallos).
 */
export async function fromOpenLibrarySearch(isbn13: string): Promise<SourceResult> {
  const url =
    `https://openlibrary.org/search.json?q=isbn:${isbn13}` +
    `&fields=title,author_name,cover_i,number_of_pages_median,publisher,first_publish_year&limit=1`;
  const { status, data } = await fetchJson(url);
  if (status !== 200 || !data || typeof data !== "object") return null;
  const doc = (data as Record<string, any>).docs?.[0];
  if (!doc || typeof doc.title !== "string") return null;

  const partial: Partial<BookMetadata> = {
    isbn13,
    title: doc.title,
    authors: Array.isArray(doc.author_name) ? doc.author_name.slice(0, 4) : undefined,
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
    pages:
      typeof doc.number_of_pages_median === "number" && doc.number_of_pages_median > 0
        ? doc.number_of_pages_median
        : undefined,
    publishedDate:
      typeof doc.first_publish_year === "number" ? String(doc.first_publish_year) : undefined,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
  };
  const hit = extractSeries(doc.title);
  if (hit) {
    partial.series = hit.name;
    partial.seriesVolume = hit.volume;
  }
  return { partial, source: "openlibrary-search" };
}

/**
 * ISBNdb (api2.isbndb.com): la base comercial con mejor cobertura del ISBN
 * español (recibe el feed de la industria). De pago (~15 $/mes) — el
 * adaptador queda listo pero desactivado hasta que ISBNDB_KEY tenga valor.
 * Límite del plan básico: 1 petición/segundo.
 */
export async function fromIsbnDb(isbn13: string): Promise<SourceResult> {
  if (!env.ISBNDB_KEY) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api2.isbndb.com/book/${isbn13}`, {
      headers: { "User-Agent": UA, Authorization: env.ISBNDB_KEY },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const book = ((await res.json()) as Record<string, any>)?.book;
    if (!book || typeof book.title !== "string") return null;

    const partial: Partial<BookMetadata> = {
      isbn13,
      title: book.title,
      authors: Array.isArray(book.authors) ? book.authors.slice(0, 4) : undefined,
      publisher: typeof book.publisher === "string" ? book.publisher : undefined,
      language: typeof book.language === "string" ? book.language.slice(0, 8) : undefined,
      pages: typeof book.pages === "number" && book.pages > 0 ? book.pages : undefined,
      publishedDate:
        typeof book.date_published === "string" ? book.date_published : undefined,
      coverUrl: typeof book.image === "string" ? book.image : undefined,
      description:
        typeof book.synopsis === "string"
          ? book.synopsis.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
          : undefined,
    };
    const hit = extractSeries(book.title);
    if (hit) {
      partial.series = hit.name;
      partial.seriesVolume = hit.volume;
    }
    return { partial, source: "isbndb" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Hardcover (gratuito, GraphQL): metadatos cuidados por bibliotecarios,
 * especialmente buenos en series y sinopsis. Requiere token gratuito del
 * perfil de hardcover.app en HARDCOVER_TOKEN.
 */
export async function fromHardcover(isbn13: string): Promise<SourceResult> {
  if (!env.HARDCOVER_TOKEN) return null;
  const query = `query($isbn: String!) {
    editions(where: {isbn_13: {_eq: $isbn}}, limit: 1) {
      title subtitle pages release_date
      image { url }
      publisher { name }
      language { code2 }
      cached_contributors
      book {
        description
        book_series { position series { name books_count } }
      }
    }
  }`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch("https://api.hardcover.app/v1/graphql", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.HARDCOVER_TOKEN}`,
      },
      body: JSON.stringify({ query, variables: { isbn: isbn13 } }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const ed = ((await res.json()) as Record<string, any>)?.data?.editions?.[0];
    if (!ed || typeof ed.title !== "string") return null;

    // cached_contributors: [{ author: { name }, contribution }] — filtrar
    // traductores/ilustradores (contribution !== null) para quedarnos con autores.
    const authors = Array.isArray(ed.cached_contributors)
      ? ed.cached_contributors
          .filter((c: any) => !c?.contribution)
          .map((c: any) => c?.author?.name)
          .filter((n: unknown): n is string => typeof n === "string")
          .slice(0, 4)
      : [];

    const partial: Partial<BookMetadata> = {
      isbn13,
      title: ed.title,
      subtitle: typeof ed.subtitle === "string" ? ed.subtitle : undefined,
      authors: authors.length > 0 ? authors : undefined,
      publisher: typeof ed.publisher?.name === "string" ? ed.publisher.name : undefined,
      language: typeof ed.language?.code2 === "string" ? ed.language.code2 : undefined,
      pages: typeof ed.pages === "number" && ed.pages > 0 ? ed.pages : undefined,
      publishedDate: typeof ed.release_date === "string" ? ed.release_date : undefined,
      coverUrl: typeof ed.image?.url === "string" ? ed.image.url : undefined,
      description: typeof ed.book?.description === "string" ? ed.book.description : undefined,
    };
    const bs = ed.book?.book_series?.[0];
    if (typeof bs?.series?.name === "string") {
      partial.series = bs.series.name;
      if (typeof bs.position === "number" && bs.position >= 1 && Number.isInteger(bs.position)) {
        partial.seriesVolume = bs.position;
      }
    } else if (partial.title) {
      const hit = extractSeries(partial.title);
      if (hit) {
        partial.series = hit.name;
        partial.seriesVolume = hit.volume;
      }
    }
    return { partial, source: "hardcover" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Un resultado de búsqueda con datos reales para elegir a mano. */
export type SearchCandidate = {
  isbn13: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  pages: number | null;
  coverUrl: string | null;
};

/**
 * Búsqueda por texto libre (título, autor…) para wishlist y alta manual:
 * devuelve candidatos reales entre los que elegir en vez de teclear a mano.
 * ISBNdb primero (mejor catálogo ES); OpenLibrary de reserva gratis. Sin
 * Google. Prioriza los que traen ISBN-13 (resolubles a ficha completa).
 */
export async function searchBooks(query: string, limit = 12): Promise<SearchCandidate[]> {
  const q = query.trim();
  if (!q) return [];
  const fromIsbndb = env.ISBNDB_KEY ? await searchIsbnDb(q, limit).catch(() => []) : [];
  const out = fromIsbndb.length ? fromIsbndb : await searchOpenLibrary(q, limit).catch(() => []);
  // Los que tienen ISBN primero: se pueden resolver a ficha completa.
  return out.sort((a, b) => (a.isbn13 ? 0 : 1) - (b.isbn13 ? 0 : 1));
}

/** Búsqueda en ISBNdb (api2.isbndb.com/books/:query). */
async function searchIsbnDb(query: string, limit: number): Promise<SearchCandidate[]> {
  const url = `https://api2.isbndb.com/books/${encodeURIComponent(query)}?pageSize=${Math.min(20, limit * 2)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Authorization: env.ISBNDB_KEY } });
    if (!res.ok) return [];
    const books = ((await res.json()) as Record<string, any>)?.books;
    if (!Array.isArray(books)) return [];
    const out: SearchCandidate[] = [];
    const seen = new Set<string>();
    for (const b of books) {
      if (typeof b?.title !== "string") continue;
      const key = `${b.title}|${(b.authors ?? []).join(",")}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        isbn13: typeof b.isbn13 === "string" ? b.isbn13 : null,
        title: b.title,
        authors: Array.isArray(b.authors) ? b.authors.slice(0, 3) : [],
        publisher: typeof b.publisher === "string" ? b.publisher : null,
        publishedDate: typeof b.date_published === "string" ? b.date_published : null,
        pages: typeof b.pages === "number" && b.pages > 0 ? b.pages : null,
        coverUrl: typeof b.image === "string" ? b.image : null,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/** Búsqueda en Open Library (gratis) como reserva. */
async function searchOpenLibrary(query: string, limit: number): Promise<SearchCandidate[]> {
  const url =
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}` +
    `&limit=${Math.min(20, limit * 2)}&fields=title,author_name,isbn,publisher,first_publish_year,number_of_pages_median,cover_i`;
  const { data } = await fetchJson(url, { retries: 1 });
  const docs = (data as Record<string, any> | null)?.docs;
  if (!Array.isArray(docs)) return [];
  const out: SearchCandidate[] = [];
  const seen = new Set<string>();
  for (const d of docs) {
    if (typeof d?.title !== "string") continue;
    const key = `${d.title}|${(d.author_name ?? []).join(",")}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const isbn13 = Array.isArray(d.isbn) ? d.isbn.find((x: string) => /^\d{13}$/.test(x)) ?? null : null;
    out.push({
      isbn13,
      title: d.title,
      authors: Array.isArray(d.author_name) ? d.author_name.slice(0, 3) : [],
      publisher: Array.isArray(d.publisher) ? d.publisher[0] ?? null : null,
      publishedDate: d.first_publish_year ? String(d.first_publish_year) : null,
      pages: typeof d.number_of_pages_median === "number" ? d.number_of_pages_median : null,
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}
