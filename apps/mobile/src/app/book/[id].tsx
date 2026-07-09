import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";

type ReadingStatus = "pending" | "reading" | "paused" | "finished" | "abandoned";

type Detail = {
  book: {
    id: number;
    customTitle: string | null;
    customAuthors: string | null;
    customIsbn13: string | null;
    favorite: boolean;
    rating: number | null;
    notes: string | null;
  };
  edition: {
    isbn13: string;
    title: string;
    subtitle: string | null;
    pages: number | null;
    publishedDate: string | null;
    coverUrl: string | null;
    publisher: string | null;
    description: string | null;
    authors: string[];
    series: string | null;
    seriesVolume: number | null;
  } | null;
  reading: { id: number; status: ReadingStatus; startedAt: string | null; finishedAt: string | null } | null;
  lastProgress: { page: number | null; percent: number | null } | null;
};

const STATUSES: { key: ReadingStatus; label: string; color: string }[] = [
  { key: "pending", label: "Pendiente", color: colors.mut },
  { key: "reading", label: "Leyendo", color: colors.ambar },
  { key: "paused", label: "En pausa", color: colors.mut },
  { key: "finished", label: "Leído", color: colors.salvia },
  { key: "abandoned", label: "Abandonado", color: colors.arcilla },
];

export default function BookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [pageInput, setPageInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await api<Detail>(`/v1/library/${id}`));
    } catch {
      router.back();
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!detail) {
    return (
      <View style={[s.screen, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.ambar} />
      </View>
    );
  }

  const { book, edition, reading, lastProgress } = detail;
  const title = edition?.title ?? book.customTitle ?? "Sin título";
  const authors = edition?.authors.length ? edition.authors.join(", ") : book.customAuthors;
  const isbn13 = edition?.isbn13 ?? book.customIsbn13;
  const pages = edition?.pages ?? null;
  const percent =
    lastProgress?.percent ??
    (lastProgress?.page && pages ? Math.min(100, Math.round((lastProgress.page / pages) * 100)) : null);

  async function setStatus(status: ReadingStatus) {
    if (reading?.status === status) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await api(`/v1/library/${book.id}/status`, { method: "POST", body: { status } });
    await load();
  }

  async function setRating(next: number | null) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetail((d) => (d ? { ...d, book: { ...d.book, rating: next } } : d));
    await api(`/v1/library/${book.id}`, { method: "PATCH", body: { rating: next } });
  }

  async function saveProgress() {
    const page = Number(pageInput);
    if (!Number.isInteger(page) || page <= 0) return;
    setSaving(true);
    try {
      await api(`/v1/library/${book.id}/progress`, { method: "POST", body: { page } });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPageInput("");
      Keyboard.dismiss();
      await load();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Eliminar libro", `«${title}» saldrá de tu biblioteca. Esto no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await api(`/v1/library/${book.id}`, { method: "DELETE" });
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20 }}>
      <Stack.Screen options={{ title: "" }} />

      {/* Cabecera: portada + datos */}
      <View style={{ flexDirection: "row", gap: 16 }}>
        {edition?.coverUrl ? (
          <Image source={{ uri: edition.coverUrl }} style={s.cover} contentFit="cover" />
        ) : (
          <View style={[s.cover, { alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: colors.mut, fontSize: 11, textAlign: "center" }}>sin{"\n"}portada</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 5, justifyContent: "center" }}>
          <Text style={s.title}>{title}</Text>
          {authors ? <Text style={s.authors}>{authors}</Text> : null}
          {edition?.series ? (
            <Pressable onPress={() => router.push("/collections")} hitSlop={6}>
              <Text style={{ color: colors.ambar, fontSize: 12.5, fontWeight: "600" }}>
                ▦ {edition.series}
                {edition.seriesVolume ? ` · tomo ${edition.seriesVolume}` : ""}
              </Text>
            </Pressable>
          ) : null}
          <Text style={s.meta}>
            {[edition?.publisher, pages ? `${pages} págs.` : null, edition?.publishedDate]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {isbn13 ? <Text style={[s.meta, { fontVariant: ["tabular-nums"] }]}>ISBN {isbn13}</Text> : null}
        </View>
      </View>

      {/* Estado de lectura */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Estado</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {STATUSES.map((st) => {
            const active = reading?.status === st.key;
            return (
              <Pressable
                key={st.key}
                onPress={() => void setStatus(st.key)}
                style={[s.pill, active && { backgroundColor: st.color, borderColor: st.color }]}
              >
                <Text
                  style={{
                    color: active ? colors.inkOnAccent : st.color,
                    fontSize: 12.5,
                    fontWeight: "600",
                  }}
                >
                  {st.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Progreso: el hábito diario en dos toques */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Progreso</Text>
        {lastProgress?.page ? (
          <Text style={s.meta}>
            Vas por la página {lastProgress.page}
            {pages ? ` de ${pages}` : ""}
            {percent !== null ? ` · ${percent}%` : ""}
          </Text>
        ) : (
          <Text style={s.meta}>Aún sin progreso registrado</Text>
        )}
        {percent !== null && (
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${percent}%` }]} />
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            style={s.input}
            value={pageInput}
            onChangeText={setPageInput}
            placeholder="Página actual"
            placeholderTextColor={colors.mut}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={() => void saveProgress()}
          />
          <Pressable
            style={[s.btn, (!pageInput || saving) && { opacity: 0.4 }]}
            disabled={!pageInput || saving}
            onPress={() => void saveProgress()}
          >
            <Text style={s.btnText}>Guardar</Text>
          </Pressable>
        </View>
      </View>

      {/* Valoración en medias estrellas (1..10) */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Tu valoración</Text>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          {[1, 2, 3, 4, 5].map((star) => {
            const r = book.rating ?? 0;
            const glyph = r >= star * 2 ? "★" : r === star * 2 - 1 ? "⯨" : "☆";
            return (
              <Pressable
                key={star}
                hitSlop={6}
                onPress={() => {
                  // 1er toque: estrella completa · 2º: media · 3º: quitar
                  const next = r === star * 2 ? star * 2 - 1 : r === star * 2 - 1 ? null : star * 2;
                  void setRating(next);
                }}
              >
                <Text style={{ fontSize: 30, color: glyph === "☆" ? colors.tinta3 : colors.ambar }}>
                  {glyph}
                </Text>
              </Pressable>
            );
          })}
          {book.rating ? (
            <Text style={[s.meta, { marginLeft: 8 }]}>{(book.rating / 2).toFixed(1).replace(".0", "")} / 5</Text>
          ) : null}
        </View>
      </View>

      {edition?.description ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sinopsis</Text>
          <Text style={s.description}>{edition.description}</Text>
        </View>
      ) : null}

      <Pressable style={s.deleteBtn} onPress={confirmDelete}>
        <Text style={{ color: colors.arcilla, fontWeight: "600", fontSize: 14 }}>
          Eliminar de mi biblioteca
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  cover: {
    width: 108,
    height: 158,
    borderRadius: 8,
    backgroundColor: colors.tinta3,
  },
  title: { color: colors.papel, fontSize: 21, fontFamily: "Georgia", lineHeight: 26 },
  authors: { color: colors.marfil, fontSize: 14 },
  meta: { color: colors.mut, fontSize: 12.5 },
  section: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { color: colors.marfil, fontSize: 13, fontWeight: "700", letterSpacing: 0.4 },
  pill: {
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  description: { color: colors.marfil, fontSize: 13.5, lineHeight: 20 },
  barTrack: { height: 6, borderRadius: 99, backgroundColor: colors.tinta3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 99, backgroundColor: colors.ambar },
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
  btn: {
    backgroundColor: colors.ambar,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  btnText: { color: colors.inkOnAccent, fontWeight: "700", fontSize: 14 },
  deleteBtn: { alignItems: "center", paddingVertical: 12 },
});
