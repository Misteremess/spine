import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { Cover } from "../../lib/Cover";
import { useThemeColors, useThemedStyles } from "../../lib/settings";
import { spineColor, spineHeight, spineInk, spineWidth } from "../../lib/spine";
import { fonts, type Palette } from "../../lib/theme";
import { Text, TextInput } from "../../lib/ui";

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
  loanedTo: string | null;
  tags: { id: number; name: string; color: string | null }[];
};

const statusLabels = (colors: Palette): Record<string, { text: string; color: string }> => ({
  pending: { text: "Pendiente", color: colors.mut },
  reading: { text: "Leyendo", color: colors.ambar },
  paused: { text: "En pausa", color: colors.mut },
  finished: { text: "Leído", color: colors.salvia },
  abandoned: { text: "Abandonado", color: colors.arcilla },
});

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
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const STATUS_LABEL = useMemo(() => statusLabels(colors), [colors]);
  const [items, setItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortAz, setSortAz] = useState(false);
  const [view, setView] = useState<"list" | "grid" | "spine">("list");

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable
            onPress={() => setView((v) => (v === "list" ? "grid" : v === "grid" ? "spine" : "list"))}
            style={[s.viewToggle, view !== "list" && { borderColor: colors.ambar }]}
            hitSlop={8}
          >
            <Text style={{ color: view !== "list" ? colors.ambar : colors.marfil, fontSize: 12.5, fontFamily: fonts.sansSemi }}>
              {view === "list" ? "▦ Mosaico" : view === "grid" ? "▥ Lomos" : "▤ Lista"}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/collections")} hitSlop={10}>
            <Text style={{ color: colors.ambar, fontSize: 13, fontFamily: fonts.sansSemi }}>▦ Sagas</Text>
          </Pressable>
        </View>
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
          </ScrollView>
        </View>
      )}

      {view === "spine" ? (
        <Shelf items={visible} refreshing={refreshing} onRefresh={load} setRefreshing={setRefreshing} />
      ) : (
      <FlatList
        key={view}
        data={visible}
        numColumns={view === "grid" ? 3 : 1}
        columnWrapperStyle={view === "grid" ? { gap: 10 } : undefined}
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
          if (view === "grid") {
            return (
              <Pressable style={s.gridCell} onPress={() => router.push(`/book/${item.id}`)}>
                <Cover
                  title={item.title}
                  author={item.authors[0]}
                  coverUrl={item.coverUrl}
                  style={s.gridCover}
                  titleSize={13}
                />
                {st && <View style={[s.gridDot, { backgroundColor: st.color }]} />}
                {item.favorite && <Text style={s.gridHeart}>♥</Text>}
              </Pressable>
            );
          }
          return (
            <Pressable style={s.card} onPress={() => router.push(`/book/${item.id}`)}>
              <Cover title={item.title} author={item.authors[0]} coverUrl={item.coverUrl} style={s.cover} titleSize={10} radius={6} />
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
                {item.loanedTo ? (
                  <Text style={{ color: colors.arcilla, fontSize: 11, fontFamily: fonts.sansSemi }} numberOfLines={1}>
                    → prestado a {item.loanedTo}
                  </Text>
                ) : null}
                {item.tags.length > 0 ? (
                  <Text style={{ color: colors.salvia, fontSize: 10.5 }} numberOfLines={1}>
                    {item.tags.map((t) => t.name).join(" · ")}
                  </Text>
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
      )}

    </View>
  );
}

/**
 * Vista estantería (plan §6.3): los libros como lomos de colores, grosor
 * proporcional a las páginas. La captura firma de Spine.
 */
function Shelf({
  items,
  refreshing,
  onRefresh,
  setRefreshing,
}: {
  items: Item[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  setRefreshing: (v: boolean) => void;
}) {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  if (items.length === 0) {
    return (
      <View style={{ alignItems: "center", marginTop: 60 }}>
        <Text style={{ color: colors.mut, fontSize: 13 }}>Nada que mostrar en la estantería</Text>
      </View>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 20 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.ambar}
          onRefresh={async () => {
            setRefreshing(true);
            await onRefresh();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={s.shelfRow}>
        {items.map((it) => {
          const seed = it.title ?? String(it.id);
          const bg = spineColor(seed);
          const ink = spineInk(bg);
          const h = spineHeight(seed);
          return (
            <Pressable
              key={it.id}
              onPress={() => router.push(`/book/${it.id}`)}
              style={[s.spine, { width: spineWidth(it.pages), height: h, backgroundColor: bg }]}
            >
              {/* Franja superior tenue: da relieve de lomo. */}
              <View style={{ height: 6, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.14)" }} />
              <Text numberOfLines={1} style={[s.spineText, { color: ink, width: h - 34 }]}>
                {it.title ?? "Sin título"}
              </Text>
              {it.favorite ? (
                <Text style={{ color: ink, fontSize: 9, opacity: 0.85, marginBottom: 4 }}>♥</Text>
              ) : (
                <View style={{ height: 10 }} />
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: colors.mut, fontSize: 11.5, textAlign: "center" }}>
        Cada lomo es un libro · el grosor son sus páginas
      </Text>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
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
  viewToggle: {
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
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
  shelfRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 4,
    borderBottomWidth: 3,
    borderBottomColor: colors.tinta3,
    paddingBottom: 3,
  },
  spine: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  spineText: {
    fontSize: 10,
    fontFamily: fonts.sansSemi,
    textAlign: "center",
    transform: [{ rotate: "90deg" }],
  },
  title: { color: colors.papel, fontSize: 14.5, fontFamily: fonts.sansSemi },
  meta: { color: colors.mut, fontSize: 11.5 },
  pill: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
});
