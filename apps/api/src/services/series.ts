/**
 * Detección de serie y número de tomo (plan §5.5).
 * Dos entradas posibles: el campo `series` de Open Library cuando existe
 * ("Berserk #13", "Berserk (13)"), y si no, heurística sobre el título con
 * los formatos habituales de las editoriales españolas de manga/cómic
 * ("Berserk 23", "One Piece nº 05", "Naruto, Vol. 5", "Dragon Ball, tomo 12").
 */

export type SeriesHit = { name: string; volume: number | null };

/**
 * Clave de agrupación: la misma serie llega con grafías distintas según la
 * fuente ("SPY×FAMILY", "Spy x Family"). Minúsculas, ×→x, sin acentos,
 * espacios colapsados.
 */
export function seriesNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/×/g, " x ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Limpia el nombre: puntuación colgante, espacios dobles. */
function cleanName(raw: string): string {
  return raw.replace(/[\s,.:;\-–—]+$/u, "").replace(/\s{2,}/g, " ").trim();
}

/** Marcadores explícitos de tomo: vol., volumen, tomo, nº, núm., no., t. */
const MARKER =
  /^(.+?)[,.:;]?\s*(?:vol(?:umen|ume)?\.?|tomo|t\.|n[º°]|núm\.?|no\.)\s*(\d{1,3})\b/iu;

/** Almohadilla: "Berserk #13". */
const HASH = /^(.+?)\s*#(\d{1,3})\b/u;

/**
 * Número suelto al final: "Berserk 23", "One Piece 105". Es el formato
 * más común del manga en España, pero también el más ambiguo ("Catch 22"),
 * así que se limita a números razonables de tomo.
 */
const TRAILING = /^(.+?)[,:]?\s+(\d{1,3})$/u;
const MAX_TRAILING_VOLUME = 150;

export function extractFromTitle(title: string): SeriesHit | null {
  for (const re of [MARKER, HASH]) {
    const m = title.match(re);
    if (m?.[1] && m[2]) {
      const name = cleanName(m[1]);
      if (name) return { name, volume: Number(m[2]) };
    }
  }

  const m = title.match(TRAILING);
  if (m?.[1] && m[2]) {
    const volume = Number(m[2]);
    const name = cleanName(m[1]);
    if (name.length >= 3 && volume >= 1 && volume <= MAX_TRAILING_VOLUME) {
      return { name, volume };
    }
  }

  return null;
}

/** Entrada del campo `series` de OL: "Berserk #13", "Berserk (13)" o solo "Berserk". */
export function parseOlSeries(entry: string): SeriesHit | null {
  const m = entry.match(/^(.+?)\s*(?:#|\()\s*(\d{1,4})\)?\s*$/u);
  if (m?.[1] && m[2]) return { name: cleanName(m[1]), volume: Number(m[2]) };
  const name = cleanName(entry);
  return name ? { name, volume: null } : null;
}

/**
 * Combina ambas fuentes: la serie declarada por OL manda sobre la heurística
 * del título; el número de tomo se completa con el título si a OL le falta.
 */
export function extractSeries(title: string, olSeries?: string[]): SeriesHit | null {
  const fromTitle = extractFromTitle(title);
  const fromOl = olSeries?.[0] ? parseOlSeries(olSeries[0]) : null;
  if (fromOl) return { name: fromOl.name, volume: fromOl.volume ?? fromTitle?.volume ?? null };
  return fromTitle;
}
