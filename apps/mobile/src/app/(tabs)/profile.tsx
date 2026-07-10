/**
 * Perfil: tu cuenta y las puertas a todo lo que no cabe en la barra —
 * estadísticas, colecciones, clubs, avisos e importación.
 */
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authClient } from "../../lib/auth";
import { SCALE_LABEL, type TextScale, useSettings } from "../../lib/settings";
import { colors, fonts } from "../../lib/theme";

const SCALES: TextScale[] = ["sm", "md", "lg", "xl"];

const MENU = [
  { glyph: "✦", label: "Estadísticas de lectura", to: "/stats" },
  { glyph: "▦", label: "Colecciones y sagas", to: "/collections" },
  { glyph: "❖", label: "Clubs de lectura", to: "/clubs" },
  { glyph: "◷", label: "Avisos y novedades", to: "/notifications" },
  { glyph: "⇪", label: "Importar de Goodreads", to: "/import" },
  { glyph: "✎", label: "Añadir libro a mano", to: "/manual" },
] as const;

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const { scale, setScale } = useSettings();

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingTop: insets.top + 14, padding: 18, gap: 18, paddingBottom: 40 }}
    >
      <Text style={s.h1}>Perfil</Text>

      <View style={s.card}>
        <View style={s.avatar}>
          <Text style={{ color: colors.inkOnAccent, fontSize: 22, fontFamily: fonts.serif }}>
            {(session?.user?.name ?? "?").slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.papel, fontSize: 16, fontFamily: fonts.sansSemi }}>
            {session?.user?.name ?? "—"}
          </Text>
          <Text style={{ color: colors.mut, fontSize: 12.5 }}>{session?.user?.email ?? ""}</Text>
        </View>
      </View>

      <View style={s.menu}>
        {MENU.map((m, i) => (
          <Pressable
            key={m.to}
            style={[s.menuRow, i < MENU.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.tinta3 }]}
            onPress={() => router.push(m.to as never)}
          >
            <Text style={{ color: colors.ambar, fontSize: 16, width: 26 }}>{m.glyph}</Text>
            <Text style={{ color: colors.papel, fontSize: 14.5, flex: 1 }}>{m.label}</Text>
            <Text style={{ color: colors.mut, fontSize: 16 }}>›</Text>
          </Pressable>
        ))}
      </View>

      {/* Tamaño del texto (accesibilidad) */}
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.marfil, fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 0.4 }}>
          Tamaño del texto
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {SCALES.map((sz) => {
            const active = scale === sz;
            return (
              <Pressable
                key={sz}
                onPress={() => setScale(sz)}
                style={[s.sizeChip, active && { backgroundColor: colors.ambar, borderColor: colors.ambar }]}
              >
                <Text
                  style={{
                    color: active ? colors.inkOnAccent : colors.papel,
                    fontFamily: fonts.sansSemi,
                    fontSize: 12.5,
                  }}
                >
                  {SCALE_LABEL[sz]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: colors.mut, fontSize: 11.5 }}>
          Cambia el tamaño de toda la letra de la app. Pensado para leer más cómodo.
        </Text>
      </View>

      <Pressable style={{ alignItems: "center", paddingVertical: 10 }} onPress={() => void signOut()}>
        <Text style={{ color: colors.arcilla, fontSize: 14, fontFamily: fonts.sansSemi }}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  h1: { color: colors.papel, fontSize: 26, fontFamily: fonts.serif },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 99,
    backgroundColor: colors.ambar,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sizeChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 10,
    paddingVertical: 10,
  },
});
