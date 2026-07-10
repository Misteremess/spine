/**
 * Vida del club: el libro que se está leyendo, el hilo de debate y el
 * código para invitar. El owner elige el libro actual desde su biblioteca.
 */
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { colors, fonts } from "../../lib/theme";

type Detail = {
  club: {
    id: number;
    name: string;
    description: string | null;
    inviteCode: string;
    role: string;
    currentWork: { id: number; title: string; coverUrl: string | null } | null;
  };
  members: { name: string; role: string; you: boolean }[];
  posts: { id: number; text: string; createdAt: string; userName: string; own: boolean }[];
};

type LibItem = { id: number; title: string | null; editionId?: number | null };

export default function ClubDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [picking, setPicking] = useState(false);
  const [library, setLibrary] = useState<{ id: number; title: string | null; editionId: number }[]>([]);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await api<Detail>(`/v1/clubs/${id}`));
    } catch {
      router.back();
    }
  }, [id]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load().catch(() => {}), 20000);
    return () => clearInterval(t);
  }, [load]);

  async function send() {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api(`/v1/clubs/${id}/posts`, { method: "POST", body: { text } });
      setMessage("");
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    } finally {
      setSending(false);
    }
  }

  async function copyCode() {
    if (!detail) return;
    await Clipboard.setStringAsync(detail.club.inviteCode);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Código copiado", `Comparte «${detail.club.inviteCode}» para invitar al club.`);
  }

  async function openPicker() {
    const data = await api<{ items: { id: number; title: string | null; editionId?: number | null }[] }>(
      "/v1/library"
    );
    setLibrary(
      data.items.filter((it): it is { id: number; title: string | null; editionId: number } => !!it.editionId)
    );
    setPicking(true);
  }

  async function pickBook(editionId: number) {
    setPicking(false);
    await api(`/v1/clubs/${id}`, { method: "PATCH", body: { editionId } });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await load();
  }

  function leave() {
    if (!detail) return;
    Alert.alert("Salir del club", `Dejarás de ver «${detail.club.name}».`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await api(`/v1/clubs/${id}/leave`, { method: "POST", body: {} });
          router.back();
        },
      },
    ]);
  }

  if (!detail) {
    return (
      <View style={[s.screen, { justifyContent: "center" }]}>
        <Stack.Screen options={{ title: "" }} />
        <ActivityIndicator color={colors.ambar} />
      </View>
    );
  }

  const { club, members, posts } = detail;

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: club.name,
          headerRight: () => (
            <Pressable onPress={leave} hitSlop={10}>
              <Text style={{ color: colors.mut, fontSize: 12.5 }}>Salir</Text>
            </Pressable>
          ),
        }}
      />

      {/* Cabecera del club: libro actual + miembros + código */}
      <View style={s.top}>
        <Pressable
          style={s.currentBook}
          onPress={() => (club.role === "owner" ? void openPicker() : undefined)}
        >
          {club.currentWork?.coverUrl ? (
            <Image source={{ uri: club.currentWork.coverUrl }} style={s.cover} contentFit="cover" />
          ) : (
            <View style={[s.cover, { alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ color: colors.mut, fontSize: 16 }}>▦</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.mut, fontSize: 10.5, letterSpacing: 0.8, textTransform: "uppercase" }}>
              Leyendo ahora
            </Text>
            <Text style={{ color: colors.papel, fontSize: 14, fontFamily: fonts.sansSemi }} numberOfLines={2}>
              {club.currentWork?.title ?? (club.role === "owner" ? "Toca para elegir libro" : "Aún sin libro")}
            </Text>
            <Text style={{ color: colors.mut, fontSize: 11 }}>
              {members.length} {members.length === 1 ? "miembro" : "miembros"}:{" "}
              {members
                .slice(0, 4)
                .map((m) => (m.you ? "tú" : m.name.split(" ")[0]))
                .join(", ")}
              {members.length > 4 ? "…" : ""}
            </Text>
          </View>
        </Pressable>
        <Pressable style={s.codeBtn} onPress={() => void copyCode()}>
          <Text style={{ color: colors.ambar, fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 2 }}>
            {club.inviteCode}
          </Text>
          <Text style={{ color: colors.mut, fontSize: 9 }}>invitar ⧉</Text>
        </Pressable>
      </View>

      {/* Hilo de debate */}
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50, gap: 6 }}>
            <Text style={{ color: colors.mut, fontSize: 13 }}>Todavía nadie ha dicho nada.</Text>
            <Text style={{ color: colors.mut, fontSize: 13 }}>Rompe el hielo ↓</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.bubble, item.own ? s.bubbleOwn : s.bubbleOther]}>
            {!item.own && (
              <Text style={{ color: colors.ambar, fontSize: 10.5, fontFamily: fonts.sansSemi }}>
                {item.userName}
              </Text>
            )}
            <Text style={{ color: item.own ? colors.inkOnAccent : colors.papel, fontSize: 13.5, lineHeight: 19 }}>
              {item.text}
            </Text>
            <Text
              style={{
                color: item.own ? "rgba(27,22,16,.55)" : colors.mut,
                fontSize: 9.5,
                alignSelf: "flex-end",
              }}
            >
              {item.createdAt.slice(11, 16)}
            </Text>
          </View>
        )}
      />

      {/* Composer */}
      <View style={s.composer}>
        <TextInput
          style={s.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Escribe al club…"
          placeholderTextColor={colors.mut}
          multiline
        />
        <Pressable
          style={[s.sendBtn, (!message.trim() || sending) && { opacity: 0.4 }]}
          disabled={!message.trim() || sending}
          onPress={() => void send()}
        >
          <Text style={{ color: colors.inkOnAccent, fontSize: 16 }}>➤</Text>
        </Pressable>
      </View>

      {/* Selector de libro actual (owner) */}
      <Modal visible={picking} animationType="slide" transparent>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <Text style={{ color: colors.papel, fontSize: 17, fontFamily: fonts.serif, marginBottom: 10 }}>
              ¿Qué vais a leer?
            </Text>
            <FlatList
              data={library}
              keyExtractor={(b) => String(b.id)}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <Pressable style={s.pickRow} onPress={() => void pickBook(item.editionId)}>
                  <Text style={{ color: colors.papel, fontSize: 14 }} numberOfLines={1}>
                    {item.title ?? "Sin título"}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable style={{ alignItems: "center", padding: 12 }} onPress={() => setPicking(false)}>
              <Text style={{ color: colors.mut, fontSize: 13 }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  top: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.tinta3,
    backgroundColor: colors.tinta2,
    alignItems: "center",
  },
  currentBook: { flex: 1, flexDirection: "row", gap: 10, alignItems: "center" },
  cover: { width: 40, height: 58, borderRadius: 5, backgroundColor: colors.tinta3 },
  codeBtn: {
    alignItems: "center",
    gap: 1,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,.45)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  bubble: { maxWidth: "82%", borderRadius: 14, padding: 10, gap: 3 },
  bubbleOwn: { alignSelf: "flex-end", backgroundColor: colors.ambar, borderBottomRightRadius: 4 },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderBottomLeftRadius: 4,
  },
  composer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: colors.tinta3,
    backgroundColor: colors.tinta2,
    padding: 12,
    paddingBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: colors.tinta,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
    color: colors.papel,
    fontSize: 14.5,
    maxHeight: 110,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 99,
    backgroundColor: colors.ambar,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.55)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.tinta2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 30,
  },
  pickRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.tinta3,
  },
});
