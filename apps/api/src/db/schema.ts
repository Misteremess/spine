/**
 * Plano CATÁLOGO (compartido entre usuarios, cacheado de fuentes externas).
 * Decisión clave del plan §12, validada en fase 0: Work (obra) ≠ Edition
 * (edición física con ISBN). El progreso de lectura apuntará a Work; el
 * ejemplar del usuario, a Edition.
 *
 * El plano USUARIO (biblioteca, lecturas, wishlist…) llega en el siguiente
 * hito, tras la autenticación.
 */
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const workType = pgEnum("work_type", ["book", "manga", "comic", "other"]);
export const seriesType = pgEnum("series_type", ["saga", "manga", "comic", "collection"]);
export const seriesStatus = pgEnum("series_status", ["ongoing", "completed", "unknown"]);

export const publishers = pgTable("publishers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  olKey: text("ol_key").unique(),
});

export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: seriesType("type").notNull().default("saga"),
  status: seriesStatus("status").notNull().default("unknown"),
  totalVolumes: integer("total_volumes"),
});

export const works = pgTable("works", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: workType("type").notNull().default("book"),
  description: text("description"),
  olKey: text("ol_key").unique(),
  seriesId: integer("series_id").references(() => series.id),
  seriesPosition: integer("series_position"),
});

export const workAuthors = pgTable(
  "work_authors",
  {
    workId: integer("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.workId, t.authorId] })]
);

export const editions = pgTable("editions", {
  id: serial("id").primaryKey(),
  workId: integer("work_id")
    .notNull()
    .references(() => works.id),
  isbn13: varchar("isbn13", { length: 13 }).notNull().unique(),
  isbn10: varchar("isbn10", { length: 10 }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  publisherId: integer("publisher_id").references(() => publishers.id),
  language: varchar("language", { length: 8 }),
  format: text("format"),
  pages: integer("pages"),
  publishedDate: text("published_date"),
  coverUrl: text("cover_url"),
  volumeNumber: integer("volume_number"),
  /** Procedencia de cada campo: { title: "openlibrary", pages: "googlebooks", … } */
  sources: jsonb("sources").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Métrica guía del plan §13 desde el día 1: % de escaneos resueltos,
 * por fuente. Decide si algún día compensa pagar ISBNdb.
 */
export const resolutionLog = pgTable("resolution_log", {
  id: serial("id").primaryKey(),
  isbn13: varchar("isbn13", { length: 13 }).notNull(),
  resolved: boolean("resolved").notNull(),
  source: text("source"),
  ms: integer("ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
