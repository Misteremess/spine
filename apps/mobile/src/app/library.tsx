import { Image } from "expo-image";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../lib/api";
import { authClient } from "../lib/auth";
import { colors } from "../lib/theme";

type Item = {
  id: number;
  title: string | null;
  coverUrl: string | null;
  isbn13: string | null;
  pages: number | null;
  favorite: boolean;
  reading: { status: string } | null;
};

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: "Pendiente", color: colors.mut },
  reading: { text: "Leyendo", color: colors.ambar },
  paused: { text: "En pausa", color: colors.mut },
  finished: { text: "Leído", color: colors.salvia },
  abandoned: { text: "Abandonado", color: colors.arcilla },
};

export default function Library() {
  const [items, setItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Item[] }>("/v1/library");
      setItems(data.items);
    } catch {
      // sesión caducada u API caída: volver al login es lo más honesto
      router.replace("/login");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <View style={s.screen}>
      <Stack.Screen
        options={{
          title: `Biblioteca · ${items.length}`,
          headerRight: () => (
            <Pressable onPress={signOut} hitSlop={12}>
              <Text style={{ color: colors.mut, fontSize: 13 }}>Salir</Text>
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.ambar}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 80, gap: 8 }}>
            <Text style={{ color: colors.marfil, fontSize: 17, fontFamily: "Georgia" }}>
              Tu biblioteca está vacía
            </Text>
            <Text style={{ color: colors.mut, fontSize: 13 }}>
              Pulsa «Escanear» y apunta al código de barras
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = item.reading ? STATUS_LABEL[item.reading.status] : undefined;
          return (
            <Pressable style={s.card} onPress={() => router.push(`/book/${item.id}`)}>
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={s.cover} contentFit="cover" />
              ) : (
                <View style={[s.cover, s.coverPlaceholder]}>
                  <Text style={{ color: colors.mut, fontSize: 9, textAlign: "center" }}>
                    sin{"\n"}portada
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.title} numberOfLines={2}>
                  {item.title ?? "Sin título"}
                </Text>
                {item.pages ? <Text style={s.meta}>{item.pages} págs.</Text> : null}
              </View>
              {st && (
                <View style={[s.pill, { borderColor: st.color }]}>
                  <Text style={{ color: st.color, fontSize: 10, fontWeight: "600" }}>{st.text}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      <Pressable style={s.fab} onPress={() => router.push("/scanner")}>
        <Text style={s.fabText}>▣ Escanear</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 10,
  },
  cover: { width: 44, height: 64, borderRadius: 5, backgroundColor: colors.tinta3 },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  title: { color: colors.papel, fontSize: 14.5, fontWeight: "600" },
  meta: { color: colors.mut, fontSize: 11.5 },
  pill: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  fab: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    backgroundColor: colors.ambar,
    borderRadius: 99,
    paddingHorizontal: 26,
    paddingVertical: 14,
    shadowColor: colors.ambar,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: colors.inkOnAccent, fontWeight: "700", fontSize: 15 },
});
