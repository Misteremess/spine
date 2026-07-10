/**
 * Clubs de lectura: tus clubs, crear uno nuevo o unirse con un código
 * de 6 letras. La vida del club pasa en /club/[id].
 */
import * as Haptics from "expo-haptics";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, ApiError } from "../lib/api";
import { colors, fonts } from "../lib/theme";

type Club = {
  id: number;
  name: string;
  description: string | null;
  inviteCode: string;
  role: string;
  members: number;
  currentWork: { title: string } | null;
};

export default function Clubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ clubs: Club[] }>("/v1/clubs");
    setClubs(data.clubs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => {});
    }, [load])
  );

  async function create() {
    if (name.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      const res = await api<{ club: { id: number } }>("/v1/clubs", {
        method: "POST",
        body: { name: name.trim() },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setName("");
      setMode("none");
      Keyboard.dismiss();
      router.push(`/club/${res.club.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (code.trim().length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await api<{ club: { id: number } }>("/v1/clubs/join", {
        method: "POST",
        body: { code: code.trim().toUpperCase() },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCode("");
      setMode("none");
      Keyboard.dismiss();
      await load();
      router.push(`/club/${res.club.id}`);
    } catch (e) {
      Alert.alert(
        "No se pudo entrar",
        e instanceof ApiError && e.status === 404 ? "Ese código no existe." : "Inténtalo de nuevo."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: "Clubs de lectura" }} />

      <FlatList
        data={clubs}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 70, gap: 8, paddingHorizontal: 30 }}>
            <Text style={{ color: colors.marfil, fontSize: 17, fontFamily: fonts.serif }}>
              Lee acompañado
            </Text>
            <Text style={{ color: colors.mut, fontSize: 13, textAlign: "center" }}>
              Crea un club para tu grupo de lectura o únete a uno con el código que te pasen
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => router.push(`/club/${item.id}`)}>
            <View style={s.clubIcon}>
              <Text style={{ color: colors.inkOnAccent, fontSize: 17, fontFamily: fonts.serif }}>
                {item.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.papel, fontSize: 15, fontFamily: fonts.sansSemi }} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ color: colors.mut, fontSize: 11.5 }} numberOfLines={1}>
                {item.members} {item.members === 1 ? "miembro" : "miembros"}
                {item.currentWork ? ` · leyendo «${item.currentWork.title}»` : ""}
              </Text>
            </View>
            {item.role === "owner" && (
              <View style={s.ownerPill}>
                <Text style={{ color: colors.ambar, fontSize: 9.5, fontFamily: fonts.sansSemi }}>ADMIN</Text>
              </View>
            )}
            <Text style={{ color: colors.mut, fontSize: 16 }}>›</Text>
          </Pressable>
        )}
      />

      <View style={s.composer}>
        {mode === "none" && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable style={[s.actionBtn, { backgroundColor: colors.ambar }]} onPress={() => setMode("create")}>
              <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 13.5 }}>
                ＋ Crear club
              </Text>
            </Pressable>
            <Pressable style={[s.actionBtn, s.actionGhost]} onPress={() => setMode("join")}>
              <Text style={{ color: colors.ambar, fontFamily: fonts.sansBold, fontSize: 13.5 }}>
                Unirme con código
              </Text>
            </Pressable>
          </View>
        )}
        {mode === "create" && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Nombre del club"
              placeholderTextColor={colors.mut}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void create()}
            />
            <Pressable
              style={[s.confirmBtn, (name.trim().length < 2 || busy) && { opacity: 0.4 }]}
              disabled={name.trim().length < 2 || busy}
              onPress={() => void create()}
            >
              <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 13.5 }}>Crear</Text>
            </Pressable>
            <Pressable style={{ justifyContent: "center" }} onPress={() => setMode("none")} hitSlop={8}>
              <Text style={{ color: colors.mut, fontSize: 13 }}>✕</Text>
            </Pressable>
          </View>
        )}
        {mode === "join" && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[s.input, { letterSpacing: 4, textTransform: "uppercase" }]}
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="CÓDIGO"
              placeholderTextColor={colors.mut}
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={() => void join()}
            />
            <Pressable
              style={[s.confirmBtn, (code.trim().length !== 6 || busy) && { opacity: 0.4 }]}
              disabled={code.trim().length !== 6 || busy}
              onPress={() => void join()}
            >
              <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 13.5 }}>Entrar</Text>
            </Pressable>
            <Pressable style={{ justifyContent: "center" }} onPress={() => setMode("none")} hitSlop={8}>
              <Text style={{ color: colors.mut, fontSize: 13 }}>✕</Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 13,
  },
  clubIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.salvia,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerPill: {
    borderWidth: 1,
    borderColor: "rgba(217,164,65,.5)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.tinta3,
    backgroundColor: colors.tinta2,
    padding: 14,
    paddingBottom: 26,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 12,
  },
  actionGhost: { borderWidth: 1, borderColor: "rgba(217,164,65,.5)" },
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
  confirmBtn: {
    backgroundColor: colors.ambar,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
});
