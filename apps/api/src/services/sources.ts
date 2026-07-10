/**
 * Clientes de las fuentes externas de la cascada (plan §13).
 * Lecciones de fase 0 aplicadas:
 *  - OL guarda autores/portada a nivel de work → seguir SIEMPRE el enlace.
 *  - Google Books responde de forma intermitente → reintentos con backoff.
 *  - GB exige API key (el acceso anónimo devuelve 429).
 */
import { createHash } from "node:crypto";
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

/** Imágenes "portada no disponible" de Google Books, por zoom. */
export const GB_PLACEHOLDER_MD5 = new Set([
  "d7c21c65fc861fc5128753e9e091b23c", // zoom=1
  "1fe98bd081e1f98c8193d52c74cf2ad2", // zoom=3
]);

/**
 * Cadena de portadas por ISBN, independiente de las fichas:
 * 1. Índice de covers de OL (HEAD con default=false).
 * 2. Portada directa de Google Books (existe para ~87% de los ISBNs
 *    españoles que ni siquiera resuelven metadatos; si no hay imagen
 *    devuelve un gif diminuto, de ahí el umbral de tamaño).
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
    /* probamos la siguiente fuente */
  }

  // zoom=3 da ~575px de ancho; si no existe a esa resolución, zoom=1 (128px).
  // GB devuelve una imagen genérica de "no disponible" (no un 404), así que
  // hay que descartarla por hash — el tamaño no vale, pesa 246 KB.
  for (const zoom of [3, 1]) {
    const gb = `https://books.google.com/books/content?vid=ISBN${isbn13}&printsec=frontcover&img=1&zoom=${zoom}`;
    try {
      const res = await fetch(gb, { redirect: "follow", signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > 1500 && !GB_PLACEHOLDER_MD5.has(createHash("md5").update(buf).digest("hex"))) {
        return gb;
      }
    } catch {
      /* probamos el siguiente zoom */
    }
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

export async function fromGoogleBooks(isbn13: string): Promise<SourceResult> {
  if (!env.GOOGLE_BOOKS_API_KEY) return null;
  // Sin `country`: fijarlo a ES filtraba resultados que GB SÍ tiene
  // (verificado: rescata el 58% de los ISBNs españoles no resueltos).
  // Si GB exige país por la IP, se reintenta una vez con country=ES.
  const base = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}&key=${env.GOOGLE_BOOKS_API_KEY}`;

  // GB a veces devuelve 200 con cero items para un ISBN que SÍ tiene
  // (intermitencia verificada en fase 0 y en producción): un reintento
  // corto recupera la mayoría de esos falsos negativos.
  let vi: Record<string, any> | undefined;
  for (let attempt = 0; attempt < 2 && !vi; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400));
    let { status, data } = await fetchJson(base);
    if (status === 403) ({ status, data } = await fetchJson(`${base}&country=ES`));
    if (status !== 200) return null;
    vi = (data as Record<string, any> | null)?.items?.[0]?.volumeInfo;
  }
  if (!vi) return null;

  return {
    source: "googlebooks",
    partial: {
      isbn13,
      title: typeof vi.title === "string" ? vi.title : undefined,
      subtitle: typeof vi.subtitle === "string" ? vi.subtitle : undefined,
      authors: Array.isArray(vi.authors) ? vi.authors : undefined,
      publisher: typeof vi.publisher === "string" ? vi.publisher : undefined,
      language: typeof vi.language === "string" ? vi.language : undefined,
      pages: typeof vi.pageCount === "number" && vi.pageCount > 0 ? vi.pageCount : undefined,
      publishedDate: typeof vi.publishedDate === "string" ? vi.publishedDate : undefined,
      coverUrl:
        typeof vi.imageLinks?.thumbnail === "string"
          ? vi.imageLinks.thumbnail.replace("http://", "https://")
          : undefined,
      description: typeof vi.description === "string" ? vi.description : undefined,
    },
  };
}
