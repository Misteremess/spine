import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VideoBackdrop from "../components/VideoBackdrop";
import { authClient } from "../lib/auth";
import { FadeInUp } from "../lib/Motion";
import { useThemeColors, useThemedStyles } from "../lib/settings";
import { fonts, type Palette } from "../lib/theme";
import { Text, TextInput } from "../lib/ui";

const PERKS = [
  { glyph: "▣", title: "Escáner en ráfaga", sub: "Cataloga tu estantería en una tarde" },
  { glyph: "▦", title: "Tomos y colecciones", sub: "Sabe qué te falta antes de comprar" },
  { glyph: "✦", title: "Tu año lector", sub: "Rachas, retos y estadísticas de verdad" },
];

/** Fuerza de la contraseña 0..4 con etiqueta. */
function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(4, score);
  return { score, label: ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"][score]! };
}

export default function Login() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ nuevo?: string }>();
  const [mode, setMode] = useState<"signin" | "signup">(params.nuevo != null ? "signup" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(password);
  const mismatch = mode === "signup" && confirm.length > 0 && confirm !== password;

  async function submit() {
    if (busy) return;
    if (mode === "signup" && password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError(null);
    const res =
      mode === "signup"
        ? await authClient.signUp.email({ name: name.trim() || email.split("@")[0]!, email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
    if (res.error) {
      setBusy(false);
      setError(res.error.message ?? "No se pudo iniciar sesión");
      return;
    }
    if (mode === "signup") {
      // Confirmación visible antes de entrar: la cuenta se creó bien.
      setCreated(true);
      setTimeout(() => router.replace("/"), 1100);
      return;
    }
    setBusy(false);
    router.replace("/");
  }

  const canSubmit =
    email.includes("@") &&
    password.length >= (mode === "signup" ? 10 : 1) &&
    (mode === "signin" || confirm === password);

  return (
    <View style={s.screen}>
      <VideoBackdrop />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 26, paddingTop: insets.top + 24, gap: 26 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Marca */}
        <FadeInUp style={{ alignItems: "center", gap: 8 }}>
          <Text style={s.brand}>Spine</Text>
          <Text style={s.tagline}>Tu biblioteca, bajo control.</Text>
        </FadeInUp>

        {/* Argumentos de valor */}
        <View style={{ gap: 12 }}>
          {PERKS.map((p) => (
            <View key={p.title} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={s.perkIcon}>
                <Text style={{ color: colors.ambar, fontSize: 17 }}>{p.glyph}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.papel, fontSize: 14, fontFamily: fonts.sansSemi }}>{p.title}</Text>
                <Text style={{ color: colors.mut, fontSize: 12 }}>{p.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tarjeta de acceso */}
        <FadeInUp delay={120} style={s.card}>
          {/* Segmentado Entrar / Crear cuenta */}
          <View style={s.segment}>
            {(["signin", "signup"] as const).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  style={[s.segmentBtn, active && { backgroundColor: colors.ambar }]}
                  onPress={() => {
                    setMode(m);
                    setError(null);
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.inkOnAccent : colors.mut,
                      fontFamily: fonts.sansSemi,
                      fontSize: 13.5,
                    }}
                  >
                    {m === "signin" ? "Entrar" : "Crear cuenta"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode === "signup" && (
            <TextInput
              style={s.input}
              placeholder="Nombre"
              placeholderTextColor={colors.mut}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={s.input}
            placeholder="tu@email.com"
            placeholderTextColor={colors.mut}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <View style={{ position: "relative", justifyContent: "center" }}>
            <TextInput
              style={[s.input, { paddingRight: 48 }]}
              placeholder={mode === "signup" ? "Contraseña (mínimo 10 caracteres)" : "Contraseña"}
              placeholderTextColor={colors.mut}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <Pressable
              onPress={() => setShowPw((v) => !v)}
              hitSlop={10}
              style={{ position: "absolute", right: 14 }}
              accessibilityLabel={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <Feather name={showPw ? "eye-off" : "eye"} size={19} color={colors.mut} />
            </Pressable>
          </View>

          {mode === "signup" && password.length > 0 && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 99,
                      backgroundColor:
                        i < strength.score
                          ? strength.score <= 1
                            ? colors.arcilla
                            : strength.score === 2
                              ? colors.ambar
                              : colors.salvia
                          : colors.tinta3,
                    }}
                  />
                ))}
              </View>
              <Text style={{ color: colors.mut, fontSize: 11.5 }}>Seguridad: {strength.label}</Text>
            </View>
          )}

          {mode === "signup" && (
            <TextInput
              style={[s.input, mismatch && { borderColor: colors.arcilla }]}
              placeholder="Repite la contraseña"
              placeholderTextColor={colors.mut}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPw}
              autoComplete="new-password"
            />
          )}
          {mismatch && <Text style={{ color: colors.arcilla, fontSize: 12 }}>Las contraseñas no coinciden.</Text>}

          {error && <Text style={{ color: colors.arcilla, fontSize: 13 }}>{error}</Text>}

          {created && (
            <View style={s.success}>
              <Feather name="check-circle" size={18} color={colors.salvia} />
              <Text style={{ color: colors.papel, fontSize: 13.5, flex: 1 }}>
                ¡Cuenta creada! Entrando a tu biblioteca…
              </Text>
            </View>
          )}

          <Pressable style={[s.cta, (!canSubmit || busy || created) && { opacity: 0.45 }]} disabled={!canSubmit || busy || created} onPress={submit}>
            {busy ? (
              <ActivityIndicator color={colors.inkOnAccent} />
            ) : (
              <Text style={s.ctaText}>{mode === "signin" ? "Entrar" : "Crear mi cuenta"}</Text>
            )}
          </Pressable>

          {mode === "signup" && (
            <Text style={{ color: colors.mut, fontSize: 11, textAlign: "center" }}>
              Tu biblioteca es tuya: privada y exportable siempre.
            </Text>
          )}
        </FadeInUp>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  brand: { fontFamily: fonts.serif, fontSize: 52, color: colors.ambar, letterSpacing: 0.5 },
  tagline: { color: colors.marfil, fontSize: 15, fontFamily: fonts.serifMedium },
  perkIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(29,26,21,0.82)",
    borderWidth: 1,
    borderColor: "rgba(246,241,231,0.12)",
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.tinta,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.tinta3,
    padding: 4,
    gap: 4,
    marginBottom: 4,
  },
  segmentBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
  input: {
    backgroundColor: colors.tinta,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 12,
    color: colors.papel,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
  },
  success: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.tinta,
    borderWidth: 1,
    borderColor: colors.salvia,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cta: {
    backgroundColor: colors.ambar,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 2,
  },
  ctaText: { color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 16 },
});
