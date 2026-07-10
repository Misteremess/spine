import { toIsbn13 } from "@spine/shared";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "../lib/api";
import { colors, fonts } from "../lib/theme";

type Card = {
  isbn13: string;
  state: "loading" | "added" | "duplicate" | "notfound" | "error";
  title?: string;
  coverUrl?: string;
};

/**
 * Escáner en ráfaga (plan §8): la cámara nunca se cierra. Cada código
 * capturado se apila abajo mientras se resuelve en segundo plano.
 * Con `?target=wishlist` los códigos van a la lista de deseos.
 */
export default function Scanner() {
  const { target } = useLocalSearchParams<{ target?: string }>();
  const toWishlist = target === "wishlist";
  const [permission, requestPermission] = useCameraPermissions();
  const [cards, setCards] = useState<Card[]>([]);
  const seen = useRef(new Set<string>());
  const lastScanAt = useRef(0);

  function patchCard(isbn13: string, patch: Partial<Card>) {
    setCards((cs) => cs.map((c) => (c.isbn13 === isbn13 ? { ...c, ...patch } : c)));
  }

  // Al volver del alta manual, las tarjetas "no encontrado" que ya estén
  // en la biblioteca (por su ISBN guardado) pasan a "añadido".
  useFocusEffect(
    useCallback(() => {
      setCards((cs) => {
        if (!cs.some((c) => c.state === "notfound")) return cs;
        void (async () => {
          try {
            const { items } = await api<{ items: { isbn13: string | null; customIsbn13: string | null }[] }>(
              "/v1/library"
            );
            const owned = new Set(items.flatMap((i) => [i.isbn13, i.customIsbn13].filter(Boolean)));
            setCards((prev) =>
              prev.map((c) => (c.state === "notfound" && owned.has(c.isbn13) ? { ...c, state: "added" } : c))
            );
          } catch {
            /* cosmético: si falla, la tarjeta se queda como está */
          }
        })();
        return cs;
      });
    }, [])
  );

  async function onBarcode(data: string) {
    const now = Date.now();
    if (now - lastScanAt.current < 1200) return; // anti doble disparo
    const isbn13 = toIsbn13(data);
    if (!isbn13 || seen.current.has(isbn13)) return;

    lastScanAt.current = now;
    seen.current.add(isbn13);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCards((cs) => [{ isbn13, state: "loading" }, ...cs]);

    // Modo wishlist: el código va a la lista de deseos con sus datos reales.
    if (toWishlist) {
      try {
        const res = await api<{ item: { title: string | null } }>("/v1/wishlist", {
          method: "POST",
          body: { isbn: isbn13, priority: 2 },
        });
        patchCard(isbn13, { state: "added", title: res.item?.title ?? undefined });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) patchCard(isbn13, { state: "notfound" });
        else {
          patchCard(isbn13, { state: "error" });
          seen.current.delete(isbn13);
        }
      }
      return;
    }

    try {
      const res = await api<{ metadata: { title: string; coverUrl: string | null } }>("/v1/library", {
        method: "POST",
        body: { isbn: isbn13 },
      });
      patchCard(isbn13, {
        state: "added",
        title: res.metadata.title,
        coverUrl: res.metadata.coverUrl ?? undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const meta = e.body.metadata as { title?: string } | undefined;
        patchCard(isbn13, { state: "duplicate", title: meta?.title });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (e instanceof ApiError && e.status === 404) {
        patchCard(isbn13, { state: "notfound" });
      } else {
        patchCard(isbn13, { state: "error" });
        seen.current.delete(isbn13); // reintentable
      }
    }
  }

  if (!permission) return <View style={s.screen} />;

  if (!permission.granted) {
    return (
      <View style={[s.screen, { justifyContent: "center", padding: 32, gap: 16 }]}>
        <Text style={{ color: colors.papel, fontSize: 17, textAlign: "center", fontFamily: fonts.serif }}>
          Spine necesita la cámara para escanear tus libros
        </Text>
        <Pressable style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Permitir cámara</Text>
        </Pressable>
      </View>
    );
  }

  const added = cards.filter((c) => c.state === "added").length;

  return (
    <View style={s.screen}>
      <View style={s.cameraBox}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ["ean13"] }}
          onBarcodeScanned={({ data }) => void onBarcode(data)}
        />
        <View style={s.corners} pointerEvents="none">
          <View style={[s.corner, s.tl]} />
          <View style={[s.corner, s.tr]} />
          <View style={[s.corner, s.bl]} />
          <View style={[s.corner, s.br]} />
        </View>
      </View>

      <View style={s.counterRow}>
        <Text style={{ color: colors.mut, fontSize: 12 }}>
          Sigue escaneando — cada libro se apila abajo
        </Text>
        <View style={s.counter}>
          <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 12 }}>
            {added} añadidos
          </Text>
        </View>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(c) => c.isbn13}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 90 }}
        renderItem={({ item }) => <ScanCard card={item} />}
      />

      <Pressable style={s.done} onPress={() => router.back()}>
        <Text style={s.btnText}>Hecho</Text>
      </Pressable>
    </View>
  );
}

function ScanCard({ card }: { card: Card }) {
  const label = {
    loading: { text: "Buscando…", color: colors.mut },
    added: { text: "✓ Añadido", color: colors.salvia },
    duplicate: { text: "Ya lo tienes", color: colors.ambar },
    notfound: { text: "No encontrado — toca para añadirlo a mano", color: colors.arcilla },
    error: { text: "Error — reinténtalo", color: colors.arcilla },
  }[card.state];

  const notfound = card.state === "notfound";
  return (
    <Pressable
      style={[s.card, notfound && { borderColor: "rgba(193,85,61,.5)" }]}
      disabled={!notfound}
      onPress={() =>
        router.push({ pathname: "/manual", params: { isbn: card.isbn13 } })
      }
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.papel, fontSize: 13.5, fontFamily: fonts.sansSemi }} numberOfLines={1}>
          {card.title ?? `ISBN ${card.isbn13}`}
        </Text>
        <Text style={{ color: label.color, fontSize: 11.5 }}>{label.text}</Text>
      </View>
      {notfound && <Text style={{ color: colors.arcilla, fontSize: 18 }}>›</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  cameraBox: {
    height: 230,
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.tinta2,
  },
  corners: { position: "absolute", top: 28, left: 28, right: 28, bottom: 28 },
  corner: { position: "absolute", width: 26, height: 26, borderColor: colors.ambar },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  counter: {
    backgroundColor: colors.ambar,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  btn: {
    backgroundColor: colors.ambar,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 15 },
  done: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: colors.ambar,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
});
