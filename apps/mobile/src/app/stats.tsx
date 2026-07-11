import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { api } from "../lib/api";
import { useThemeColors, useThemedStyles } from "../lib/settings";
import { fonts, type Palette } from "../lib/theme";
import { Text } from "../lib/ui";

type Stats = {
  library: { total: number; byStatus: Record<string, number>; readPct: number };
  thisYear: { finished: number; pages: number };
  months: { month: string; finished: number; pages: number }[];
  streakDays: number;
  collection: { valueCents: number; series: number; seriesComplete: number };
  topAuthors: { name: string; count: number }[];
};

const MONTH_LABEL = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function euros(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function StatsScreen() {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      void api<Stats>("/v1/stats").then(setStats).catch(() => {});
    }, [])
  );

  if (!stats) {
    return (
      <View style={[s.screen, { justifyContent: "center" }]}>
        <Stack.Screen options={{ title: "Estadísticas" }} />
        <ActivityIndicator color={colors.ambar} />
      </View>
    );
  }

  const { library, thisYear, months, streakDays, collection, topAuthors } = stats;
  const maxFinished = Math.max(1, ...months.map((m) => m.finished));

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: "Estadísticas" }} />

      {/* Biblioteca */}
      <View style={s.row}>
        <Tile big={String(library.total)} label="en tu biblioteca" />
        <Tile big={`${library.readPct}%`} label="ya leído" accent={colors.salvia} />
      </View>
      <View style={s.row}>
        <Tile big={String(library.byStatus.reading ?? 0)} label="leyendo ahora" accent={colors.ambar} />
        <Tile big={String(library.byStatus.pending ?? 0)} label="esperando turno" />
      </View>

      {/* Este año */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Este año</Text>
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View>
            <Text style={s.big}>{thisYear.finished}</Text>
            <Text style={s.label}>libros terminados</Text>
          </View>
          <View>
            <Text style={s.big}>{thisYear.pages.toLocaleString("es-ES")}</Text>
            <Text style={s.label}>páginas</Text>
          </View>
          <View>
            <Text style={[s.big, streakDays > 0 && { color: colors.ambar }]}>
              {streakDays > 0 ? `🔥 ${streakDays}` : "—"}
            </Text>
            <Text style={s.label}>días de racha</Text>
          </View>
        </View>

        {/* Terminados por mes, últimos 12 */}
        <View style={s.chart}>
          {months.map((m) => {
            const h = m.finished === 0 ? 3 : 12 + (m.finished / maxFinished) * 48;
            const idx = Number(m.month.slice(5, 7)) - 1;
            return (
              <View key={m.month} style={{ alignItems: "center", gap: 4, flex: 1 }}>
                <Text style={{ color: colors.mut, fontSize: 9 }}>
                  {m.finished > 0 ? m.finished : ""}
                </Text>
                <View
                  style={{
                    height: h,
                    alignSelf: "stretch",
                    marginHorizontal: 3,
                    borderRadius: 4,
                    backgroundColor: m.finished > 0 ? colors.ambar : colors.tinta3,
                  }}
                />
                <Text style={{ color: colors.mut, fontSize: 9 }}>{MONTH_LABEL[idx]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Colección */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Tu colección</Text>
        <View style={{ flexDirection: "row", gap: 20 }}>
          {collection.valueCents > 0 && (
            <View>
              <Text style={s.big}>{euros(collection.valueCents)}</Text>
              <Text style={s.label}>invertido</Text>
            </View>
          )}
          <View>
            <Text style={s.big}>{collection.series}</Text>
            <Text style={s.label}>series</Text>
          </View>
          <View>
            <Text style={[s.big, collection.seriesComplete > 0 && { color: colors.salvia }]}>
              {collection.seriesComplete}
            </Text>
            <Text style={s.label}>completas</Text>
          </View>
        </View>
        {collection.valueCents === 0 && (
          <Text style={{ color: colors.mut, fontSize: 11.5 }}>
            Apunta el precio de compra en la ficha de tus libros y aquí verás cuánto vale tu
            estantería
          </Text>
        )}
      </View>

      {/* Top autores */}
      {topAuthors.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Autores de cabecera</Text>
          {topAuthors.map((a, i) => (
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
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.tinta3,
  },
});
