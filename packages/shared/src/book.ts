import { z } from "zod";

/** Metadatos unificados de una edición, tal y como los devuelve el resolver. */
export const BookMetadataSchema = z.object({
  isbn13: z.string().length(13),
  title: z.string().min(1),
  subtitle: z.string().nullish(),
  authors: z.array(z.string()).default([]),
  publisher: z.string().nullish(),
  language: z.string().nullish(),
  pages: z.number().int().positive().nullish(),
  publishedDate: z.string().nullish(),
  coverUrl: z.string().url().nullish(),
  description: z.string().nullish(),
  /** Serie detectada (campo series de OL o heurística sobre el título). */
  series: z.string().nullish(),
  seriesVolume: z.number().int().positive().nullish(),
});

export type BookMetadata = z.infer<typeof BookMetadataSchema>;

/** Respuesta del endpoint de resolución. */
export const ResolveResponseSchema = z.object({
  metadata: BookMetadataSchema,
  /** De dónde salió el resultado final. */
  source: z.enum(["catalog", "openlibrary", "googlebooks", "merged"]),
  /** true si vino de nuestro catálogo sin tocar APIs externas. */
  cached: z.boolean(),
});

export type ResolveResponse = z.infer<typeof ResolveResponseSchema>;
