/** Utilidades ISBN compartidas entre API, web y móvil. */

/** Quita guiones, espacios y normaliza la X final de ISBN-10 a mayúscula. */
export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}

export function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(isbn[i]) * (10 - i);
  sum += isbn[9] === "X" ? 10 : Number(isbn[9]);
  return sum % 11 === 0;
}

export function isbn10To13(isbn10: string): string {
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return core + String(check);
}

/**
 * Normaliza cualquier entrada de usuario/escáner a ISBN-13 canónico.
 * Devuelve null si no es un ISBN válido.
 */
export function toIsbn13(raw: string): string | null {
  const s = normalizeIsbn(raw);
  if (isValidIsbn13(s)) return s;
  if (isValidIsbn10(s)) return isbn10To13(s);
  return null;
}
