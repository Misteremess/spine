import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../lib/api";
import { colors } from "../lib/theme";

/**
 * Alta manual (plan §8): cuando la cascada no resuelve un ISBN, el escaneo
 * no muere — llega aquí con el código precargado y el usuario lo completa.
 */
export default function ManualAdd() {
  const { isbn } = useLocalSearchParams<{ isbn?: string }>();
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
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
      <Stack.Screen options={{ title: "Añadir a mano" }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        {isbn ? (
          <View style={s.isbnChip}>
            <Text style={{ color: colors.mut, fontSize: 12 }}>ISBN escaneado</Text>
            <Text style={{ color: colors.papel, fontSize: 15, fontVariant: ["tabular-nums"] }}>
              {isbn}
            </Text>
            <Text style={{ color: colors.mut, fontSize: 11.5 }}>
              No lo encontramos en las fuentes — se guardará con tu libro por si aparece más adelante.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text style={s.label}>Título *</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej.: Palabras Mágicas"
            placeholderTextColor={colors.mut}
            autoFocus
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
          onPress={() => void save()}
        >
          <Text style={s.btnText}>{saving ? "Guardando…" : "Añadir a mi biblioteca"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  isbnChip: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  label: { color: colors.marfil, fontSize: 13, fontWeight: "600" },
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
  btnText: { color: colors.inkOnAccent, fontWeight: "700", fontSize: 15 },
});
