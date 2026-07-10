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
  unique,
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
  /** Clave normalizada para agrupar grafías distintas de la misma serie. */
  nameKey: text("name_key").notNull().unique(),
  type: seriesType("type").notNull().default("saga"),
  status: seriesStatus("status").notNull().default("unknown"),
  totalVolumes: integer("total_volumes"),
  /* Ficha enriquecida (AniList + radar de Google Books). */
  anilistId: integer("anilist_id"),
  coverUrl: text("cover_url"),
  description: text("description"),
  /** Último tomo detectado como publicado (radar de novedades). */
  latestVolume: integer("latest_volume"),
  latestVolumeDate: text("latest_volume_date"),
  /** Última pasada del radar; null = nunca comprobada. */
  checkedAt: timestamp("checked_at"),
});

/** Tomos detectados por el radar de novedades (uno por serie+número). */
export const seriesReleases = pgTable(
  "series_releases",
  {
    id: serial("id").primaryKey(),
    seriesId: integer("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    volumeNumber: integer("volume_number").notNull(),
    title: text("title").notNull(),
    isbn13: varchar("isbn13", { length: 13 }),
    publishedDate: text("published_date"),
    coverUrl: text("cover_url"),
    discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.seriesId, t.volumeNumber)]
);

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

/* ============================================================
 * AUTENTICACIÓN (tablas de Better Auth, nombres de campo canónicos)
 * ============================================================ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ============================================================
 * PLANO USUARIO (plan §12): el ejemplar, la lectura, la wishlist.
 * Ejemplar ≠ lectura: prestado o wishlist nunca son estados de lectura.
 * ============================================================ */

export const readingStatus = pgEnum("reading_status", [
  "pending",
  "reading",
  "paused",
  "finished",
  "abandoned",
]);

/** Tu ejemplar físico/digital. editionId nullable = libro añadido a mano. */
export const userBooks = pgTable("user_books", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  editionId: integer("edition_id").references(() => editions.id),
  /** Solo para libros manuales sin edición de catálogo. */
  customTitle: text("custom_title"),
  customAuthors: text("custom_authors"),
  /** ISBN escaneado que la cascada no resolvió: se guarda para reintentar más adelante. */
  customIsbn13: varchar("custom_isbn13", { length: 13 }),
  format: text("format"),
  purchaseDate: text("purchase_date"),
  purchasePriceCents: integer("purchase_price_cents"),
  condition: text("condition"),
  location: text("location"),
  favorite: boolean("favorite").notNull().default(false),
  /** Valoración del usuario en medias estrellas: 1..10. */
  rating: integer("rating"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Una lectura del ejemplar. N por libro (relecturas). */
export const readings = pgTable("readings", {
  id: serial("id").primaryKey(),
  userBookId: integer("user_book_id")
    .notNull()
    .references(() => userBooks.id, { onDelete: "cascade" }),
  status: readingStatus("status").notNull().default("pending"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const progressEntries = pgTable("progress_entries", {
  id: serial("id").primaryKey(),
  readingId: integer("reading_id")
    .notNull()
    .references(() => readings.id, { onDelete: "cascade" }),
  page: integer("page"),
  percent: integer("percent"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Reseña pública de una OBRA (no de la edición: la reseña de Dune vale
 * para cualquier ISBN). Una por usuario y obra; estrellas en medias: 1..10.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workId: integer("work_id")
      .notNull()
      .references(() => works.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    text: text("text"),
    spoilers: boolean("spoilers").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.workId)]
);

/* ============================================================
 * CLUBS DE LECTURA: grupo privado con código de invitación,
 * libro actual y un hilo de debate.
 * ============================================================ */

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  inviteCode: varchar("invite_code", { length: 8 }).notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  currentWorkId: integer("current_work_id").references(() => works.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clubMembers = pgTable(
  "club_members",
  {
    clubId: integer("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clubId, t.userId] })]
);

export const clubPosts = pgTable("club_posts", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Avisos in-app: nuevos tomos de tus sagas, actividad de tus clubs… */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** new_volume · upcoming_volume · club_post … */
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  /** Contexto para navegar al tocar: { seriesId, volume, isbn13… } */
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  editionId: integer("edition_id").references(() => editions.id),
  /** Texto libre cuando aún no existe en el catálogo. */
  title: text("title"),
  /** 1 = la quiero ya · 2 = normal · 3 = algún día. */
  priority: integer("priority").notNull().default(2),
  targetPriceCents: integer("target_price_cents"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
