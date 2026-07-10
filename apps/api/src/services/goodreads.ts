/**
 * Mapeo del export CSV de Goodreads (plan §5: el import es la palanca de
 * adquisición nº 1 — nadie cambia de app sin poder traerse sus datos).
 *
 * Columnas relevantes del export oficial: Title, Author, Additional Authors,
 * ISBN13 (formato ="9780441172719" para esquivar Excel), My Rating (0-5),
 * Publisher, Number of Pages, Year Published, Exclusive Shelf
 * (read | currently-reading | to-read), Date Read (yyyy/mm/dd), My Review,
 * Private Notes.
 */
import { toIsbn13 } from "@spine/shared";
import { parseCsv } from "./csv";

export type GoodreadsRow = {
  title: string;
  authors: string[];
  isbn13: string | null;
  /** Medias estrellas 1..10 (Goodreads puntúa 0-5). */
  rating: number | null;
  status: "finished" | "reading" | "pending";
  finishedAt: string | null;
  publisher: string | null;
  pages: number | null;
  publishedDate: string | null;
  notes: string | null;
};

const SHELF_STATUS: Record<string, GoodreadsRow["status"]> = {
  read: "finished",
  "currently-reading": "reading",
  "to-read": "pending",
};

/** Los ISBN vienen como ="9780..." o ="" — quitar el blindaje anti-Excel. */
function cleanIsbn(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9Xx]/g, "");
  return digits ? toIsbn13(digits) : null;
}

function cleanDate(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().replace(/\//g, "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

export function parseGoodreadsCsv(csv: string): GoodreadsRow[] {
  const rows = parseCsv(csv);
  const header = rows[0];
  if (!header) return [];
  const col = new Map(header.map((name, i) => [name.trim().toLowerCase(), i]));
  const get = (row: string[], name: string): string | undefined => {
    const i = col.get(name);
    return i === undefined ? undefined : row[i];
  };
  if (!col.has("title")) return [];

  const out: GoodreadsRow[] = [];
  for (const row of rows.slice(1)) {
    const title = get(row, "title")?.trim();
    if (!title) continue;

    const authors = [get(row, "author"), get(row, "additional authors")]
      .flatMap((a) => (a ?? "").split(","))
      .map((a) => a.trim())
      .filter(Boolean);

    const stars = Number(get(row, "my rating") ?? 0);
    const pages = Number(get(row, "number of pages") ?? 0);
    const year = get(row, "year published")?.trim();
    const notes = [get(row, "my review"), get(row, "private notes")]
      .map((n) => n?.trim())
      .filter(Boolean)
      .join("\n\n");

    out.push({
      title,
      authors,
      isbn13: cleanIsbn(get(row, "isbn13")) ?? cleanIsbn(get(row, "isbn")),
      rating: stars >= 1 && stars <= 5 ? stars * 2 : null,
      status: SHELF_STATUS[get(row, "exclusive shelf")?.trim() ?? ""] ?? "pending",
      finishedAt: cleanDate(get(row, "date read")),
      publisher: get(row, "publisher")?.trim() || null,
      pages: Number.isInteger(pages) && pages > 0 ? pages : null,
      publishedDate: year && /^\d{4}$/.test(year) ? year : null,
      notes: notes || null,
    });
  }
  return out;
}
