/**
 * Clientes de las fuentes externas de la cascada (plan §13).
 * Lecciones de fase 0 aplicadas:
 *  - OL guarda autores/portada a nivel de work → seguir SIEMPRE el enlace.
 *  - Google Books responde de forma intermitente → reintentos con backoff.
 *  - GB exige API key (el acceso anónimo devuelve 429).
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

export async function fromGoogleBooks(isbn13: string): Promise<SourceResult> {
  if (!env.GOOGLE_BOOKS_API_KEY) return null;
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}` +
    `&country=ES&key=${env.GOOGLE_BOOKS_API_KEY}`;

  // GB a veces devuelve 200 con cero items para un ISBN que SÍ tiene
  // (intermitencia verificada en fase 0 y en producción): un reintento
  // corto recupera la mayoría de esos falsos negativos.
  let vi: Record<string, any> | undefined;
  for (let attempt = 0; attempt < 2 && !vi; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400));
    const { status, data } = await fetchJson(url);
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
