import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { api, ApiError } from "../lib/api";
import { useThemeColors, useThemedStyles } from "../lib/settings";
import { fonts, type Palette } from "../lib/theme";
import { Text, TextInput } from "../lib/ui";

type Candidate = {
  isbn13: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  coverUrl: string | null;
};

/**
 * Alta de libro (plan §8): buscador profesional por título/autor/ISBN con
 * datos reales para elegir sin teclear a mano. Si la cascada no resuelve un
 * ISBN escaneado, llega aquí con el código precargado; y si ni buscando ni
 * escaneando aparece, queda el formulario manual como último recurso.
 */
export default function ManualAdd() {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const { isbn } = useLocalSearchParams<{ isbn?: string }>();
  const [query, setQuery] = useState(isbn ?? "");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function search() {
    const q = query.trim();
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
    const key = c.isbn13 ?? c.title;
    if (addingKey) return;
    setAddingKey(key);
    try {
      if (c.isbn13) {
        await api("/v1/library", { method: "POST", body: { isbn: c.isbn13 } });
      } else {
        await api("/v1/library/manual", {
          method: "POST",
          body: { title: c.title, authors: c.authors.join(", ") || undefined },
        });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        Alert.alert("Ya lo tienes", "Ese libro ya está en tu biblioteca.");
      } else {
        Alert.alert("No se pudo añadir", "Comprueba la conexión y reinténtalo.");
      }
    } finally {
      setAddingKey(null);
    }
  }

  async function saveManual() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(false);
    try {
      await api("/v1/library/manual", {
        method: "POST",
        body: {
          title: title.trim(),
          authors: authors.trim() || undefined,
          isbn: isbn || undefined,
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Añadir libro" }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        {isbn ? (
          <View style={s.isbnChip}>
            <Text style={{ color: colors.mut, fontSize: 12 }}>ISBN escaneado</Text>
            <Text style={{ color: colors.papel, fontSize: 15, fontVariant: ["tabular-nums"] }}>
              {isbn}
            </Text>
            <Text style={{ color: colors.mut, fontSize: 11.5 }}>
              No lo encontramos automáticamente — búscalo abajo por título o añádelo a mano.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text style={s.label}>Buscar libro</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Título, autor o ISBN"
              placeholderTextColor={colors.mut}
              returnKeyType="search"
              onSubmitEditing={() => void search()}
              autoFocus={!isbn}
            />
            <Pressable
              style={[s.searchBtn, (query.trim().length < 2 || searching) && { opacity: 0.4 }]}
              disabled={query.trim().length < 2 || searching}
              onPress={() => void search()}
            >
              {searching ? (
                <ActivityIndicator color={colors.inkOnAccent} />
              ) : (
                <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 14 }}>
                  Buscar
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {results !== null && (
          <View style={{ gap: 2 }}>
            {results.length === 0 ? (
              <Text style={{ color: colors.mut, fontSize: 12.5, padding: 8 }}>
                Sin resultados. Prueba con otro título o añádelo a mano.
              </Text>
            ) : (
              <FlatList
                data={results}
                scrollEnabled={false}
                keyExtractor={(c, i) => `${c.isbn13 ?? c.title}-${i}`}
                renderItem={({ item: c }) => {
                  const key = c.isbn13 ?? c.title;
                  const busy = addingKey === key;
                  return (
                    <Pressable
                      style={[s.resultRow, busy && { opacity: 0.5 }]}
                      disabled={Boolean(addingKey)}
                      onPress={() => void addCandidate(c)}
                    >
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
                      {busy ? (
                        <ActivityIndicator color={colors.ambar} />
                      ) : (
                        <Text style={{ color: colors.ambar, fontSize: 20 }}>＋</Text>
                      )}
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        )}

        <Pressable onPress={() => setManualOpen((v) => !v)} hitSlop={8}>
          <Text style={{ color: colors.ambar, fontSize: 12.5, fontFamily: fonts.sansSemi }}>
            {manualOpen ? "Ocultar alta manual ▲" : "¿No lo encuentras? Añádelo a mano ▾"}
          </Text>
        </Pressable>

        {manualOpen && (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Text style={s.label}>Título *</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ej.: Palabras Mágicas"
                placeholderTextColor={colors.mut}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={s.label}>Autores</Text>
              <TextInput
                style={s.input}
                value={authors}
                onChangeText={setAuthors}
                placeholder="Separados por comas"
                placeholderTextColor={colors.mut}
              />
            </View>

            {error && (
              <Text style={{ color: colors.arcilla, fontSize: 13 }}>
                No se pudo guardar. Comprueba la conexión y reinténtalo.
              </Text>
            )}

            <Pressable
              style={[s.btn, (!title.trim() || saving) && { opacity: 0.4 }]}
              disabled={!title.trim() || saving}
              onPress={() => void saveManual()}
            >
              <Text style={s.btnText}>{saving ? "Guardando…" : "Añadir a mi biblioteca"}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  isbnChip: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  label: { color: colors.marfil, fontSize: 13, fontFamily: fonts.sansSemi },
  input: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.papel,
    fontSize: 15,
  },
  btn: {
    backgroundColor: colors.ambar,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 15 },
  searchBtn: {
    backgroundColor: colors.ambar,
    borderRadius: 10,
    paddingHorizontal: 16,
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
