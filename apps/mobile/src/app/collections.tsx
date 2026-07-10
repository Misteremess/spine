import * as Haptics from "expo-haptics";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../lib/api";
import { colors, fonts } from "../lib/theme";

type Volume = {
  volume: number | null;
  userBookId: number;
  title: string;
  status: string;
};

type Collection = {
  series: { id: number; name: string; totalVolumes: number | null };
  volumes: Volume[];
  ownedCount: number;
  maxOwned: number;
  missing: number[];
};

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [totalInput, setTotalInput] = useState("");

  const load = useCallback(async () => {
    const data = await api<{ collections: Collection[] }>("/v1/collections");
    setCollections(data.collections);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => {});
    }, [load])
  );

  async function saveTotal(seriesId: number) {
    const total = Number(totalInput);
    const body = { totalVolumes: Number.isInteger(total) && total >= 1 ? total : null };
    setEditingId(null);
    setTotalInput("");
    await api(`/v1/collections/${seriesId}`, { method: "PATCH", body });
    await load();
  }

  function wishMissing(c: Collection, n: number) {
    const title = `${c.series.name} ${n}`;
    Alert.alert(`Te falta el tomo ${n}`, `¿Añadir «${title}» a la lista de deseos?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "A deseos",
        onPress: async () => {
          await api("/v1/wishlist", { method: "POST", body: { title, priority: 2 } });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: "Colecciones" }} />
      <FlatList
        data={collections}
        keyExtractor={(c) => String(c.series.id)}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
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
            <Text style={{ color: colors.marfil, fontSize: 17, fontFamily: fonts.serif }}>
              Aún no hay colecciones
            </Text>
            <Text style={{ color: colors.mut, fontSize: 13, textAlign: "center" }}>
              Cuando escanees tomos de una serie (manga, cómic, saga) se agrupan aquí solos,
              con los huecos que te faltan
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const total = item.series.totalVolumes;
          const horizon = total ?? item.maxOwned;
          const ownedByNumber = new Map<number, Volume[]>();
          for (const v of item.volumes) {
            if (v.volume === null) continue;
            const list = ownedByNumber.get(v.volume) ?? [];
            list.push(v);
            ownedByNumber.set(v.volume, list);
          }
          const pct = horizon > 0 ? Math.round((ownedByNumber.size / horizon) * 100) : 0;
          const editing = editingId === item.series.id;

          return (
            <View style={s.card}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={s.name} numberOfLines={1}>
                  {item.series.name}
                </Text>
                <Text style={{ color: colors.ambar, fontSize: 13, fontFamily: fonts.sansBold }}>
                  {ownedByNumber.size} de {total ?? "?"}
                </Text>
              </View>

              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${Math.min(100, pct)}%` }]} />
              </View>

              {/* Cuadrícula de tomos: leído salvia, sin leer ámbar, hueco arcilla */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {Array.from({ length: horizon }, (_, i) => i + 1).map((n) => {
                  const owners = ownedByNumber.get(n);
                  if (!owners) {
                    return (
                      <Pressable key={n} style={[s.tomo, s.tomoGap]} onPress={() => wishMissing(item, n)}>
                        <Text style={{ color: colors.arcilla, fontSize: 11, fontFamily: fonts.sansSemi }}>{n}</Text>
                      </Pressable>
                    );
                  }
                  const read = owners.some((o) => o.status === "finished");
                  const bg = read ? colors.salvia : colors.ambar;
                  return (
                    <Pressable
                      key={n}
                      style={[s.tomo, { backgroundColor: bg, borderColor: bg }]}
                      onPress={() => router.push(`/book/${owners[0]!.userBookId}`)}
                    >
                      <Text style={{ color: colors.inkOnAccent, fontSize: 11, fontFamily: fonts.sansBold }}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {item.missing.length > 0 && (
                <Text style={{ color: colors.arcilla, fontSize: 11.5 }}>
                  Te faltan {item.missing.length}: toca un hueco para mandarlo a deseos
                </Text>
              )}

              {editing ? (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TextInput
                    style={s.totalInput}
                    value={totalInput}
                    onChangeText={setTotalInput}
                    placeholder={`¿Cuántos tomos tiene ${item.series.name}?`}
                    placeholderTextColor={colors.mut}
                    keyboardType="number-pad"
                    autoFocus
                    onSubmitEditing={() => void saveTotal(item.series.id)}
                  />
                  <Pressable style={s.totalBtn} onPress={() => void saveTotal(item.series.id)}>
                    <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 12 }}>OK</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setEditingId(item.series.id);
                    setTotalInput(total ? String(total) : "");
                  }}
                >
                  <Text style={{ color: colors.mut, fontSize: 11.5 }}>
                    {total ? `La serie completa son ${total} · cambiar` : "✎ Fijar cuántos tomos tiene la serie"}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  card: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  name: { color: colors.papel, fontSize: 17, fontFamily: fonts.serif, flexShrink: 1 },
  barTrack: { height: 5, borderRadius: 99, backgroundColor: colors.tinta3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 99, backgroundColor: colors.ambar },
  tomo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tomoGap: { borderColor: "rgba(193,85,61,.55)", borderStyle: "dashed" },
  totalInput: {
    flex: 1,
    backgroundColor: colors.tinta,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.papel,
    fontSize: 13,
  },
  totalBtn: {
    backgroundColor: colors.ambar,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});
