import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { useThemeColors, useThemedStyles } from "../../lib/settings";
import { fonts, type Palette } from "../../lib/theme";
import { Text, TextInput } from "../../lib/ui";

type Item = {
  id: number;
  title: string | null;
  isbn13: string | null;
  coverUrl: string | null;
  priority: number;
  notes: string | null;
};

const priorities = (colors: Palette): { value: number; label: string; color: string }[] => [
  { value: 1, label: "La quiero ya", color: colors.ambar },
  { value: 2, label: "Normal", color: colors.mut },
  { value: 3, label: "Algún día", color: colors.salvia },
];

type Candidate = {
  isbn13: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  coverUrl: string | null;
};

export default function Wishlist() {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const PRIORITIES = useMemo(() => priorities(colors), [colors]);
  const prio = (v: number) => PRIORITIES.find((p) => p.value === v) ?? PRIORITIES[1]!;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState(2);
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ items: Item[] }>("/v1/wishlist");
    setItems(data.items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => {});
    }, [load])
  );

  async function search() {
    const q = input.trim();
    if (q.length < 2 || searching) return;
    setSearching(true);
    Keyboard.dismiss();
    try {
      const data = await api<{ candidates: Candidate[] }>(`/v1/search?q=${encodeURIComponent(q)}`);
      setResults(data.candidates);
    } catch {
      Alert.alert("No se pudo buscar", "Comprueba la conexión y reinténtalo.");
    } finally {
      setSearching(false);
    }
  }

  async function addCandidate(c: Candidate) {
    if (adding) return;
    setAdding(true);
    try {
      await api("/v1/wishlist", {
        method: "POST",
        body: c.isbn13 ? { isbn: c.isbn13, priority } : { title: c.title, priority },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInput("");
      setResults(null);
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
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <Text style={s.h1}>Deseos</Text>
        <Text style={{ color: colors.mut, fontSize: 14, fontVariant: ["tabular-nums"] }}>{items.length}</Text>
      </View>

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
            <Text style={{ color: colors.marfil, fontSize: 17, fontFamily: fonts.serif }}>
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
                    <Text style={{ color: p.color, fontSize: 10, fontFamily: fonts.sansSemi }}>{p.label}</Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => remove(item)}>
                    <Text style={{ color: colors.mut, fontSize: 11 }}>Quitar</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable style={s.buyBtn} onPress={() => purchase(item)}>
                <Text style={{ color: colors.inkOnAccent, fontSize: 11.5, fontFamily: fonts.sansBold }}>
                  Lo compré
                </Text>
              </Pressable>
            </View>
          );
        }}
      />

      {/* Composer: busca el libro real (título o ISBN) o escanea el código */}
      <View style={s.composer}>
        {/* Resultados de búsqueda con datos reales */}
        {results !== null && (
          <View style={{ maxHeight: 240 }}>
            {results.length === 0 ? (
              <Text style={{ color: colors.mut, fontSize: 12.5, padding: 8 }}>
                Sin resultados. Prueba con otro título o el ISBN.
              </Text>
            ) : (
              <FlatList
                data={results}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(c, i) => `${c.isbn13 ?? c.title}-${i}`}
                renderItem={({ item: c }) => (
                  <Pressable style={s.resultRow} onPress={() => void addCandidate(c)}>
                    {c.coverUrl ? (
                      <Image source={{ uri: c.coverUrl }} style={s.resultCover} contentFit="cover" />
                    ) : (
                      <View style={[s.resultCover, { alignItems: "center", justifyContent: "center" }]}>
                        <Text style={{ color: colors.mut, fontSize: 8 }}>—</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.papel, fontSize: 13, fontFamily: fonts.sansSemi }} numberOfLines={2}>
                        {c.title}
                      </Text>
                      <Text style={{ color: colors.mut, fontSize: 11 }} numberOfLines={1}>
                        {[c.authors.join(", "), c.publishedDate?.slice(0, 4)].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <Text style={{ color: colors.ambar, fontSize: 20 }}>＋</Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        )}

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
                    fontFamily: fonts.sansSemi,
                  }}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable style={s.scanBtn} onPress={() => router.push("/scanner?target=wishlist")}>
            <Text style={{ color: colors.ambar, fontSize: 18 }}>▣</Text>
          </Pressable>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Busca por título o ISBN"
            placeholderTextColor={colors.mut}
            returnKeyType="search"
            onSubmitEditing={() => void search()}
          />
          <Pressable
            style={[s.addBtn, (input.trim().length < 2 || searching) && { opacity: 0.4 }]}
            disabled={input.trim().length < 2 || searching}
            onPress={() => void search()}
          >
            <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 14 }}>
              {searching ? "…" : "Buscar"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  h1: { color: colors.papel, fontSize: 26, fontFamily: fonts.serif },
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
  title: { color: colors.papel, fontSize: 14.5, fontFamily: fonts.sansSemi },
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
  scanBtn: {
    width: 44,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,.5)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.tinta3,
  },
  resultCover: { width: 30, height: 44, borderRadius: 4, backgroundColor: colors.tinta3 },
});
