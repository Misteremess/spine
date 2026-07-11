/**
 * Ajustes: el menú a lo que no cabe en las pestañas (colecciones, clubs,
 * avisos, importar, alta manual), tamaño de texto, sesión y la zona de
 * borrado de cuenta. El Perfil pasó a ser el panel de estadísticas.
 */
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { api } from "../lib/api";
import { authClient } from "../lib/auth";
import { SCALE_LABEL, THEME_LABEL, type TextScale, useSettings, useThemeColors, useThemedStyles } from "../lib/settings";
import { fonts, type Palette, type ThemeName } from "../lib/theme";
import { Text, TextInput } from "../lib/ui";

const SCALES: TextScale[] = ["sm", "md", "lg", "xl"];
const THEMES: ThemeName[] = ["noche", "papel"];

const MENU = [
  { glyph: "✦", label: "Estadísticas completas", to: "/stats" },
  { glyph: "▦", label: "Colecciones y sagas", to: "/collections" },
  { glyph: "❖", label: "Clubs de lectura", to: "/clubs" },
  { glyph: "◷", label: "Avisos y novedades", to: "/notifications" },
  { glyph: "⇪", label: "Importar de Goodreads", to: "/import" },
  { glyph: "✎", label: "Añadir libro a mano", to: "/manual" },
] as const;

export default function Settings() {
  const { data: session } = authClient.useSession();
  const { scale, setScale, theme, setTheme } = useSettings();
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const [danger, setDanger] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const email = session?.user?.email ?? "";

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  function confirmDelete() {
    Alert.alert(
      "Borrar tu cuenta",
      "Se borrarán tu cuenta y toda tu biblioteca, lecturas, notas y listas para siempre. Esto no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api("/v1/account", { method: "DELETE", body: { confirm: confirmEmail } });
              await authClient.signOut().catch(() => {});
              router.replace("/login");
            } catch {
              setDeleting(false);
              Alert.alert("No se pudo borrar", "Inténtalo de nuevo en un momento.");
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 40 }}
    >
      <Stack.Screen options={{ title: "Ajustes" }} />

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

      {/* Tema Noche / Papel (prototipo §Modo de la app) */}
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.marfil, fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 0.4 }}>
          Tema
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {THEMES.map((t) => {
            const active = theme === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTheme(t)}
                style={[s.sizeChip, active && { backgroundColor: colors.ambar, borderColor: colors.ambar }]}
              >
                <Text style={{ color: active ? colors.inkOnAccent : colors.papel, fontFamily: fonts.sansSemi, fontSize: 12.5 }}>
                  {THEME_LABEL[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: colors.mut, fontSize: 11.5 }}>
          Mismos tokens, invertidos con intención. El escáner sigue oscuro.
        </Text>
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

      {/* Zona peligrosa: borrado de cuenta self-service (RGPD, plan §15) */}
      {!danger ? (
        <Pressable style={{ alignItems: "center", paddingVertical: 4 }} onPress={() => setDanger(true)}>
          <Text style={{ color: colors.mut, fontSize: 12 }}>Borrar mi cuenta</Text>
        </Pressable>
      ) : (
        <View style={[s.card, { gap: 10, borderColor: colors.arcilla }]}>
          <Text style={{ color: colors.arcilla, fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 0.4 }}>
            BORRAR LA CUENTA
          </Text>
          <Text style={{ color: colors.mut, fontSize: 12.5 }}>
            Se borrará todo para siempre. Escribe tu email ({email}) para confirmar.
          </Text>
          <TextInput
            style={s.dangerInput}
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            placeholder="Escribe tu email"
            placeholderTextColor={colors.mut}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={[
                { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: colors.arcilla },
                (confirmEmail !== email || deleting) && { opacity: 0.4 },
              ]}
              disabled={confirmEmail !== email || deleting}
              onPress={confirmDelete}
            >
              <Text style={{ color: colors.papel, fontFamily: fonts.sansBold, fontSize: 14 }}>
                {deleting ? "Borrando…" : "Borrar para siempre"}
              </Text>
            </Pressable>
            <Pressable style={{ justifyContent: "center", paddingHorizontal: 10 }} onPress={() => setDanger(false)}>
              <Text style={{ color: colors.mut, fontSize: 13 }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  card: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 16,
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
  dangerInput: {
    backgroundColor: colors.tinta,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.papel,
    fontSize: 14.5,
  },
});
