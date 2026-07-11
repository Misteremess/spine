/**
 * Centro de avisos: nuevos tomos de tus sagas, próximos lanzamientos y
 * actividad de tus clubs. Tocar navega al sitio; todo se puede marcar leído.
 */
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { api } from "../lib/api";
import { useThemeColors, useThemedStyles } from "../lib/settings";
import { fonts, type Palette } from "../lib/theme";
import { Text } from "../lib/ui";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  data: { seriesId?: number; clubId?: number; volume?: number };
};

const GLYPH: Record<string, string> = {
  new_volume: "✨",
  upcoming_volume: "◷",
  club_post: "💬",
};

export default function Notifications() {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ notifications: Notification[]; unreadCount: number }>("/v1/notifications");
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => {});
    }, [load])
  );

  async function open(n: Notification) {
    if (!n.readAt) {
      void api(`/v1/notifications/${n.id}/read`, { method: "POST", body: {} }).catch(() => {});
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.data?.seriesId) router.push(`/series/${n.data.seriesId}`);
    else if (n.data?.clubId) router.push(`/club/${n.data.clubId}`);
  }

  async function readAll() {
    await api("/v1/notifications/read-all", { method: "POST", body: {} });
    await load();
  }

  return (
    <View style={s.screen}>
      <Stack.Screen
        options={{
          title: "Avisos",
          headerRight: () =>
            unread > 0 ? (
              <Pressable onPress={() => void readAll()} hitSlop={10}>
                <Text style={{ color: colors.ambar, fontSize: 13, fontFamily: fonts.sansSemi }}>Leído todo</Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 40 }}
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
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 80, gap: 8, paddingHorizontal: 30 }}>
            <Text style={{ color: colors.marfil, fontSize: 17, fontFamily: fonts.serif }}>Sin avisos</Text>
            <Text style={{ color: colors.mut, fontSize: 13, textAlign: "center" }}>
              Cuando salga un tomo nuevo de tus sagas o haya movimiento en tus clubs, aparecerá aquí
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[s.card, !item.readAt && s.cardUnread]}
            onPress={() => void open(item)}
          >
            <Text style={{ fontSize: 17 }}>{GLYPH[item.type] ?? "•"}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  color: colors.papel,
                  fontSize: 13.5,
                  fontFamily: item.readAt ? fonts.sans : fonts.sansSemi,
                }}
              >
                {item.title}
              </Text>
              {item.body ? (
                <Text style={{ color: colors.mut, fontSize: 12 }} numberOfLines={2}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={{ color: colors.mut, fontSize: 10.5, fontVariant: ["tabular-nums"] }}>
                {item.createdAt.slice(0, 10)}
              </Text>
            </View>
            {!item.readAt && <View style={s.dot} />}
          </Pressable>
        )}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 12,
    padding: 13,
  },
  cardUnread: { borderColor: "rgba(217,164,65,.4)" },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: colors.ambar },
});
