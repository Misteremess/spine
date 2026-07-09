#!/usr/bin/env node
/**
 * Fase 0 — Prueba de la cascada de resolución ISBN de Spine.
 *
 * Metodología (dos muestras para evitar circularidad):
 *  A) "wikidata"    : ISBNs 978-84 sacados de Wikidata (independiente de las
 *                     fuentes bajo prueba) -> mide la TASA DE RESOLUCIÓN real
 *                     de la cascada Open Library -> Google Books.
 *  B) "openlibrary" : ISBNs de editoriales de manga/cómic españolas vía
 *                     búsqueda de OL (sesgo: OL ya los conoce) -> mide la
 *                     CALIDAD DE CAMPOS de OL y la cobertura del fallback GB.
 *
 * Google Books: el acceso anónimo devuelve 429 (verificado 2026-07). El script
 * usa GOOGLE_BOOKS_API_KEY si existe; si GB devuelve 429 repetidamente, deja
 * de llamarlo y lo refleja en el informe.
 *
 * Uso: node isbn-cascade-test.mjs [collect|test|report|all]
 * Sin dependencias. Respeta ~1 req/s hacia Open Library y Wikidata.
 */

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, "out");
mkdirSync(OUT, { recursive: true });

const UA = "SpineFase0Test/0.1 (validacion tecnica; contacto: maximoduperez@gmail.com)";
const GB_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MANGA_PUBLISHERS = [
  "Ivrea",
  "Norma Editorial",
  "Planeta Cómic",
  "Planeta DeAgostini",
  "Panini Comics",
  "ECC Ediciones",
  "Milky Way Ediciones",
];

const WIKIDATA_TARGET = 120;
const MANGA_TARGET = 100;

async function fetchJson(url, { timeoutMs = 20000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: ctrl.signal });
    if (!res.ok) return { status: res.status, data: null };
    return { status: res.status, data: await res.json() };
  } catch (e) {
    return { status: 0, data: null, error: String(e) };
  } finally {
    clearTimeout(t);
  }
}

// ---------- 1. COLLECT ----------
async function collectWikidata() {
  const sparql = `SELECT ?isbn WHERE {
    ?item wdt:P212 ?isbn .
    FILTER(STRSTARTS(?isbn, "978-84"))
  } LIMIT ${WIKIDATA_TARGET + 40}`;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}`;
  const { status, data } = await fetchJson(url, {
    timeoutMs: 90000,
    headers: { Accept: "application/sparql-results+json" },
  });
  if (status !== 200 || !data) {
    console.log(`  [collect:wd] HTTP ${status} — sin datos`);
    return [];
  }
  const seen = new Set();
  const out = [];
  for (const b of data.results.bindings) {
    const isbn13 = b.isbn.value.replace(/-/g, "");
    if (isbn13.length !== 13 || !isbn13.startsWith("97884") || seen.has(isbn13)) continue;
    seen.add(isbn13);
    out.push({
      isbn13,
      source: "wikidata",
      kind: "general",
      publisher: null,
      label: null,
    });
    if (out.length >= WIKIDATA_TARGET) break;
  }
  console.log(`  [collect:wd] ${out.length} ISBNs de Wikidata`);
  return out;
}

async function collectOpenLibraryManga() {
  const perPub = Math.ceil(MANGA_TARGET / MANGA_PUBLISHERS.length);
  const seen = new Set();
  const out = [];
  for (const pub of MANGA_PUBLISHERS) {
    const q = encodeURIComponent(`publisher:"${pub}"`);
    const url = `https://openlibrary.org/search.json?q=${q}&fields=isbn,title&limit=60`;
    const { status, data } = await fetchJson(url, { timeoutMs: 45000 });
    await sleep(1100);
    if (status !== 200 || !data?.docs) {
      console.log(`  [collect:ol] ${pub}: HTTP ${status}`);
      continue;
    }
    let got = 0;
    for (const doc of data.docs) {
      if (got >= perPub) break;
      // doc.isbn mezcla ISBNs de todas las ediciones del work; el prefijo
      // 97884 garantiza edición española (aunque la editorial exacta pueda variar)
      const es = (doc.isbn ?? []).find((i) => i.length === 13 && i.startsWith("97884"));
      if (!es || seen.has(es)) continue;
      seen.add(es);
      out.push({ isbn13: es, source: "openlibrary", kind: "manga", publisher: pub, label: doc.title ?? null });
      got++;
    }
    console.log(`  [collect:ol] ${pub}: ${got} ISBNs`);
  }
  return out;
}

async function collect() {
  const wd = await collectWikidata();
  const ol = await collectOpenLibraryManga();
  const seen = new Set();
  const list = [...wd, ...ol].filter((x) => !seen.has(x.isbn13) && seen.add(x.isbn13));
  writeFileSync(join(OUT, "isbns.json"), JSON.stringify(list, null, 2));
  console.log(`[collect] total ${list.length} ISBNs (${wd.length} wikidata, ${ol.length} openlibrary/manga) -> out/isbns.json`);
}

// ---------- 2. TEST ----------
const fieldsFromOL = (ed) => ({
  title: !!ed.title,
  authors: (Array.isArray(ed.authors) && ed.authors.length > 0) || (Array.isArray(ed.contributions) && ed.contributions.length > 0),
  publisher: Array.isArray(ed.publishers) && ed.publishers.length > 0,
  pages: typeof ed.number_of_pages === "number" && ed.number_of_pages > 0,
  cover: Array.isArray(ed.covers) && ed.covers.length > 0,
});

const fieldsFromGB = (vi) => ({
  title: !!vi.title,
  authors: Array.isArray(vi.authors) && vi.authors.length > 0,
  publisher: !!vi.publisher,
  pages: typeof vi.pageCount === "number" && vi.pageCount > 0,
  cover: !!vi.imageLinks?.thumbnail,
});

const EMPTY = { title: false, authors: false, publisher: false, pages: false, cover: false };
const merge = (a, b) => Object.fromEntries(Object.keys(EMPTY).map((k) => [k, !!(a?.[k] || b?.[k])]));

async function test() {
  const inFile = process.env.ISBNS_FILE ?? "isbns.json";
  const outFile = process.env.RESULTS_FILE ?? "results.json";
  const list = JSON.parse(readFileSync(join(OUT, inFile), "utf8"));
  const results = [];
  let gb429 = 0;
  let gbDisabled = false;
  let i = 0;
  for (const item of list) {
    i++;
    const r = { ...item, ol: null, gb: null };

    const ol = await fetchJson(`https://openlibrary.org/isbn/${item.isbn13}.json`);
    if (ol.status === 200 && ol.data) {
      r.ol = fieldsFromOL(ol.data);
      // OL suele guardar autores (y a veces portada) a nivel de work, no de
      // edición: el resolver real sigue ese enlace, así que el test también.
      if ((!r.ol.authors || !r.ol.cover) && Array.isArray(ol.data.works) && ol.data.works[0]?.key) {
        await sleep(650);
        const wk = await fetchJson(`https://openlibrary.org${ol.data.works[0].key}.json`);
        if (wk.status === 200 && wk.data) {
          if (Array.isArray(wk.data.authors) && wk.data.authors.length > 0) r.ol.authors = true;
          if (Array.isArray(wk.data.covers) && wk.data.covers.length > 0) r.ol.cover = true;
        }
      }
    }
    r.olStatus = ol.status;
    await sleep(700);

    if (!gbDisabled) {
      const keyParam = GB_KEY ? `&key=${GB_KEY}` : "";
      const gb = await fetchJson(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${item.isbn13}&country=ES${keyParam}`
      );
      r.gbStatus = gb.status;
      if (gb.status === 429) {
        gb429++;
        if (gb429 >= 5) {
          gbDisabled = true;
          console.log("  [test] Google Books deshabilitado tras 5x 429 seguidos");
        }
      } else {
        gb429 = 0;
        const vi = gb.data?.items?.[0]?.volumeInfo;
        if (gb.status === 200 && vi) r.gb = fieldsFromGB(vi);
      }
      await sleep(350);
    } else {
      r.gbStatus = "skipped";
    }

    const casc = r.ol || r.gb ? merge(r.ol, r.gb) : null;
    r.resolved = !!(casc && casc.title && casc.authors);
    r.complete = !!(casc && casc.title && casc.authors && casc.pages && casc.cover);
    r.cascade = casc;
    results.push(r);
    if (i % 20 === 0) console.log(`  [test] ${i}/${list.length}…`);
  }
  writeFileSync(
    join(OUT, outFile),
    JSON.stringify({ gbAvailable: !gbDisabled && (GB_KEY !== "" || results.some((r) => typeof r.gbStatus === "number" && r.gbStatus === 200)), gbDisabled, usedKey: GB_KEY !== "", results }, null, 2)
  );
  console.log(`[test] ${results.length} ISBNs probados -> out/results.json (GB ${gbDisabled ? "BLOQUEADO" : "ok"}, key: ${GB_KEY ? "sí" : "no"})`);
}

// ---------- 3. REPORT ----------
const pct = (n, d) => (d === 0 ? "—" : `${((100 * n) / d).toFixed(1)}%`);

function report() {
  const { gbDisabled, usedKey, results: rs } = JSON.parse(readFileSync(join(OUT, "results.json"), "utf8"));
  const stat = (arr) => ({
    n: arr.length,
    olHit: arr.filter((r) => r.ol).length,
    gbHit: arr.filter((r) => r.gb).length,
    resolved: arr.filter((r) => r.resolved).length,
    complete: arr.filter((r) => r.complete).length,
    cover: arr.filter((r) => r.cascade?.cover).length,
    pages: arr.filter((r) => r.cascade?.pages).length,
    authors: arr.filter((r) => r.cascade?.authors).length,
  });
  const wd = rs.filter((r) => r.source === "wikidata");
  const olm = rs.filter((r) => r.source === "openlibrary");
  const sWd = stat(wd);
  const sOlm = stat(olm);

  const L = [];
  L.push(`# Fase 0 — Resultado de la prueba de cascada ISBN`);
  L.push(``);
  L.push(`Fecha: ${new Date().toISOString().slice(0, 10)} · Cascada probada: **Open Library → Google Books**.`);
  L.push(`Google Books: ${gbDisabled ? "**NO DISPONIBLE** (429 persistente, acceso anónimo bloqueado)" : usedKey ? "con API key" : "acceso anónimo"}.`);
  L.push(``);
  L.push(`"Resuelto" = título + autor (mínimo para ficha automática). "Completo" = + páginas + portada.`);
  L.push(``);
  L.push(`## Muestra A — Wikidata (${sWd.n} ISBNs 978-84, independiente → tasa de resolución real)`);
  L.push(``);
  L.push(`| Métrica | Valor | Umbral del plan |`);
  L.push(`|---|---|---|`);
  L.push(`| **Resueltos por la cascada** | **${pct(sWd.resolved, sWd.n)}** | ≥60% viable · ≥80% objetivo |`);
  L.push(`| Ficha completa | ${pct(sWd.complete, sWd.n)} | — |`);
  L.push(`| Open Library conoce el ISBN | ${pct(sWd.olHit, sWd.n)} | — |`);
  L.push(`| Google Books conoce el ISBN | ${gbDisabled ? "n/d (bloqueado)" : pct(sWd.gbHit, sWd.n)} | — |`);
  L.push(`| Con portada | ${pct(sWd.cover, sWd.n)} | — |`);
  L.push(`| Con nº páginas | ${pct(sWd.pages, sWd.n)} | — |`);
  L.push(``);
  L.push(`## Muestra B — Manga/cómic vía OL (${sOlm.n} ISBNs; OL los conoce por construcción → mide calidad de campos y fallback)`);
  L.push(``);
  L.push(`| Métrica | Valor |`);
  L.push(`|---|---|`);
  L.push(`| Ficha OL con título+autor | ${pct(sOlm.resolved, sOlm.n)} |`);
  L.push(`| Ficha completa (páginas+portada) | ${pct(sOlm.complete, sOlm.n)} |`);
  L.push(`| Con portada | ${pct(sOlm.cover, sOlm.n)} |`);
  L.push(`| Con nº páginas | ${pct(sOlm.pages, sOlm.n)} |`);
  L.push(`| Con autor | ${pct(sOlm.authors, sOlm.n)} |`);
  L.push(`| Google Books también lo tiene | ${gbDisabled ? "n/d (bloqueado)" : pct(sOlm.gbHit, sOlm.n)} |`);
  L.push(``);
  L.push(`### Por editorial (muestra B)`);
  L.push(``);
  L.push(`| Editorial | N | Título+autor | Completa | Portada |`);
  L.push(`|---|---|---|---|---|`);
  const byPub = new Map();
  for (const r of olm) {
    if (!byPub.has(r.publisher)) byPub.set(r.publisher, []);
    byPub.get(r.publisher).push(r);
  }
  for (const [k, arr] of [...byPub].sort((a, b) => b[1].length - a[1].length)) {
    const s = stat(arr);
    L.push(`| ${k} | ${s.n} | ${pct(s.resolved, s.n)} | ${pct(s.complete, s.n)} | ${pct(s.cover, s.n)} |`);
  }
  L.push(``);
  const unresolved = rs.filter((r) => !r.resolved);
  L.push(`## No resueltos (${unresolved.length} de ${rs.length})`);
  L.push(``);
  for (const r of unresolved.slice(0, 50)) {
    L.push(`- \`${r.isbn13}\` [${r.source}${r.publisher ? `/${r.publisher}` : ""}]${r.label ? ` — «${r.label}»` : ""}`);
  }
  if (unresolved.length > 50) L.push(`- … y ${unresolved.length - 50} más (ver results.json)`);
  L.push(``);
  L.push(`## Notas metodológicas`);
  L.push(``);
  L.push(`- La muestra A (Wikidata) sesga hacia libros "notables" (literatura, premios); un ISBN aleatorio de estantería real puede rendir peor. La muestra B cubre manga pero no puede medir la tasa de resolución de OL (circular). El contraste definitivo: escanear 20-30 libros físicos reales.`);
  L.push(`- Verificado: Google Books rechaza (429) el acceso anónimo desde esta red. Conclusión para el plan §13: **la API key gratuita de Google Books (1.000 req/día, sin facturación) es requisito desde el día 1**, no opcional.`);
  writeFileSync(join(OUT, "REPORT.md"), L.join("\n"));
  console.log(`[report] -> out/REPORT.md`);
  console.log(`\nRESUMEN muestra A (independiente): resueltos ${pct(sWd.resolved, sWd.n)} · OL ${pct(sWd.olHit, sWd.n)} · completos ${pct(sWd.complete, sWd.n)}`);
  console.log(`RESUMEN muestra B (manga): título+autor ${pct(sOlm.resolved, sOlm.n)} · portada ${pct(sOlm.cover, sOlm.n)} · completos ${pct(sOlm.complete, sOlm.n)}`);
}

// ---------- main ----------
const mode = process.argv[2] ?? "all";
if (mode === "collect" || mode === "all") await collect();
if (mode === "test" || mode === "all") await test();
if (mode === "report" || mode === "all") report();
