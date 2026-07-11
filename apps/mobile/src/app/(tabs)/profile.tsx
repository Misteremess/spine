/**
 * Perfil: el panel de estadísticas de lectura del usuario — su identidad y
 * un vistazo a lo que lleva leído. Los ajustes y el menú de secciones viven
 * ahora en /settings (engranaje arriba a la derecha).
 */
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth";
import { useThemeColors, useThemedStyles } from "../../lib/settings";
import { fonts, type Palette } from "../../lib/theme";
import { Text } from "../../lib/ui";

type Stats = {
  library: { total: number; byStatus: Record<string, number>; readPct: number };
  thisYear: { finished: number; pages: number };
  months: { month: string; finished: number; pages: number }[];
  streakDays: number;
  collection: { valueCents: number; series: number; seriesComplete: number };
  topAuthors: { name: string; count: number }[];
};

function euros(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      void api<Stats>("/v1/stats").then(setStats).catch(() => {});
    }, [])
  );

  const name = session?.user?.name ?? "—";

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingTop: insets.top + 14, padding: 18, gap: 16, paddingBottom: 40 }}
    >
      {/* Identidad + acceso a ajustes */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={s.avatar}>
          <Text style={{ color: colors.inkOnAccent, fontSize: 22, fontFamily: fonts.serif }}>
            {(session?.user?.name ?? "?").slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.papel, fontSize: 18, fontFamily: fonts.serif }}>{name}</Text>
          <Text style={{ color: colors.mut, fontSize: 12.5 }}>{session?.user?.email ?? ""}</Text>
        </View>
        <Pressable
          onPress={() => router.push("/settings")}
          hitSlop={12}
          style={s.gear}
          accessibilityLabel="Ajustes"
        >
          <Text style={{ color: colors.marfil, fontSize: 20 }}>⚙</Text>
        </Pressable>
      </View>

      {!stats ? (
        <View style={{ paddingVertical: 40 }}>
          <ActivityIndicator color={colors.ambar} />
        </View>
      ) : (
        <>
          {/* Resumen de la biblioteca */}
          <View style={s.row}>
            <Tile big={String(stats.library.total)} label="en tu biblioteca" />
            <Tile big={`${stats.library.readPct}%`} label="ya leído" accent={colors.salvia} />
          </View>
          <View style={s.row}>
            <Tile big={String(stats.library.byStatus.reading ?? 0)} label="leyendo ahora" accent={colors.ambar} />
            <Tile big={String(stats.library.byStatus.pending ?? 0)} label="esperando turno" />
          </View>

          {/* Este año */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Este año</Text>
            <View style={{ flexDirection: "row", gap: 20 }}>
              <View>
                <Text style={s.big}>{stats.thisYear.finished}</Text>
                <Text style={s.label}>terminados</Text>
              </View>
              <View>
                <Text style={s.big}>{stats.thisYear.pages.toLocaleString("es-ES")}</Text>
                <Text style={s.label}>páginas</Text>
              </View>
              <View>
                <Text style={[s.big, stats.streakDays > 0 && { color: colors.ambar }]}>
                  {stats.streakDays > 0 ? `🔥 ${stats.streakDays}` : "—"}
                </Text>
                <Text style={s.label}>días de racha</Text>
              </View>
            </View>
          </View>

          {/* Colección */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Tu colección</Text>
            <View style={{ flexDirection: "row", gap: 20 }}>
              {stats.collection.valueCents > 0 && (
                <View>
                  <Text style={s.big}>{euros(stats.collection.valueCents)}</Text>
                  <Text style={s.label}>invertido</Text>
                </View>
              )}
              <View>
                <Text style={s.big}>{stats.collection.series}</Text>
                <Text style={s.label}>series</Text>
              </View>
              <View>
                <Text style={[s.big, stats.collection.seriesComplete > 0 && { color: colors.salvia }]}>
                  {stats.collection.seriesComplete}
                </Text>
                <Text style={s.label}>completas</Text>
              </View>
            </View>
          </View>

          {/* Top autores */}
          {stats.topAuthors.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Autores de cabecera</Text>
              {stats.topAuthors.map((a, i) => (
                <View key={a.name} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ color: colors.ambar, fontSize: 15, fontFamily: fonts.serif, width: 18 }}>
                    {i + 1}
                  </Text>
                  <Text style={{ color: colors.papel, fontSize: 14.5, flex: 1 }} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Text style={{ color: colors.mut, fontSize: 12 }}>
                    {a.count} {a.count === 1 ? "libro" : "libros"}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable style={{ alignItems: "center", paddingVertical: 8 }} onPress={() => router.push("/stats")}>
            <Text style={{ color: colors.ambar, fontSize: 13.5, fontFamily: fonts.sansSemi }}>
              Ver estadísticas completas →
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Tile({ big, label, accent }: { big: string; label: string; accent?: string }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={[s.card, { flex: 1 }]}>
      <Text style={[s.big, accent ? { color: accent } : null]}>{big}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  row: { flexDirection: "row", gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 99,
    backgroundColor: colors.ambar,
    alignItems: "center",
    justifyContent: "center",
  },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
  },
  card: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: { color: colors.marfil, fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 0.4 },
  big: { color: colors.papel, fontSize: 26, fontFamily: fonts.serif },
  label: { color: colors.mut, fontSize: 11.5 },
});
