import { Image, type ImageStyle } from "expo-image";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { spineColor, spineInk } from "./spine";
import { fonts } from "./theme";

/** Oscurece un hex por un factor 0..1 para el canto del libro. */
function darken(hex: string, f: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const d = (c: number) => Math.round(c * (1 - f));
  return `rgb(${d(r)}, ${d(g)}, ${d(b)})`;
}

/**
 * Portada de un libro. Con imagen la muestra; sin ella genera una portada
 * de color (mismo hash que los lomos) con el título en serif, en vez de la
 * caja "sin portada". Coste cero, estable entre sesiones.
 */
export function Cover({
  title,
  author,
  coverUrl,
  style,
  radius = 8,
  titleSize = 12,
}: {
  title: string | null;
  author?: string | null;
  coverUrl?: string | null;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  titleSize?: number;
}) {
  if (coverUrl) {
    return <Image source={{ uri: coverUrl }} style={[style as StyleProp<ImageStyle>, { borderRadius: radius }]} contentFit="cover" />;
  }
  const base = spineColor(title ?? "?");
  const ink = spineInk(base);
  return (
    <View
      style={[
        style,
        { backgroundColor: base, borderRadius: radius, overflow: "hidden", justifyContent: "center", paddingLeft: 12, paddingRight: 8 },
      ]}
    >
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, backgroundColor: darken(base, 0.42) }} />
      <Text style={{ color: ink, fontFamily: fonts.serifMedium, fontSize: titleSize, lineHeight: titleSize * 1.15 }} numberOfLines={4}>
        {title ?? "Sin título"}
      </Text>
      {author ? (
        <Text style={{ color: ink, opacity: 0.72, fontSize: titleSize * 0.72, marginTop: 3 }} numberOfLines={2}>
          {author}
        </Text>
      ) : null}
    </View>
  );
}
