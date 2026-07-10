"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res =
      mode === "signin"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: name || email.split("@")[0]! });
    setBusy(false);
    if (res.error) {
      setError(
        res.error.status === 401 || res.error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "Correo o contraseña incorrectos."
          : (res.error.message ?? "No se pudo completar. Inténtalo de nuevo.")
      );
      return;
    }
    router.replace("/biblioteca");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, display: "grid", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 34, fontWeight: 500 }}>
            Spine
          </h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
            Tu biblioteca, tu colección, tu ritmo
          </p>
        </div>

        <form className="card" style={{ display: "grid", gap: 12 }} onSubmit={submit}>
          {mode === "signup" && (
            <input
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          )}
          <input
            type="email"
            required
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="password"
            required
            minLength={10}
            placeholder="Contraseña (mínimo 10 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          {error && <p style={{ color: "var(--arcilla)", fontSize: 13 }}>{error}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Un momento…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          className="muted"
          style={{ fontSize: 13.5 }}
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
        >
          {mode === "signin"
            ? "¿Primera vez? Crea tu cuenta →"
            : "¿Ya tienes cuenta? Entra →"}
        </button>
      </div>
    </main>
  );
}
