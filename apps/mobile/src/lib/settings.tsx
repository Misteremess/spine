/**
 * Ajustes de la app persistidos en el dispositivo: tamaño de texto
 * (accesibilidad) y modo Noche/Papel (tema claro/oscuro del prototipo).
 *
 * En RN 0.81 `Text`/`TextInput` son componentes de función, así que el
 * escalado NO se puede parchear en su render: se aplica con los wrappers de
 * `lib/ui.tsx`, que leen el factor de este contexto. El tema se aplica con
 * `useThemeColors()` / `useThemedStyles()` para que los estilos se
 * reconstruyan al cambiar de modo (StyleSheet.create congela los colores).
 */
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { PALETTES, type Palette, type ThemeName } from "./theme";

export type TextScale = "sm" | "md" | "lg" | "xl";

/** El usuario dijo que le gusta pequeño → "sm" (1.0) es el tamaño actual. */
export const SCALE_FACTOR: Record<TextScale, number> = {
  sm: 1.0,
  md: 1.15,
  lg: 1.32,
  xl: 1.5,
};

export const SCALE_LABEL: Record<TextScale, string> = {
  sm: "Pequeño",
  md: "Mediano",
  lg: "Grande",
  xl: "Muy grande",
};

export const THEME_LABEL: Record<ThemeName, string> = {
  noche: "● Noche",
  papel: "○ Papel",
};

const SCALE_KEY = "spine.textScale";
const THEME_KEY = "spine.theme";

type Ctx = {
  scale: TextScale;
  setScale: (s: TextScale) => void;
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  colors: Palette;
  factor: number;
  ready: boolean;
};
const SettingsContext = createContext<Ctx>({
  scale: "sm",
  setScale: () => {},
  theme: "noche",
  setTheme: () => {},
  colors: PALETTES.noche,
  factor: 1,
  ready: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<TextScale>("sm");
  const [theme, setThemeState] = useState<ThemeName>("noche");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const [s, t] = await Promise.all([
        SecureStore.getItemAsync(SCALE_KEY).catch(() => null),
        SecureStore.getItemAsync(THEME_KEY).catch(() => null),
      ]);
      if (s && s in SCALE_FACTOR) setScaleState(s as TextScale);
      if (t === "noche" || t === "papel") setThemeState(t);
      setReady(true);
    })();
  }, []);

  function setScale(s: TextScale) {
    setScaleState(s);
    void SecureStore.setItemAsync(SCALE_KEY, s);
  }
  function setTheme(t: ThemeName) {
    setThemeState(t);
    void SecureStore.setItemAsync(THEME_KEY, t);
  }

  const value = useMemo<Ctx>(
    () => ({ scale, setScale, theme, setTheme, colors: PALETTES[theme], factor: SCALE_FACTOR[scale], ready }),
    [scale, theme, ready]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

/** Paleta del tema actual (Noche/Papel). Úsala en pantallas para que repinten. */
export const useThemeColors = (): Palette => useContext(SettingsContext).colors;

/** Factor de escala de texto actual (lo consumen los wrappers de lib/ui). */
export const useScaleFactor = (): number => useContext(SettingsContext).factor;

/**
 * Construye una hoja de estilos a partir del tema actual y la memoiza por
 * paleta. `factory` recibe la paleta viva, así que basta con renombrar el
 * `StyleSheet.create({...})` de cada pantalla a `(colors) => StyleSheet.create({...})`.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: Palette) => T
): T {
  const colors = useThemeColors();
  return useMemo(() => factory(colors), [factory, colors]);
}
