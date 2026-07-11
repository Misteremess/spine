/** Tokens "biblioteca de noche" — mismos valores que design/prototipo.html */

/** Identidad tipográfica: Fraunces para títulos, Inter para todo lo demás. */
export const fonts = {
  serif: "Fraunces_600SemiBold",
  serifMedium: "Fraunces_500Medium",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
} as const;

export type Palette = {
  tinta: string;
  tinta2: string;
  tinta3: string;
  papel: string;
  marfil: string;
  mut: string;
  ambar: string;
  ambarDeep: string;
  salvia: string;
  arcilla: string;
  inkOnAccent: string;
};

/** Modo Noche (por defecto): la "biblioteca de noche" del prototipo. */
export const NOCHE: Palette = {
  tinta: "#14120F",
  tinta2: "#1D1A15",
  tinta3: "#2A251C",
  papel: "#F6F1E7",
  marfil: "#EDE5D4",
  mut: "#9A8F7A",
  ambar: "#D9A441",
  ambarDeep: "#B07E24",
  salvia: "#7A8B6F",
  arcilla: "#C1553D",
  inkOnAccent: "#1B1610",
};

/** Modo Papel (claro): mismos tokens invertidos con intención (prototipo §Papel). */
export const PAPEL: Palette = {
  tinta: "#F7F2E8",
  tinta2: "#FFFDF6",
  tinta3: "#E5DBC5",
  papel: "#201A11",
  marfil: "#4A3F2B",
  mut: "#7A6E58",
  ambar: "#BE8A2C",
  ambarDeep: "#8F6314",
  salvia: "#5F7052",
  arcilla: "#AE4A33",
  inkOnAccent: "#1B1610",
};

export type ThemeName = "noche" | "papel";

export const PALETTES: Record<ThemeName, Palette> = { noche: NOCHE, papel: PAPEL };

/**
 * Paleta por defecto para código que aún no consume el tema por contexto
 * (p. ej. helpers fuera de componentes). En pantallas usa `useThemeColors()`
 * para que el modo Papel/Noche repinte de verdad.
 */
export const colors = NOCHE;
