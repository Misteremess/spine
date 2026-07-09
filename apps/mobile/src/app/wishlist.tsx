import { toIsbn13 } from "@spine/shared";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../lib/api";
import { colors } from "../lib/theme";

type Item = {
  id: number;
  title: string | null;
  isbn13: string | null;
  coverUrl: string | null;
  priority: number;
  notes: string | null;
};

const PRIORITIES: { value: number; label: string; color: string }[] = [
  { value: 1, label: "La quiero ya", color: colors.ambar },
  { value: 2, label: "Normal", color: colors.mut },
  { value: 3, label: "Algún día", color: colors.salvia },
];

const prio = (v: number) => PRIORITIES.find((p) => p.value === v) ?? PRIORITIES[1]!;

export default function Wishlist() {
  const [items, setItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState(2);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ items: Item[] }>("/v1/wishlist");
    setItems(data.items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => {});
    }, [load])
  );

  async function add() {
    const text = input.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      // Si lo escrito es un ISBN válido va como isbn (resuelve portada y título);
      // cualquier otra cosa es un título libre.
      const isbn13 = toIsbn13(text.replace(/[-\s]/g, ""));
      await api("/v1/wishlist", {
        method: "POST",
        body: isbn13 ? { isbn: isbn13, priority } : { title: text, priority },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInput("");
      Keyboard.dismiss();
      await load();
    } catch {
      Alert.alert("No se pudo añadir", "Comprueba la conexión y reinténtalo.");
    } finally {
      setAdding(false);
    }
  }

  function purchase(item: Item) {
    Alert.alert("¿Lo compraste?", `«${item.title ?? "Sin título"}» pasará a tu biblioteca.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, a la biblioteca",
        onPress: async () => {
          await api(`/v1/wishlist/${item.id}/purchased`, { method: "POST", body: {} });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await load();
        },
      },
    ]);
  }

  function remove(item: Item) {
    Alert.alert("Quitar de deseos", `«${item.title ?? "Sin título"}» saldrá de la lista.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: async () => {
          await api(`/v1/wishlist/${item.id}`, { method: "DELETE" });
          await load();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: `Deseos · ${items.length}` }} />

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}
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
          <View style={{ alignItems: "center", marginTop: 70, gap: 8 }}>
            <Text style={{ color: colors.marfil, fontSize: 17, fontFamily: "Georgia" }}>
              Nada en la lista de deseos
            </Text>
            <Text style={{ color: colors.mut, fontSize: 13, textAlign: "center" }}>
              Escribe abajo un título o un ISBN{"\n"}para no perderle la pista
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const p = prio(item.priority);
          return (
            <View style={s.card}>
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={s.cover} contentFit="cover" />
              ) : (
                <View style={[s.cover, { alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ color: colors.mut, fontSize: 9, textAlign: "center" }}>
                    sin{"\n"}portada
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.title} numberOfLines={2}>
                  {item.title ?? "Sin título"}
                </Text>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <View style={[s.prioPill, { borderColor: p.color }]}>
                    <Text style={{ color: p.color, fontSize: 10, fontWeight: "600" }}>{p.label}</Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => remove(item)}>
                    <Text style={{ color: colors.mut, fontSize: 11 }}>Quitar</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable style={s.buyBtn} onPress={() => purchase(item)}>
                <Text style={{ color: colors.inkOnAccent, fontSize: 11.5, fontWeight: "700" }}>
                  Lo compré
                </Text>
              </Pressable>
            </View>
          );
        }}
      />

      {/* Composer: título libre o ISBN + prioridad */}
      <View style={s.composer}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {PRIORITIES.map((p) => {
            const active = priority === p.value;
            return (
              <Pressable
                key={p.value}
                onPress={() => setPriority(p.value)}
                style={[s.prioChoice, active && { backgroundColor: p.color, borderColor: p.color }]}
              >
                <Text
                  style={{
                    color: active ? colors.inkOnAccent : p.color,
                    fontSize: 11.5,
                    fontWeight: "600",
                  }}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Título o ISBN"
            placeholderTextColor={colors.mut}
            returnKeyType="done"
            onSubmitEditing={() => void add()}
          />
          <Pressable
            style={[s.addBtn, (!input.trim() || adding) && { opacity: 0.4 }]}
            disabled={!input.trim() || adding}
            onPress={() => void add()}
          >
            <Text style={{ color: colors.inkOnAccent, fontWeight: "700", fontSize: 14 }}>
              {adding ? "…" : "Añadir"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  title: { color: colors.papel, fontSize: 14.5, fontWeight: "600" },
  prioPill: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  buyBtn: {
    backgroundColor: colors.salvia,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.tinta3,
    backgroundColor: colors.tinta2,
    padding: 14,
    paddingBottom: 26,
    gap: 10,
  },
  prioChoice: {
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    backgroundColor: colors.tinta,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.papel,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: colors.ambar,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
});
