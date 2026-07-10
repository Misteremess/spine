/**
 * Detalle de saga: la ficha viva. Portada y sinopsis de AniList, estado de
 * publicación, rejilla de tomos 1..N (tuyos, huecos con ISBN para desear,
 * y próximos lanzamientos con fecha) y refresco manual del radar.
 */
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { colors, fonts } from "../../lib/theme";

type Volume = {
  volume: number;
  owned: boolean;
  read: boolean;
  userBookId: number | null;
  title: string | null;
  coverUrl: string | null;
  isbn13: string | null;
  publishedDate: string | null;
  upcoming: boolean;
};

type Detail = {
  series: {
    id: number;
    name: string;
    status: "ongoing" | "completed" | "unknown";
    totalVolumes: number | null;
    latestVolume: number | null;
    latestVolumeDate: string | null;
    coverUrl: string | null;
    description: string | null;
    checkedAt: string | null;
  };
  volumes: Volume[];
  unnumbered: { userBookId: number; title: string }[];
  ownedCount: number;
  readCount: number;
  missing: number[];
  upcoming: { volume: number; title: string | null; publishedDate: string | null; isbn13: string | null }[];
};

const STATUS_LABEL = {
  ongoing: { text: "En publicación", color: colors.ambar },
  completed: { text: "Completada", color: colors.salvia },
  unknown: { text: "", color: colors.mut },
} as const;

function fmtDate(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  if (!m) return d;
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${day ? `${Number(day)} ` : ""}${months[Number(m) - 1] ?? m} ${y}`;
}

export default function SeriesDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [refreshingRadar, setRefreshingRadar] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await api<Detail>(`/v1/series/${id}`));
    } catch {
      router.back();
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshRadar() {
    setRefreshingRadar(true);
    try {
      const d = await api<Detail & { refreshed: boolean }>(`/v1/series/${id}/refresh`, {
        method: "POST",
        body: {},
      });
      setDetail(d);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setRefreshingRadar(false);
    }
  }

  function wish(v: Volume, seriesName: string) {
    const title = v.title ?? `${seriesName} ${v.volume}`;
    Alert.alert(`Te falta el tomo ${v.volume}`, `¿Añadir «${title}» a la lista de deseos?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "A deseos",
        onPress: async () => {
          await api("/v1/wishlist", {
            method: "POST",
            body: v.isbn13 ? { isbn: v.isbn13, priority: 2 } : { title, priority: 2 },
          });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  if (!detail) {
    return (
      <View style={[s.screen, { justifyContent: "center" }]}>
        <Stack.Screen options={{ title: "" }} />
        <ActivityIndicator color={colors.ambar} />
      </View>
    );
  }

  const { series, volumes, unnumbered, ownedCount, readCount, missing, upcoming } = detail;
  const st = STATUS_LABEL[series.status];
  const horizon = Math.max(series.totalVolumes ?? 0, volumes.length);
  const pct = horizon > 0 ? Math.round((ownedCount / horizon) * 100) : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: "" }} />

      {/* Cabecera de la saga */}
      <View style={{ flexDirection: "row", gap: 14 }}>
        {series.coverUrl ? (
          <Image source={{ uri: series.coverUrl }} style={s.cover} contentFit="cover" />
        ) : (
          <View style={[s.cover, { alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: colors.mut, fontSize: 22, fontFamily: fonts.serif }}>▦</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 6, justifyContent: "center" }}>
          <Text style={s.title}>{series.name}</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {st.text ? (
              <View style={[s.statusPill, { borderColor: st.color }]}>
                <Text style={{ color: st.color, fontSize: 10.5, fontFamily: fonts.sansSemi }}>{st.text}</Text>
              </View>
            ) : null}
            <Text style={{ color: colors.ambar, fontSize: 13, fontFamily: fonts.sansBold }}>
              {ownedCount} de {series.totalVolumes ?? series.latestVolume ?? "?"}
            </Text>
            {readCount > 0 && (
              <Text style={{ color: colors.salvia, fontSize: 12.5, fontFamily: fonts.sansSemi }}>
                ✓ {readCount} leídos
              </Text>
            )}
          </View>
          {series.latestVolume ? (
            <Text style={{ color: colors.mut, fontSize: 11.5 }}>
              Último tomo publicado: {series.latestVolume}
              {series.latestVolumeDate ? ` (${fmtDate(series.latestVolumeDate)})` : ""}
            </Text>
          ) : null}
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${Math.min(100, pct)}%` }]} />
          </View>
        </View>
      </View>

      {/* Próximos lanzamientos */}
      {upcoming.length > 0 && (
        <View style={s.upcomingCard}>
          <Text style={{ color: colors.ambar, fontSize: 12.5, fontFamily: fonts.sansBold }}>
            ✨ Próximos lanzamientos
          </Text>
          {upcoming.map((u) => (
            <View key={u.volume} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ color: colors.papel, fontSize: 13, flex: 1 }} numberOfLines={1}>
                Tomo {u.volume}
                {u.title ? ` · ${u.title}` : ""}
              </Text>
              <Text style={{ color: colors.ambar, fontSize: 12.5, fontVariant: ["tabular-nums"] }}>
                {fmtDate(u.publishedDate)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Rejilla de tomos */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Tomos</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {volumes.map((v) => {
            if (v.owned) {
              return (
                <Pressable
                  key={v.volume}
                  style={s.tomoOwned}
                  onPress={() => v.userBookId && router.push(`/book/${v.userBookId}`)}
                >
                  {v.coverUrl ? (
                    <Image source={{ uri: v.coverUrl }} style={s.tomoCover} contentFit="cover" />
                  ) : (
                    <Text style={{ color: colors.inkOnAccent, fontSize: 13, fontFamily: fonts.sansBold }}>
                      {v.volume}
                    </Text>
                  )}
                  <View style={s.tomoNum}>
                    <Text style={{ color: colors.papel, fontSize: 9, fontFamily: fonts.sansBold }}>{v.volume}</Text>
                  </View>
                  {v.read && (
                    <View style={s.readBadge}>
                      <Text style={{ color: colors.inkOnAccent, fontSize: 9, fontFamily: fonts.sansBold }}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            }
            if (v.upcoming) {
              return (
                <View key={v.volume} style={[s.tomoBase, s.tomoUpcoming]}>
                  <Text style={{ color: colors.ambar, fontSize: 12, fontFamily: fonts.sansSemi }}>{v.volume}</Text>
                  <Text style={{ color: colors.mut, fontSize: 7.5 }}>{fmtDate(v.publishedDate).split(" ").slice(-2).join(" ")}</Text>
                </View>
              );
            }
            return (
              <Pressable key={v.volume} style={[s.tomoBase, s.tomoGap]} onPress={() => wish(v, series.name)}>
                <Text style={{ color: colors.arcilla, fontSize: 12, fontFamily: fonts.sansSemi }}>{v.volume}</Text>
              </Pressable>
            );
          })}
        </View>
        {missing.length > 0 && (
          <Text style={{ color: colors.arcilla, fontSize: 11.5 }}>
            Te faltan {missing.length}: toca un hueco para mandarlo a deseos
            {volumes.some((v) => !v.owned && v.isbn13) ? " (con su ISBN exacto)" : ""}
          </Text>
        )}
      </View>

      {unnumbered.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sin número de tomo</Text>
          {unnumbered.map((b) => (
            <Pressable key={b.userBookId} onPress={() => router.push(`/book/${b.userBookId}`)}>
              <Text style={{ color: colors.papel, fontSize: 13.5 }}>· {b.title}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {series.description ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sobre la serie</Text>
          <Text style={{ color: colors.marfil, fontSize: 13.5, lineHeight: 20 }}>{series.description}</Text>
        </View>
      ) : null}

      <Pressable
        style={[s.refreshBtn, refreshingRadar && { opacity: 0.5 }]}
        disabled={refreshingRadar}
        onPress={() => void refreshRadar()}
      >
        <Text style={{ color: colors.ambar, fontSize: 13, fontFamily: fonts.sansSemi }}>
          {refreshingRadar ? "Comprobando novedades…" : "⟳ Comprobar novedades ahora"}
        </Text>
        {series.checkedAt ? (
          <Text style={{ color: colors.mut, fontSize: 10.5 }}>
            Última comprobación: {fmtDate(series.checkedAt.slice(0, 10))}
          </Text>
        ) : null}
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  cover: { width: 92, height: 132, borderRadius: 10, backgroundColor: colors.tinta2 },
  title: { color: colors.papel, fontSize: 21, fontFamily: fonts.serif, lineHeight: 26 },
  statusPill: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 2.5 },
  barTrack: { height: 5, borderRadius: 99, backgroundColor: colors.tinta3, overflow: "hidden", marginTop: 2 },
  barFill: { height: 5, borderRadius: 99, backgroundColor: colors.ambar },
  upcomingCard: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,.4)",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  section: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { color: colors.marfil, fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 0.4 },
  tomoBase: {
    width: 44,
    height: 62,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tomoOwned: {
    width: 44,
    height: 62,
    borderRadius: 7,
    backgroundColor: colors.ambar,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tomoCover: { width: "100%", height: "100%" },
  tomoNum: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(20,18,15,.82)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tomoGap: { borderColor: "rgba(193,85,61,.55)", borderStyle: "dashed" },
  readBadge: {
    position: "absolute",
    top: 2,
    left: 2,
    backgroundColor: colors.salvia,
    borderRadius: 4,
    width: 13,
    height: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  tomoUpcoming: { borderColor: "rgba(217,164,65,.5)", borderStyle: "dotted" },
  refreshBtn: { alignItems: "center", gap: 3, paddingVertical: 8 },
});
