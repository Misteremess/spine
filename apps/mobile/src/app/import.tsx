import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "../lib/api";
import { colors } from "../lib/theme";

type Result = { imported: number; skipped: number; failed: number; total: number };

/**
 * Import del export de Goodreads (plan §5): elegir el CSV y listo.
 * El export se descarga en goodreads.com → My Books → Import and export.
 */
export default function ImportScreen() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickAndImport() {
    setError(null);
    setResult(null);

    const picked = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/comma-separated-values", "public.comma-separated-values-text"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setBusy(true);
    try {
      const csv = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      const res = await api<Result>("/v1/import/goodreads", { method: "POST", body: { csv } });
      setResult(res);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 400
          ? "Ese archivo no parece un export de Goodreads."
          : "No se pudo importar. Comprueba la conexión y reinténtalo."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Stack.Screen options={{ title: "Importar de Goodreads" }} />

      <View style={s.card}>
        <Text style={s.step}>1 · Descarga tu biblioteca</Text>
        <Text style={s.text}>
          En goodreads.com (desde el navegador): <Text style={s.hl}>My Books → Import and
          export → Export library</Text>. Te dará un archivo CSV.
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.step}>2 · Tráela a Spine</Text>
        <Text style={s.text}>
          Se importan títulos, autores, valoraciones, reseñas, estanterías (leído, leyendo,
          pendiente) y fechas de lectura. Los libros que ya tengas se saltan.
        </Text>
        <Pressable style={[s.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => void pickAndImport()}>
          {busy ? (
            <ActivityIndicator color={colors.inkOnAccent} />
          ) : (
            <Text style={s.btnText}>Elegir archivo CSV</Text>
          )}
        </Pressable>
        {busy && (
          <Text style={{ color: colors.mut, fontSize: 12, textAlign: "center" }}>
            Importando… con bibliotecas grandes puede tardar un poco
          </Text>
        )}
      </View>

      {error && <Text style={{ color: colors.arcilla, fontSize: 13.5 }}>{error}</Text>}

      {result && (
        <View style={[s.card, { borderColor: colors.salvia }]}>
          <Text style={[s.step, { color: colors.salvia }]}>Hecho ✓</Text>
          <Text style={s.text}>
            {result.imported} {result.imported === 1 ? "libro importado" : "libros importados"}
            {result.skipped > 0 ? ` · ${result.skipped} ya los tenías` : ""}
            {result.failed > 0 ? ` · ${result.failed} con error` : ""}
          </Text>
          <Pressable style={s.btn} onPress={() => router.back()}>
            <Text style={s.btnText}>Ver mi biblioteca</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  card: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  step: { color: colors.marfil, fontSize: 14, fontWeight: "700" },
  text: { color: colors.mut, fontSize: 13.5, lineHeight: 20 },
  hl: { color: colors.papel },
  btn: {
    backgroundColor: colors.ambar,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: colors.inkOnAccent, fontWeight: "700", fontSize: 14.5 },
});
