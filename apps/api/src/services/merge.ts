import type { BookMetadata } from "@spine/shared";
import type { SourceResult } from "./sources";

const FIELDS: (keyof BookMetadata)[] = [
  "title",
  "subtitle",
  "authors",
  "publisher",
  "language",
  "pages",
  "publishedDate",
  "coverUrl",
  "description",
];

export type Merged = {
  metadata: BookMetadata;
  /** Procedencia campo a campo, para el catálogo y para depurar calidad. */
  sources: Record<string, string>;
};

/**
 * Fusiona resultados por campo en orden de prioridad (el primero que tenga
 * valor gana). Devuelve null si ni siquiera hay título — sin título no hay
 * ficha automática que valga.
 */
export function mergeResults(isbn13: string, results: SourceResult[]): Merged | null {
  const metadata: Record<string, unknown> = { isbn13, authors: [] };
  const sources: Record<string, string> = {};

  for (const r of results) {
    if (!r) continue;
    for (const f of FIELDS) {
      const v = r.partial[f];
      const empty = v === undefined || v === null || (Array.isArray(v) && v.length === 0);
      const taken = metadata[f] !== undefined && !(Array.isArray(metadata[f]) && (metadata[f] as unknown[]).length === 0);
      if (!empty && !taken) {
        metadata[f] = v;
        sources[f] = r.source;
      }
    }
  }

  if (typeof metadata.title !== "string" || metadata.title.length === 0) return null;
  return { metadata: metadata as BookMetadata, sources };
}
