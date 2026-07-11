import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { Cover } from "../../lib/Cover";
import { useThemeColors, useThemedStyles } from "../../lib/settings";
import { fonts, type Palette } from "../../lib/theme";
import { Text, TextInput } from "../../lib/ui";

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
    format: string | null;
    location: string | null;
    purchaseDate: string | null;
    purchasePriceCents: number | null;
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
    workId: number;
    seriesId: number | null;
  } | null;
  reading: { id: number; status: ReadingStatus; startedAt: string | null; finishedAt: string | null } | null;
  lastProgress: { page: number | null; percent: number | null } | null;
};

const statuses = (colors: Palette): { key: ReadingStatus; label: string; color: string }[] => [
  { key: "pending", label: "Pendiente", color: colors.mut },
  { key: "reading", label: "Leyendo", color: colors.ambar },
  { key: "paused", label: "En pausa", color: colors.mut },
  { key: "finished", label: "Leído", color: colors.salvia },
  { key: "abandoned", label: "Abandonado", color: colors.arcilla },
];

type EjemplarForm = {
  format: string;
  location: string;
  purchaseDate: string;
  price: string;
  notes: string;
};

function toForm(book: Detail["book"]): EjemplarForm {
  return {
    format: book.format ?? "",
    location: book.location ?? "",
    purchaseDate: book.purchaseDate ?? "",
    price: book.purchasePriceCents !== null ? String(book.purchasePriceCents / 100) : "",
    notes: book.notes ?? "",
  };
}

export default function BookDetail() {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const STATUSES = useMemo(() => statuses(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [pageInput, setPageInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EjemplarForm | null>(null);
  const [editingSaga, setEditingSaga] = useState(false);
  const [sagaName, setSagaName] = useState("");
  const [sagaVol, setSagaVol] = useState("");
  const [sagaResults, setSagaResults] = useState<{ id: number; name: string; totalVolumes: number | null; owned: boolean }[]>([]);

  const load = useCallback(async () => {
    try {
      const d = await api<Detail>(`/v1/library/${id}`);
      setDetail(d);
      setForm(toForm(d.book));
    } catch {
      router.back();
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Buscar sagas al editar (las tuyas primero, luego el catálogo).
  useEffect(() => {
    if (!editingSaga) return;
    const t = setTimeout(() => {
      api<{ items: typeof sagaResults }>(`/v1/series?q=${encodeURIComponent(sagaName.trim())}`)
        .then((d) => setSagaResults(d.items))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [editingSaga, sagaName]);

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

  async function toggleFavorite() {
    const next = !book.favorite;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetail((d) => (d ? { ...d, book: { ...d.book, favorite: next } } : d));
    await api(`/v1/library/${book.id}`, { method: "PATCH", body: { favorite: next } });
  }

  const formDirty = form !== null && JSON.stringify(form) !== JSON.stringify(toForm(book));

  async function saveEjemplar() {
    if (!form) return;
    const price = Number(form.price.replace(",", "."));
    const patch = {
      format: form.format.trim() || null,
      location: form.location.trim() || null,
      purchaseDate: /^\d{4}-\d{2}-\d{2}$/.test(form.purchaseDate.trim())
        ? form.purchaseDate.trim()
        : null,
      purchasePriceCents:
        form.price.trim() && Number.isFinite(price) && price >= 0 ? Math.round(price * 100) : null,
      notes: form.notes.trim() || null,
    };
    setSaving(true);
    try {
      await api(`/v1/library/${book.id}`, { method: "PATCH", body: patch });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveSaga(seriesId?: number) {
    if (!edition) return;
    const vol = Number(sagaVol);
    const volume = Number.isInteger(vol) && vol >= 1 ? vol : null;
    setSaving(true);
    try {
      await api(`/v1/library/${book.id}/series`, {
        method: "PATCH",
        body: seriesId != null ? { seriesId, volume } : { series: sagaName.trim() || null, volume },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingSaga(false);
      setSagaResults([]);
      await load();
    } finally {
      setSaving(false);
    }
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
        <Cover title={title} author={edition?.authors[0]} coverUrl={edition?.coverUrl} style={s.cover} titleSize={12} />
        <View style={{ flex: 1, gap: 5, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text style={[s.title, { flex: 1 }]}>{title}</Text>
            <Pressable onPress={() => void toggleFavorite()} hitSlop={10}>
              <Text style={{ fontSize: 22, color: book.favorite ? colors.arcilla : colors.tinta3 }}>
                {book.favorite ? "♥" : "♡"}
              </Text>
            </Pressable>
          </View>
          {authors ? <Text style={s.authors}>{authors}</Text> : null}
          {edition?.series ? (
            <Pressable
              onPress={() =>
                edition.seriesId ? router.push(`/series/${edition.seriesId}`) : router.push("/collections")
              }
              hitSlop={6}
            >
              <Text style={{ color: colors.ambar, fontSize: 12.5, fontFamily: fonts.sansSemi }}>
                ▦ {edition.series}
                {edition.seriesVolume ? ` · tomo ${edition.seriesVolume}` : ""} ›
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
                    fontFamily: fonts.sansSemi,
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

      {/* Etiquetas del ejemplar (plan §5.1) */}
      <BookTags userBookId={book.id} />

      {/* Saga: asignar o corregir la serie a mano (solo libros de catálogo) */}
      {edition && (
        <View style={s.section}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={s.sectionTitle}>Saga</Text>
            {!editingSaga && (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setSagaName(edition.series ?? "");
                  setSagaVol(edition.seriesVolume ? String(edition.seriesVolume) : "");
                  setEditingSaga(true);
                }}
              >
                <Text style={{ color: colors.ambar, fontSize: 12.5, fontFamily: fonts.sansSemi }}>
                  {edition.series ? "Cambiar" : "Asignar"}
                </Text>
              </Pressable>
            )}
          </View>
          {editingSaga ? (
            <View style={{ gap: 10 }}>
              <TextInput
                style={s.fieldInput}
                value={sagaName}
                onChangeText={setSagaName}
                placeholder="Busca una saga o escribe una nueva"
                placeholderTextColor={colors.mut}
                autoFocus
              />
              {sagaResults.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => void saveSaga(r.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: r.id === edition.seriesId ? colors.ambar : colors.tinta3,
                    backgroundColor: colors.tinta,
                  }}
                >
                  <Text style={{ flex: 1, color: colors.papel, fontSize: 14 }} numberOfLines={1}>▦ {r.name}</Text>
                  {r.owned ? (
                    <Text style={{ color: colors.salvia, fontSize: 10.5, fontFamily: fonts.sansSemi }}>en tu biblioteca</Text>
                  ) : null}
                </Pressable>
              ))}
              <TextInput
                style={s.fieldInput}
                value={sagaVol}
                onChangeText={setSagaVol}
                placeholder="Nº de tomo (opcional)"
                placeholderTextColor={colors.mut}
                keyboardType="number-pad"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  style={[s.btn, { flex: 1, paddingVertical: 11, alignItems: "center" }, saving && { opacity: 0.5 }]}
                  disabled={saving}
                  onPress={() => void saveSaga()}
                >
                  <Text style={s.btnText}>{saving ? "Guardando…" : "Guardar saga"}</Text>
                </Pressable>
                <Pressable style={{ justifyContent: "center", paddingHorizontal: 8 }} onPress={() => setEditingSaga(false)}>
                  <Text style={{ color: colors.mut, fontSize: 13 }}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          ) : edition.series ? (
            <Pressable onPress={() => edition.seriesId && router.push(`/series/${edition.seriesId}`)}>
              <Text style={{ color: colors.papel, fontSize: 14 }}>
                ▦ {edition.series}
                {edition.seriesVolume ? ` · tomo ${edition.seriesVolume}` : ""}
              </Text>
            </Pressable>
          ) : (
            <Text style={{ color: colors.mut, fontSize: 12.5 }}>
              Este libro no está en ninguna saga. Asígnala si pertenece a una (ej. La Rueda del Tiempo).
            </Text>
          )}
        </View>
      )}

      {/* Tu ejemplar: la parte inventario del coleccionista (plan §5.1) */}
      {form && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tu ejemplar</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.fieldLabel}>Formato</Text>
              <TextInput
                style={s.fieldInput}
                value={form.format}
                onChangeText={(v) => setForm({ ...form, format: v })}
                placeholder="Tapa blanda…"
                placeholderTextColor={colors.mut}
              />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.fieldLabel}>Ubicación</Text>
              <TextInput
                style={s.fieldInput}
                value={form.location}
                onChangeText={(v) => setForm({ ...form, location: v })}
                placeholder="Estantería A…"
                placeholderTextColor={colors.mut}
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.fieldLabel}>Precio (€)</Text>
              <TextInput
                style={s.fieldInput}
                value={form.price}
                onChangeText={(v) => setForm({ ...form, price: v })}
                placeholder="9,95"
                placeholderTextColor={colors.mut}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.fieldLabel}>Fecha de compra</Text>
              <TextInput
                style={s.fieldInput}
                value={form.purchaseDate}
                onChangeText={(v) => setForm({ ...form, purchaseDate: v })}
                placeholder="2026-07-10"
                placeholderTextColor={colors.mut}
              />
            </View>
          </View>
          <View style={{ gap: 5 }}>
            <Text style={s.fieldLabel}>Notas</Text>
            <TextInput
              style={[s.fieldInput, { minHeight: 70, textAlignVertical: "top" }]}
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
              placeholder="Firmado, edición limitada, prestado a…"
              placeholderTextColor={colors.mut}
              multiline
            />
          </View>
          {formDirty && (
            <Pressable
              style={[s.btn, { paddingVertical: 12, alignItems: "center" }, saving && { opacity: 0.5 }]}
              disabled={saving}
              onPress={() => void saveEjemplar()}
            >
              <Text style={s.btnText}>{saving ? "Guardando…" : "Guardar cambios"}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Préstamo (plan §5.5 / diferencial §6): a quién y desde cuándo */}
      <Loan userBookId={book.id} />

      {/* Notas y citas privadas (plan §5.8) */}
      <Notes userBookId={book.id} />

      {edition?.description ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sinopsis</Text>
          <Text style={s.description}>{edition.description}</Text>
        </View>
      ) : null}

      {edition?.workId ? <Reviews workId={edition.workId} /> : null}

      <Pressable style={s.deleteBtn} onPress={confirmDelete}>
        <Text style={{ color: colors.arcilla, fontFamily: fonts.sansSemi, fontSize: 14 }}>
          Eliminar de mi biblioteca
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * Reseñas públicas de la obra: tu reseña (estrellas + texto) y las de la
 * comunidad con la media. Las estrellas siguen el patrón de la valoración
 * privada: toque = entera, segundo toque = media, tercero = quitar.
 */
function Reviews({ workId }: { workId: number }) {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  type ReviewList = {
    reviews: { id: number; rating: number; text: string | null; spoilers: boolean; userName: string; own: boolean; updatedAt: string }[];
    count: number;
    average: number | null;
    mine: { rating: number; text: string | null; spoilers: boolean } | null;
  };
  const [data, setData] = useState<ReviewList | null>(null);
  const [editing, setEditing] = useState(false);
  const [rating, setRatingInput] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSpoilers, setShowSpoilers] = useState<Set<number>>(new Set());

  const loadReviews = useCallback(async () => {
    try {
      setData(await api<ReviewList>(`/v1/works/${workId}/reviews`));
    } catch {
      /* las reseñas nunca rompen la ficha */
    }
  }, [workId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  async function publish() {
    if (rating < 1 || saving) return;
    setSaving(true);
    try {
      await api(`/v1/works/${workId}/review`, {
        method: "PUT",
        body: { rating, text: text.trim() || undefined },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
      await loadReviews();
    } finally {
      setSaving(false);
    }
  }

  if (!data) return null;

  const stars = (r: number, size = 14) => (
    <Text style={{ color: colors.ambar, fontSize: size }}>
      {"★".repeat(Math.floor(r / 2))}
      {r % 2 === 1 ? "⯨" : ""}
      <Text style={{ color: colors.tinta3 }}>{"★".repeat(5 - Math.ceil(r / 2))}</Text>
    </Text>
  );

  return (
    <View style={s.section}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={s.sectionTitle}>Reseñas</Text>
        {data.average !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {stars(Math.round(data.average))}
            <Text style={{ color: colors.mut, fontSize: 11.5, fontVariant: ["tabular-nums"] }}>
              {(data.average / 2).toFixed(1)} · {data.count}
            </Text>
          </View>
        )}
      </View>

      {editing ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const glyph = rating >= star * 2 ? "★" : rating === star * 2 - 1 ? "⯨" : "☆";
              return (
                <Pressable
                  key={star}
                  hitSlop={6}
                  onPress={() =>
                    setRatingInput(rating === star * 2 ? star * 2 - 1 : rating === star * 2 - 1 ? 0 : star * 2)
                  }
                >
                  <Text style={{ fontSize: 28, color: glyph === "☆" ? colors.tinta3 : colors.ambar }}>{glyph}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={[s.fieldInput, { minHeight: 80, textAlignVertical: "top" }]}
            value={text}
            onChangeText={setText}
            placeholder="¿Qué te ha parecido? (opcional)"
            placeholderTextColor={colors.mut}
            multiline
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={[s.btn, { flex: 1, paddingVertical: 11, alignItems: "center" }, (rating < 1 || saving) && { opacity: 0.4 }]}
              disabled={rating < 1 || saving}
              onPress={() => void publish()}
            >
              <Text style={s.btnText}>{saving ? "Publicando…" : "Publicar reseña"}</Text>
            </Pressable>
            <Pressable style={{ justifyContent: "center", paddingHorizontal: 8 }} onPress={() => setEditing(false)}>
              <Text style={{ color: colors.mut, fontSize: 13 }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={s.reviewCta}
          onPress={() => {
            setRatingInput(data.mine?.rating ?? 0);
            setText(data.mine?.text ?? "");
            setEditing(true);
          }}
        >
          <Text style={{ color: colors.ambar, fontSize: 13, fontFamily: fonts.sansSemi }}>
            {data.mine ? "✎ Editar tu reseña" : "✎ Escribir una reseña"}
          </Text>
        </Pressable>
      )}

      {data.reviews.map((r) => {
        const hidden = r.spoilers && !r.own && !showSpoilers.has(r.id);
        return (
          <View key={r.id} style={s.reviewCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: colors.papel, fontSize: 12.5, fontFamily: fonts.sansSemi, flex: 1 }}>
                {r.own ? "Tu reseña" : r.userName}
              </Text>
              {stars(r.rating, 12)}
            </View>
            {r.text ? (
              hidden ? (
                <Pressable onPress={() => setShowSpoilers((prev) => new Set(prev).add(r.id))}>
                  <Text style={{ color: colors.mut, fontSize: 12.5, fontStyle: "italic" }}>
                    Contiene spoilers · toca para leer
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ color: colors.marfil, fontSize: 13, lineHeight: 19 }}>{r.text}</Text>
              )
            ) : null}
          </View>
        );
      })}
      {data.count === 0 && !editing && (
        <Text style={{ color: colors.mut, fontSize: 12 }}>Nadie ha reseñado este libro todavía. Estrena tú.</Text>
      )}
    </View>
  );
}

/** Etiquetas: chips con × y alta por nombre (crea la etiqueta si no existe). */
function BookTags({ userBookId }: { userBookId: number }) {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  type Tag = { id: number; name: string; color: string | null };
  const [tags, setTags] = useState<Tag[]>([]);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ items: Tag[] }>(`/v1/library/${userBookId}/tags`);
      setTags(d.items);
    } catch {
      /* las etiquetas nunca rompen la ficha */
    }
  }, [userBookId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    const name = input.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await api(`/v1/library/${userBookId}/tags`, { method: "POST", body: { name } });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInput("");
      Keyboard.dismiss();
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function remove(tagId: number) {
    setTags((t) => t.filter((x) => x.id !== tagId));
    await api(`/v1/library/${userBookId}/tags/${tagId}`, { method: "DELETE" }).catch(() => load());
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Etiquetas</Text>
      {tags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {tags.map((t) => (
            <Pressable key={t.id} style={s.tagChip} onPress={() => void remove(t.id)} hitSlop={4}>
              <Text style={{ color: colors.ambar, fontSize: 12.5, fontFamily: fonts.sansSemi }}>
                {t.name}
              </Text>
              <Text style={{ color: colors.mut, fontSize: 13 }}> ×</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nueva etiqueta (manga, firmado…)"
          placeholderTextColor={colors.mut}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={() => void add()}
        />
        <Pressable
          style={[s.btn, (!input.trim() || adding) && { opacity: 0.4 }]}
          disabled={!input.trim() || adding}
          onPress={() => void add()}
        >
          <Text style={s.btnText}>Añadir</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Préstamo: si está prestado muestra a quién y "me lo devolvió"; si no, el formulario. */
function Loan({ userBookId }: { userBookId: number }) {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  type LoanRow = { id: number; borrower: string; loanedAt: string; dueAt: string | null; returnedAt: string | null };
  const [active, setActive] = useState<LoanRow | null>(null);
  const [borrower, setBorrower] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ active: LoanRow | null }>(`/v1/library/${userBookId}/loans`);
      setActive(d.active);
    } catch {
      /* no romper la ficha */
    }
  }, [userBookId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function lend() {
    if (!borrower.trim() || saving) return;
    setSaving(true);
    try {
      await api(`/v1/library/${userBookId}/loans`, {
        method: "POST",
        body: { borrower: borrower.trim(), dueAt: /^\d{4}-\d{2}-\d{2}$/.test(dueAt.trim()) ? dueAt.trim() : null },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBorrower("");
      setDueAt("");
      Keyboard.dismiss();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function giveBack() {
    if (!active) return;
    setSaving(true);
    try {
      await api(`/v1/loans/${active.id}/return`, { method: "POST" });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Préstamo</Text>
      {active ? (
        <>
          <Text style={{ color: colors.papel, fontSize: 14 }}>
            Prestado a <Text style={{ fontFamily: fonts.sansSemi, color: colors.ambar }}>{active.borrower}</Text>
          </Text>
          <Text style={s.meta}>
            Desde el {active.loanedAt}
            {active.dueAt ? ` · recuérdalo el ${active.dueAt}` : ""}
          </Text>
          <Pressable
            style={[s.btn, { paddingVertical: 11, alignItems: "center" }, saving && { opacity: 0.5 }]}
            disabled={saving}
            onPress={() => void giveBack()}
          >
            <Text style={s.btnText}>Me lo devolvió</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={s.fieldInput}
            value={borrower}
            onChangeText={setBorrower}
            placeholder="¿A quién se lo prestas?"
            placeholderTextColor={colors.mut}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[s.fieldInput, { flex: 1 }]}
              value={dueAt}
              onChangeText={setDueAt}
              placeholder="Recordatorio (2026-08-01)"
              placeholderTextColor={colors.mut}
            />
            <Pressable
              style={[s.btn, (!borrower.trim() || saving) && { opacity: 0.4 }]}
              disabled={!borrower.trim() || saving}
              onPress={() => void lend()}
            >
              <Text style={s.btnText}>Prestar</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

/** Notas y citas: lista + alta con página opcional y toggle "es cita". */
function Notes({ userBookId }: { userBookId: number }) {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  type Note = { id: number; text: string; page: number | null; isQuote: boolean; createdAt: string };
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [isQuote, setIsQuote] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ items: Note[] }>(`/v1/library/${userBookId}/notes`);
      setNotes(d.items);
    } catch {
      /* no romper la ficha */
    }
  }, [userBookId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!text.trim() || saving) return;
    const p = Number(page);
    setSaving(true);
    try {
      await api(`/v1/library/${userBookId}/notes`, {
        method: "POST",
        body: { text: text.trim(), page: Number.isInteger(p) && p > 0 ? p : null, isQuote },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setText("");
      setPage("");
      setIsQuote(false);
      Keyboard.dismiss();
      await load();
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(id: number) {
    Alert.alert("Eliminar nota", "Esta nota se borrará.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setNotes((n) => n.filter((x) => x.id !== id));
          await api(`/v1/notes/${id}`, { method: "DELETE" }).catch(() => load());
        },
      },
    ]);
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Notas y citas</Text>
      {notes.map((n) => (
        <Pressable key={n.id} style={s.reviewCard} onLongPress={() => confirmRemove(n.id)}>
          <Text
            style={{
              color: n.isQuote ? colors.marfil : colors.papel,
              fontSize: 13.5,
              lineHeight: 20,
              fontStyle: n.isQuote ? "italic" : "normal",
              fontFamily: n.isQuote ? fonts.serifMedium : fonts.sans,
            }}
          >
            {n.isQuote ? `“${n.text}”` : n.text}
          </Text>
          {n.page !== null && <Text style={s.meta}>pág. {n.page}</Text>}
        </Pressable>
      ))}
      <TextInput
        style={[s.fieldInput, { minHeight: 60, textAlignVertical: "top" }]}
        value={text}
        onChangeText={setText}
        placeholder="Escribe una nota o una cita…"
        placeholderTextColor={colors.mut}
        multiline
      />
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <TextInput
          style={[s.fieldInput, { width: 90 }]}
          value={page}
          onChangeText={setPage}
          placeholder="Página"
          placeholderTextColor={colors.mut}
          keyboardType="number-pad"
        />
        <Pressable
          style={[s.pill, isQuote && { backgroundColor: colors.ambar, borderColor: colors.ambar }]}
          onPress={() => setIsQuote((q) => !q)}
        >
          <Text style={{ color: isQuote ? colors.inkOnAccent : colors.mut, fontSize: 12.5, fontFamily: fonts.sansSemi }}>
            Es cita
          </Text>
        </Pressable>
        <Pressable
          style={[s.btn, { flex: 1, alignItems: "center" }, (!text.trim() || saving) && { opacity: 0.4 }]}
          disabled={!text.trim() || saving}
          onPress={() => void add()}
        >
          <Text style={s.btnText}>{saving ? "Guardando…" : "Añadir"}</Text>
        </Pressable>
      </View>
      {notes.length === 0 && (
        <Text style={{ color: colors.mut, fontSize: 12 }}>
          Guarda citas favoritas o notas de lectura. Mantén pulsada una nota para borrarla.
        </Text>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.tinta3,
    backgroundColor: colors.tinta,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cover: {
    width: 108,
    height: 158,
    borderRadius: 8,
    backgroundColor: colors.tinta3,
  },
  title: { color: colors.papel, fontSize: 21, fontFamily: fonts.serif, lineHeight: 26 },
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
  sectionTitle: { color: colors.marfil, fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 0.4 },
  pill: {
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  description: { color: colors.marfil, fontSize: 13.5, lineHeight: 20 },
  fieldLabel: { color: colors.mut, fontSize: 11.5, fontFamily: fonts.sansSemi },
  fieldInput: {
    backgroundColor: colors.tinta,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.papel,
    fontSize: 13.5,
  },
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
  btnText: { color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 14 },
  deleteBtn: { alignItems: "center", paddingVertical: 12 },
  reviewCta: { paddingVertical: 2 },
  reviewCard: {
    backgroundColor: colors.tinta,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 10,
    padding: 11,
    gap: 5,
  },
});
