/**
 * Wrappers de Text/TextInput que aplican el tamaño de texto elegido en
 * Ajustes. En RN 0.81 Text/TextInput son componentes de función y no se
 * pueden parchear en su render, así que el escalado se hace aquí: cada
 * pantalla importa Text/TextInput de este módulo en lugar de react-native.
 */
import { type ComponentRef, forwardRef } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import { useScaleFactor } from "./settings";

function scaleStyle(style: StyleProp<TextStyle>, factor: number): StyleProp<TextStyle> {
  if (factor === 1) return style;
  const flat = StyleSheet.flatten(style) || {};
  if (typeof flat.fontSize !== "number") return style;
  const extra: TextStyle = { fontSize: flat.fontSize * factor };
  if (typeof flat.lineHeight === "number") extra.lineHeight = flat.lineHeight * factor;
  return [style, extra];
}

export const Text = forwardRef<ComponentRef<typeof RNText>, TextProps>(function Text({ style, ...props }, ref) {
  const factor = useScaleFactor();
  return <RNText ref={ref} allowFontScaling={false} {...props} style={scaleStyle(style, factor)} />;
});

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const factor = useScaleFactor();
  return <RNTextInput ref={ref} allowFontScaling={false} {...props} style={scaleStyle(style as StyleProp<TextStyle>, factor)} />;
});
