/**
 * Vista estantería (plan §6.3): color del lomo desde un hash del título y
 * grosor proporcional a las páginas. Sin procesar imágenes, coste cero.
 * Mismos valores que la app móvil (apps/mobile/src/lib/spine.ts).
 */
const SPINE_PALETTE = [
  "#7A8B6F",
  "#C1553D",
  "#B07E24",
  "#6E5A43",
  "#8A6D3B",
  "#5E6B57",
  "#A5533B",
  "#4C5A63",
  "#836A55",
  "#9A6A4F",
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function spineColor(seed: string): string {
  return SPINE_PALETTE[hash(seed) % SPINE_PALETTE.length] ?? SPINE_PALETTE[0]!;
}

export function spineWidth(pages: number | null): number {
  if (!pages || pages <= 0) return 26;
  return Math.round(24 + Math.min(pages, 900) * (44 / 900));
}

export function spineHeight(seed: string): number {
  return 150 + (hash(seed + "h") % 34);
}

export function spineInk(bg: string): string {
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#14120f" : "#f6f1e7";
}
