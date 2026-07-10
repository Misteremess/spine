/**
 * Inicio (prototipo, pantalla 2): el hábito diario. «Leyendo ahora» con el
 * progreso a un toque, las novedades de tus sagas y el estado de tus
 * colecciones. Nunca un feed.
 */
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth";
import { colors, fonts } from "../../lib/theme";

type LibItem = {
  id: number;
  title: string | null;
  coverUrl: string | null;
  pages: number | null;
  authors: string[];
  reading: { status: string } | null;
};
type Collection = {
  series: { id: number; name: string; totalVolumes: number | null };
  ownedCount: number;
  missing: number[];
};
type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  data: { seriesId?: number; clubId?: number };
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const [items, setItems] = useState<LibItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [lib, cols, notif] = await Promise.allSettled([
      api<{ items: LibItem[] }>("/v1/library"),
      api<{ collections: Collection[] }>("/v1/collections"),
      api<{ notifications: Notification[]; unreadCount: number }>("/v1/notifications"),
    ]);
    if (lib.status === "fulfilled") setItems(lib.value.items);
    if (cols.status === "fulfilled") setCollections(cols.value.collections);
    if (notif.status === "fulfilled") {
      setNotifications(notif.value.notifications.filter((n) => !n.readAt).slice(0, 3));
      setUnread(notif.value.unreadCount);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => {});
    }, [load])
  );

  const reading = items.filter((it) => it.reading?.status === "reading");
  const pending = items.filter((it) => (it.reading?.status ?? "pending") === "pending");
  const gaps = collections.filter((c) => c.missing.length > 0);
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingTop: insets.top + 14, padding: 18, gap: 20, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.ambar}
          onRefresh={async () => {
            setRefreshing(true);
            await load().catch(() => {});
            setRefreshing(false);
          }}
        />
      }
    >
      {/* Cabecera con campana de avisos */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: colors.mut, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Spine
          </Text>
          <Text style={s.h1}>{firstName ? `Hola, ${firstName}` : "Tu biblioteca"}</Text>
        </View>
        <Pressable onPress={() => router.push("/notifications")} hitSlop={10} style={s.bell}>
          <Text style={{ fontSize: 20, color: unread > 0 ? colors.ambar : colors.mut }}>◷</Text>
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={{ color: colors.inkOnAccent, fontSize: 9.5, fontFamily: fonts.sansBold }}>
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Novedades de tus sagas y clubs */}
      {notifications.length > 0 && (
        <View style={{ gap: 8 }}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              style={s.notifCard}
              onPress={() =>
                n.data?.seriesId
                  ? router.push(`/series/${n.data.seriesId}`)
                  : n.data?.clubId
                    ? router.push(`/club/${n.data.clubId}`)
                    : router.push("/notifications")
              }
            >
              <Text style={{ fontSize: 16 }}>{n.type === "club_post" ? "💬" : "✨"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.papel, fontSize: 13, fontFamily: fonts.sansSemi }} numberOfLines={1}>
                  {n.title}
                </Text>
                {n.body ? (
                  <Text style={{ color: colors.mut, fontSize: 11.5 }} numberOfLines={1}>
                    {n.body}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: colors.ambar, fontSize: 16 }}>›</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Leyendo ahora */}
      <View style={{ gap: 10 }}>
        <Text style={s.section}>Leyendo ahora</Text>
        {reading.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ color: colors.mut, fontSize: 12.5, textAlign: "center" }}>
              Nada en marcha. Elige tu próxima lectura del montón de pendientes
              {pending.length > 0 ? ` (${pending.length})` : ""}.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {reading.map((it) => (
              <Pressable key={it.id} style={s.readingCard} onPress={() => router.push(`/book/${it.id}`)}>
                {it.coverUrl ? (
                  <Image source={{ uri: it.coverUrl }} style={s.readingCover} contentFit="cover" />
                ) : (
                  <View style={[s.readingCover, { alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ color: colors.mut, fontSize: 10, textAlign: "center", padding: 4 }} numberOfLines={4}>
                      {it.title}
                    </Text>
                  </View>
                )}
                <Text style={{ color: colors.papel, fontSize: 12, fontFamily: fonts.sansSemi, width: 96 }} numberOfLines={2}>
                  {it.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Tus sagas con huecos */}
      {gaps.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={s.section}>Tus colecciones</Text>
          {gaps.slice(0, 4).map((c) => {
            const total = c.series.totalVolumes;
            return (
              <Pressable key={c.series.id} style={s.gapCard} onPress={() => router.push(`/series/${c.series.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.papel, fontSize: 13.5, fontFamily: fonts.sansSemi }} numberOfLines={1}>
                    {c.series.name}
                  </Text>
                  <Text style={{ color: colors.mut, fontSize: 11.5 }}>
                    {c.ownedCount} de {total ?? "?"} · te faltan {c.missing.length}
                  </Text>
                </View>
                <Text style={{ color: colors.arcilla, fontSize: 12, fontFamily: fonts.sansBold }}>
                  {c.missing.slice(0, 5).map((n) => `#${n}`).join(" ")}
                  {c.missing.length > 5 ? "…" : ""}
                </Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push("/collections")} hitSlop={6}>
            <Text style={{ color: colors.ambar, fontSize: 12.5, fontFamily: fonts.sansSemi }}>
              Ver todas las colecciones →
            </Text>
          </Pressable>
        </View>
      )}

      {items.length === 0 && (
        <View style={{ alignItems: "center", gap: 10, marginTop: 30 }}>
          <Text style={{ color: colors.marfil, fontSize: 17, fontFamily: fonts.serif }}>
            Empieza escaneando un libro
          </Text>
          <Pressable style={s.cta} onPress={() => router.push("/scanner")}>
            <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 14 }}>▣ Abrir escáner</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/import")} hitSlop={8}>
            <Text style={{ color: colors.mut, fontSize: 12.5 }}>¿Vienes de Goodreads? Importa tu CSV →</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  h1: { color: colors.papel, fontSize: 26, fontFamily: fonts.serif, marginTop: 2 },
  bell: { padding: 4 },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: colors.arcilla,
    borderRadius: 99,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  section: { color: colors.marfil, fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 0.4 },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,.35)",
    borderRadius: 12,
    padding: 12,
  },
  emptyCard: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 18,
  },
  readingCard: { gap: 6 },
  readingCover: {
    width: 96,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
  },
  gapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 12,
    padding: 12,
  },
  cta: {
    backgroundColor: colors.ambar,
    borderRadius: 99,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 4,
  },
});
