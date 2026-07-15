/**
 * Puerta de entrada sin sesión: una landing con imagen de fondo, un carrusel
 * con el argumentario de Spine y accesos a crear cuenta / entrar.
 */
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VideoBackdrop from "../components/VideoBackdrop";
import { useThemeColors, useThemedStyles } from "../lib/settings";
import { fonts, type Palette } from "../lib/theme";
import { Text } from "../lib/ui";

const SLIDES = [
  {
    icon: "maximize" as const,
    title: "Escanea tu estantería",
    body: "Cataloga decenas de libros en una tarde con el escáner en ráfaga. Nada de teclear ISBNs uno a uno.",
  },
  {
    icon: "grid" as const,
    title: "Domina tus colecciones",
    body: "Spine sabe qué tomos te faltan de cada saga y cuáles ya se han publicado. Nunca compres dos veces el mismo.",
  },
  {
    icon: "trending-up" as const,
    title: "Tu año lector, medido",
    body: "Rachas, retos, páginas y estadísticas de verdad. Descubre cómo lees y cuánto llevas construido.",
  },
  {
    icon: "star" as const,
    title: "Reseñas y comunidad",
    body: "Puntúa sagas enteras, comparte reseñas y compara tu biblioteca con la de otros coleccionistas.",
  },
];

export default function Landing() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setI((n) => (n + 1) % SLIDES.length);
        Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(t);
  }, [fade]);

  const slide = SLIDES[i]!;

  return (
    <View style={s.screen}>
      <VideoBackdrop />

      <View style={[s.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <Text style={s.brand}>Spine</Text>

        <View style={{ flex: 1 }} />

        <Text style={s.title}>Tu biblioteca y tus colecciones, por fin bajo control.</Text>
        <Text style={s.lead}>
          El CRM de tu vida lectora: escanea, organiza, mide y no vuelvas a comprar un tomo repetido.
        </Text>

        {/* Carrusel de valor */}
        <View style={s.card}>
          <Animated.View style={{ opacity: fade, flexDirection: "row", gap: 14, minHeight: 96 }}>
            <View style={s.slideIcon}>
              <Feather name={slide.icon} size={20} color={colors.ambar} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.slideTitle}>{slide.title}</Text>
              <Text style={s.slideBody}>{slide.body}</Text>
            </View>
          </Animated.View>
          <View style={s.dots}>
            {SLIDES.map((_, n) => (
              <Pressable key={n} hitSlop={8} onPress={() => setI(n)}>
                <View style={[s.dot, n === i && { backgroundColor: colors.ambar, width: 22 }]} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Acciones */}
        <Pressable style={s.ctaPrimary} onPress={() => router.push("/login?nuevo=1")}>
          <Text style={s.ctaPrimaryText}>Crear mi cuenta gratis</Text>
        </Pressable>
        <Pressable style={s.ctaGhost} onPress={() => router.push("/login")}>
          <Text style={s.ctaGhostText}>Ya tengo cuenta</Text>
        </Pressable>
        <Text style={s.fine}>Tu biblioteca es tuya: privada y exportable siempre.</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  inner: { flex: 1, paddingHorizontal: 24 },
  brand: { fontFamily: fonts.serif, fontSize: 30, color: colors.ambar, letterSpacing: 0.5 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 39,
    color: colors.papel,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 18,
  },
  lead: { marginTop: 12, fontSize: 15, lineHeight: 22, color: colors.marfil },
  card: {
    marginTop: 22,
    backgroundColor: "rgba(29,26,21,0.78)",
    borderWidth: 1,
    borderColor: "rgba(246,241,231,0.12)",
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  slideIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    alignItems: "center",
    justifyContent: "center",
  },
  slideTitle: { fontSize: 16, color: colors.papel, fontFamily: fonts.sansSemi },
  slideBody: { marginTop: 5, fontSize: 13, lineHeight: 19, color: colors.mut },
  dots: { flexDirection: "row", gap: 7, alignItems: "center" },
  dot: { width: 12, height: 4, borderRadius: 99, backgroundColor: "rgba(246,241,231,0.25)" },
  ctaPrimary: {
    marginTop: 22,
    backgroundColor: colors.ambar,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  ctaPrimaryText: { color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 16 },
  ctaGhost: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(246,241,231,0.22)",
  },
  ctaGhostText: { color: colors.marfil, fontFamily: fonts.sansSemi, fontSize: 15 },
  fine: { marginTop: 14, fontSize: 11.5, color: colors.mut, textAlign: "center" },
});
