/**
 * Ajustes de la app persistidos en el dispositivo. De momento: el tamaño
 * del texto (accesibilidad). El escalado se aplica de forma global
 * parcheando el render de Text/TextInput una sola vez: cada tamaño de
 * fuente literal se multiplica por el factor elegido. Al cambiarlo se
 * remonta el árbol (key en el layout raíz) para que el nuevo factor
 * afecte a todo sin tocar pantalla por pantalla.
 */
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";

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

const KEY = "spine.textScale";

// Factor vivo que lee el render parcheado; se actualiza al cambiar el ajuste.
let currentFactor = 1;

function patch(Comp: any) {
  if (!Comp || Comp.__scalePatched) return;
  const original = Comp.render;
  if (typeof original !== "function") return;
  Comp.__scalePatched = true;
  Comp.render = function (...args: any[]) {
    const el = original.apply(this, args);
    if (currentFactor === 1 || !el?.props) return el;
    const flat = StyleSheet.flatten(el.props.style) || {};
    if (typeof flat.fontSize !== "number") return el;
    const extra: Record<string, number> = { fontSize: flat.fontSize * currentFactor };
    if (typeof flat.lineHeight === "number") extra.lineHeight = flat.lineHeight * currentFactor;
    // Evita que el sistema vuelva a escalar encima (ya lo hacemos nosotros).
    return { ...el, props: { ...el.props, allowFontScaling: false, style: [el.props.style, extra] } };
  };
}
patch(Text);
patch(TextInput);

type Ctx = { scale: TextScale; setScale: (s: TextScale) => void; ready: boolean; revision: number };
const SettingsContext = createContext<Ctx>({
  scale: "sm",
  setScale: () => {},
  ready: false,
  revision: 0,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<TextScale>("sm");
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    void SecureStore.getItemAsync(KEY).then((v) => {
      if (v && v in SCALE_FACTOR) {
        currentFactor = SCALE_FACTOR[v as TextScale];
        setScaleState(v as TextScale);
      }
      setReady(true);
      setRevision((r) => r + 1);
    });
  }, []);

  function setScale(s: TextScale) {
    currentFactor = SCALE_FACTOR[s];
    setScaleState(s);
    setRevision((r) => r + 1); // fuerza el remonte del árbol
    void SecureStore.setItemAsync(KEY, s);
  }

  return (
    <SettingsContext.Provider value={{ scale, setScale, ready, revision }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
