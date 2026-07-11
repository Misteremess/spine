#!/usr/bin/env node
/**
 * Evalúa qué % de datos recupera cada fuente de metadatos por ISBN.
 * Compara OL, Google Books, ISBNdb y Hardcover sobre una muestra real
 * (estantería del usuario + manga ES). Sin dependencias.
 *
 * Uso:
 *   GOOGLE_BOOKS_API_KEY=... ISBNDB_KEY=... HARDCOVER_TOKEN=... \
 *     node tools/source-eval/probe.mjs [n]
 *   (n = tamaño de muestra, por defecto 60)
 *
 * Las fuentes sin credencial se saltan y se marcan como "(sin key)".
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, "..", "..");
const UA = "SpineSourceEval/0.1 (maximoduperez@gmail.com)";
const GB_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? "";
const ISBNDB_KEY = process.env.ISBNDB_KEY ?? "";
const HARDCOVER = process.env.HARDCOVER_TOKEN ?? "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const N = Number(process.argv[2]) || 60;
const FIELDS = ["title", "authors", "publisher", "pages", "date", "cover"];

function loadIsbns() {
  const read = (p) => {
    try { return JSON.parse(readFileSync(join(ROOT, p), "utf8")); } catch { return []; }
  };
  const shelf = read("tools/fase0-isbn-test/out/shelf-isbns.json").map((x) => x.isbn13);
  const manga = read("tools/fase0-isbn-test/out/isbns.json").map((x) => x.isbn13 || x.isbn || x);
  const all = [...new Set([...shelf, ...manga].filter((x) => /^\d{13}$/.test(x)))];
  return all.slice(0, N);
}

async function get(url, headers = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: ctrl.signal });
    return { ok: res.ok, status: res.status, json: res.ok ? await res.json().catch(() => null) : null };
  } catch (e) {
    return { ok: false, status: 0, json: null, error: String(e) };
  } finally { clearTimeout(t); }
}

const has = (v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== "");
const rec = (o) => ({
  title: has(o.title), authors: has(o.authors), publisher: has(o.publisher),
  pages: has(o.pages), date: has(o.date), cover: has(o.cover),
});

// ---- Fuentes ----
async function openLibrary(isbn) {
  const r = await get(`https://openlibrary.org/isbn/${isbn}.json`);
  if (!r.json) return null;
  const ed = r.json;
  let authors = ed.authors?.length ? ["?"] : [];
  let cover = Array.isArray(ed.covers) && ed.covers[0] ? `id/${ed.covers[0]}` : "";
  // Seguir edition -> work para autores/portada (validado en fase 0).
  const workKey = ed.works?.[0]?.key;
  if (workKey && (!authors.length || !cover)) {
    await sleep(200);
    const w = await get(`https://openlibrary.org${workKey}.json`);
    if (w.json) {
      if (!cover && w.json.covers?.[0]) cover = `id/${w.json.covers[0]}`;
      if (!authors.length && w.json.authors?.length) authors = ["?"];
    }
  }
  return rec({ title: ed.title, authors, publisher: ed.publishers?.[0], pages: ed.number_of_pages, date: ed.publish_date, cover });
}

async function googleBooks(isbn) {
  if (!GB_KEY) return "nokey";
  const r = await get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&country=ES&key=${GB_KEY}`);
  const vi = r.json?.items?.[0]?.volumeInfo;
  if (!vi) return null;
  return rec({ title: vi.title, authors: vi.authors, publisher: vi.publisher, pages: vi.pageCount, date: vi.publishedDate, cover: vi.imageLinks?.thumbnail });
}

async function isbndb(isbn) {
  if (!ISBNDB_KEY) return "nokey";
  const r = await get(`https://api2.isbndb.com/book/${isbn}`, { Authorization: ISBNDB_KEY });
  const b = r.json?.book;
  if (!b) return null;
  return rec({ title: b.title, authors: b.authors, publisher: b.publisher, pages: b.pages, date: b.date_published, cover: b.image });
}

async function hardcover(isbn) {
  if (!HARDCOVER) return "nokey";
  const query = `query($isbn:String!){ editions(where:{isbn_13:{_eq:$isbn}} limit:1){ title pages release_date image{url} publisher{name} contributions{author{name}} } }`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch("https://api.hardcover.app/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: HARDCOVER.startsWith("Bearer") ? HARDCOVER : `Bearer ${HARDCOVER}` },
      body: JSON.stringify({ query, variables: { isbn } }),
      signal: ctrl.signal,
    });
    const j = await res.json().catch(() => null);
    const ed = j?.data?.editions?.[0];
    if (!ed) return null;
    return rec({ title: ed.title, authors: ed.contributions?.map((c) => c.author?.name), publisher: ed.publisher?.name, pages: ed.pages, date: ed.release_date, cover: ed.image?.url });
  } catch { return null; } finally { clearTimeout(t); }
}

const SOURCES = { "Open Library": openLibrary, "Google Books": googleBooks, ISBNdb: isbndb, Hardcover: hardcover };

async function main() {
  const isbns = loadIsbns();
  console.log(`Muestra: ${isbns.length} ISBNs (estantería + manga ES)\n`);
  const totals = {};
  for (const name of Object.keys(SOURCES)) totals[name] = { known: 0, nokey: false, fields: Object.fromEntries(FIELDS.map((f) => [f, 0])) };

  for (const isbn of isbns) {
    for (const [name, fn] of Object.entries(SOURCES)) {
      const res = await fn(isbn);
      if (res === "nokey") { totals[name].nokey = true; continue; }
      if (res) { totals[name].known++; for (const f of FIELDS) if (res[f]) totals[name].fields[f]++; }
      await sleep(1100); // ~1 req/s por fuente
    }
  }

  const n = isbns.length;
  const pct = (x) => `${Math.round((x / n) * 100)}%`.padStart(4);
  console.log("Fuente".padEnd(14), "conoce", ...FIELDS.map((f) => f.padStart(8)));
  for (const [name, t] of Object.entries(totals)) {
    if (t.nokey) { console.log(name.padEnd(14), " (sin key — no evaluado)"); continue; }
    console.log(name.padEnd(14), pct(t.known).padStart(6), ...FIELDS.map((f) => pct(t.fields[f]).padStart(8)));
  }
  console.log("\n'conoce' = % de ISBNs con algún dato; el resto = % con ese campo (incluye portada).");
}
main();
