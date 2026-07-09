import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { authClient } from "../lib/auth";
import { colors } from "../lib/theme";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res =
      mode === "signup"
        ? await authClient.signUp.email({ name: name.trim() || email.split("@")[0]!, email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "No se pudo iniciar sesión");
      return;
    }
    router.replace("/library");
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.card}>
        <Text style={s.logo}>Spine</Text>
        <Text style={s.sub}>Tu biblioteca, bajo control.</Text>

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
        <TextInput
          style={s.input}
          placeholder="Contraseña (mínimo 10 caracteres)"
          placeholderTextColor={colors.mut}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.inkOnAccent} />
          ) : (
            <Text style={s.btnText}>{mode === "signin" ? "Entrar" : "Crear cuenta"}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
          <Text style={s.switch}>
            {mode === "signin" ? "¿Primera vez? Crea tu cuenta" : "¿Ya tienes cuenta? Entra"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta, justifyContent: "center", padding: 24 },
  card: { gap: 12 },
  logo: { fontFamily: "Georgia", fontSize: 44, color: colors.ambar, textAlign: "center" },
  sub: { color: colors.mut, textAlign: "center", marginBottom: 18 },
  input: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 12,
    color: colors.papel,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
  },
  error: { color: colors.arcilla, fontSize: 13 },
  btn: {
    backgroundColor: colors.ambar,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: colors.inkOnAccent, fontWeight: "600", fontSize: 16 },
  switch: { color: colors.mut, textAlign: "center", marginTop: 14, fontSize: 13 },
});
