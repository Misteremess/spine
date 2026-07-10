import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { colors, fonts } from "../../lib/theme";

type Item = {
  id: number;
  title: string | null;
  coverUrl: string | null;
  isbn13: string | null;
  pages: number | null;
  favorite: boolean;
  authors: string[];
  createdAt: string;
  reading: { status: string } | null;
};

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: "Pendiente", color: colors.mut },
  reading: { text: "Leyendo", color: colors.ambar },
  paused: { text: "En pausa", color: colors.mut },
  finished: { text: "Leído", color: colors.salvia },
  abandoned: { text: "Abandonado", color: colors.arcilla },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "reading", label: "Leyendo" },
  { key: "pending", label: "Pendientes" },
  { key: "finished", label: "Leídos" },
  { key: "paused", label: "En pausa" },
  { key: "abandoned", label: "Abandonados" },
];

/** Búsqueda insensible a mayúsculas y acentos. */
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

export default function Library() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortAz, setSortAz] = useState(false);
  const [grid, setGrid] = useState(false);

  const visible = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((it) => (it.reading?.status ?? "pending") === filter);
    const q = fold(query.trim());
    if (q) {
      list = list.filter(
        (it) => fold(it.title ?? "").includes(q) || it.authors.some((a) => fold(a).includes(q))
      );
    }
    if (sortAz) {
      list = [...list].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "es"));
    }
    return list;
  }, [items, query, filter, sortAz]);

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

  return (
    <View style={[s.screen, { paddingTop: insets.top + 14 }]}>
      {/* Cabecera propia (las pestañas no llevan cabecera nativa) */}
      <View style={s.header}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={s.h1}>Biblioteca</Text>
          <Text style={{ color: colors.mut, fontSize: 14, fontVariant: ["tabular-nums"] }}>{items.length}</Text>
        </View>
        <Pressable onPress={() => router.push("/collections")} hitSlop={10}>
          <Text style={{ color: colors.ambar, fontSize: 13, fontFamily: fonts.sansSemi }}>▦ Sagas</Text>
        </Pressable>
      </View>

      {/* Buscador + filtros (aparecen a partir de unos cuantos libros) */}
      {items.length > 5 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 8 }}>
          <TextInput
            style={s.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por título o autor"
            placeholderTextColor={colors.mut}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[s.filterChip, active && { backgroundColor: colors.ambar, borderColor: colors.ambar }]}
                >
                  <Text
                    style={{
                      color: active ? colors.inkOnAccent : colors.mut,
                      fontSize: 12,
                      fontFamily: fonts.sansSemi,
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setSortAz((v) => !v)}
              style={[s.filterChip, sortAz && { borderColor: colors.ambar }]}
            >
              <Text style={{ color: sortAz ? colors.ambar : colors.mut, fontSize: 12, fontFamily: fonts.sansSemi }}>
                {sortAz ? "A–Z ✓" : "A–Z"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setGrid((v) => !v)}
              style={[s.filterChip, grid && { borderColor: colors.ambar }]}
            >
              <Text style={{ color: grid ? colors.ambar : colors.mut, fontSize: 12, fontFamily: fonts.sansSemi }}>
                {grid ? "▤ Lista" : "▦ Portadas"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      <FlatList
        key={grid ? "grid" : "list"}
        data={visible}
        numColumns={grid ? 3 : 1}
        columnWrapperStyle={grid ? { gap: 10 } : undefined}
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
          items.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 80, gap: 8 }}>
              <Text style={{ color: colors.marfil, fontSize: 17, fontFamily: fonts.serif }}>
                Tu biblioteca está vacía
              </Text>
              <Text style={{ color: colors.mut, fontSize: 13 }}>
                Pulsa «Escanear» y apunta al código de barras
              </Text>
              <Pressable onPress={() => router.push("/import")} hitSlop={8} style={{ marginTop: 10 }}>
                <Text style={{ color: colors.ambar, fontSize: 13, fontFamily: fonts.sansSemi }}>
                  ¿Vienes de Goodreads? Importa tu biblioteca →
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ color: colors.mut, fontSize: 13 }}>
                Nada coincide con la búsqueda o el filtro
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          items.length > 0 ? (
            <Pressable
              onPress={() => router.push("/import")}
              hitSlop={8}
              style={{ alignItems: "center", paddingVertical: 14 }}
            >
              <Text style={{ color: colors.mut, fontSize: 12 }}>
                Importar biblioteca de Goodreads (CSV)
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => {
          const st = item.reading ? STATUS_LABEL[item.reading.status] : undefined;
          if (grid) {
            return (
              <Pressable style={s.gridCell} onPress={() => router.push(`/book/${item.id}`)}>
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={s.gridCover} contentFit="cover" />
                ) : (
                  <View style={[s.gridCover, s.gridPlaceholder]}>
                    <Text
                      style={{ color: colors.mut, fontSize: 10.5, textAlign: "center", padding: 6 }}
                      numberOfLines={4}
                    >
                      {item.title ?? "Sin título"}
                    </Text>
                  </View>
                )}
                {st && <View style={[s.gridDot, { backgroundColor: st.color }]} />}
                {item.favorite && <Text style={s.gridHeart}>♥</Text>}
              </Pressable>
            );
          }
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
                {item.authors.length > 0 ? (
                  <Text style={s.meta} numberOfLines={1}>
                    {item.authors.join(", ")}
                  </Text>
                ) : item.pages ? (
                  <Text style={s.meta}>{item.pages} págs.</Text>
                ) : null}
              </View>
              {item.favorite && <Text style={{ color: colors.arcilla, fontSize: 13 }}>♥</Text>}
              {st && (
                <View style={[s.pill, { borderColor: st.color }]}>
                  <Text style={{ color: st.color, fontSize: 10, fontFamily: fonts.sansSemi }}>{st.text}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />

    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  h1: { color: colors.papel, fontSize: 26, fontFamily: fonts.serif },
  search: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.papel,
    fontSize: 14.5,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
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
  gridCell: { flex: 1 / 3 },
  gridCover: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
  },
  gridPlaceholder: { alignItems: "center", justifyContent: "center" },
  gridDot: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 9,
    height: 9,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: colors.tinta,
  },
  gridHeart: {
    position: "absolute",
    top: 4,
    right: 6,
    color: colors.arcilla,
    fontSize: 13,
    textShadowColor: colors.tinta,
    textShadowRadius: 3,
  },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  title: { color: colors.papel, fontSize: 14.5, fontFamily: fonts.sansSemi },
  meta: { color: colors.mut, fontSize: 11.5 },
  pill: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
});
