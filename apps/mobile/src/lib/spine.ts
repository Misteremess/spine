/**
 * Vista estantería (plan §6.3, la feature firma): cada libro es un lomo.
 * Sin procesar imágenes: el color sale de un hash del título (estable entre
 * sesiones) dentro de la paleta cálida, y el grosor es proporcional a las
 * páginas. Bonito, reproducible y coste cero.
 */
import { colors } from "./theme";

/** Paleta de lomos: tonos cálidos que combinan con "biblioteca de noche". */
const SPINE_PALETTE = [
  "#7A8B6F", // salvia
  "#C1553D", // arcilla
  "#B07E24", // ámbar profundo
  "#6E5A43", // cuero
  "#8A6D3B", // mostaza tostada
  "#5E6B57", // musgo
  "#A5533B", // teja
  "#4C5A63", // pizarra cálida
  "#836A55", // avellana
  "#9A6A4F", // caoba clara
] as const;

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function spineColor(seed: string): string {
  return SPINE_PALETTE[hash(seed) % SPINE_PALETTE.length]!;
}

/** Grosor del lomo (px) según páginas; libros sin páginas van finos. */
export function spineWidth(pages: number | null): number {
  if (!pages || pages <= 0) return 22;
  return Math.round(20 + Math.min(pages, 900) * (34 / 900));
}

/** Altura del lomo (px), ligera variación por seed para un anaquel vivo. */
export function spineHeight(seed: string): number {
  return 128 + (hash(seed + "h") % 26);
}

/** Texto legible (tinta o papel) sobre el color del lomo. */
export function spineInk(bg: string): string {
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? colors.tinta : colors.papel;
}
