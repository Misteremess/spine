"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import VideoBackdrop from "@/components/VideoBackdrop";
import { authClient } from "@/lib/auth";

const PERKS = [
  { glyph: "▣", title: "Escáner en ráfaga", sub: "Cataloga tu estantería en una tarde" },
  { glyph: "▦", title: "Tomos y colecciones", sub: "Sabe qué te falta antes de comprar" },
  { glyph: "✦", title: "Tu año lector", sub: "Rachas, retos y estadísticas de verdad" },
];

/** Fuerza de la contraseña 0..4 con etiqueta y color. */
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(4, score);
  const map = [
    { label: "Muy débil", color: "var(--arcilla)" },
    { label: "Débil", color: "var(--arcilla)" },
    { label: "Aceptable", color: "var(--ambar)" },
    { label: "Buena", color: "var(--salvia)" },
    { label: "Fuerte", color: "var(--salvia)" },
  ];
  return { score, ...map[score]! };
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("nuevo") ? "signup" : "signin"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strength = passwordStrength(password);
  const mismatch = mode === "signup" && confirm.length > 0 && confirm !== password;
  const canSubmit =
    mode === "signin"
      ? email.length > 0 && password.length > 0
      : email.includes("@") && password.length >= 10 && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, position: "relative" }}>
      <VideoBackdrop />
      <div className="login-grid" style={{ position: "relative", zIndex: 2 }}>
        {/* Panel de marca + argumentos (se oculta en móvil) */}
        <section className="login-pitch">
          <h1 className="serif" style={{ fontSize: 46, fontWeight: 500, color: "var(--ambar)" }}>
            Spine
          </h1>
          <p className="serif" style={{ fontSize: 18, color: "var(--marfil)", marginTop: 6 }}>
            El CRM de tu biblioteca y tus colecciones.
          </p>
          <div style={{ display: "grid", gap: 16, marginTop: 28 }}>
            {PERKS.map((p) => (
              <div key={p.title} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 11,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--tinta2)",
                    border: "1px solid var(--tinta3)",
                    color: "var(--ambar)",
                    fontSize: 17,
                    flexShrink: 0,
                  }}
                >
                  {p.glyph}
                </span>
                <span>
                  <strong style={{ fontSize: 14.5 }}>{p.title}</strong>
                  <span className="muted" style={{ display: "block", fontSize: 12.5 }}>
                    {p.sub}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Tarjeta de acceso */}
        <div style={{ width: "100%", maxWidth: 380, display: "grid", gap: 14, justifySelf: "center" }}>
          <h1 className="serif login-mobile-brand" style={{ fontSize: 34, fontWeight: 500, color: "var(--ambar)", textAlign: "center" }}>
            Spine
          </h1>

          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              background: "rgba(20,18,15,0.7)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(246,241,231,0.12)",
              borderRadius: 12,
            }}
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 9,
                  fontWeight: 600,
                  fontSize: 13.5,
                  background: mode === m ? "var(--ambar)" : "transparent",
                  color: mode === m ? "var(--ink-on-accent)" : "var(--mut)",
                }}
              >
                {m === "signin" ? "Entrar" : "Crear cuenta"}
              </button>
            ))}
          </div>

          <form
            className="card"
            style={{
              display: "grid",
              gap: 12,
              background: "rgba(29,26,21,0.82)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderColor: "rgba(246,241,231,0.12)",
            }}
            onSubmit={submit}
          >
            {mode === "signup" && (
              <input placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            )}
            <input
              type="email"
              required
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={mode === "signup" ? 10 : undefined}
                placeholder={mode === "signup" ? "Contraseña (mínimo 10 caracteres)" : "Contraseña"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                style={{ width: "100%", paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                title={showPw ? "Ocultar" : "Mostrar"}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--mut)", fontSize: 15 }}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>

            {mode === "signup" && password.length > 0 && (
              <div style={{ display: "grid", gap: 5 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 99,
                        background: i < strength.score ? strength.color : "var(--tinta3)",
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 11.5, color: strength.color }}>Seguridad: {strength.label}</span>
              </div>
            )}

            {mode === "signup" && (
              <input
                type={showPw ? "text" : "password"}
                required
                placeholder="Repite la contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                style={mismatch ? { borderColor: "var(--arcilla)" } : undefined}
              />
            )}
            {mismatch && <p style={{ color: "var(--arcilla)", fontSize: 12 }}>Las contraseñas no coinciden.</p>}

            {error && <p style={{ color: "var(--arcilla)", fontSize: 13 }}>{error}</p>}
            <button className="btn" type="submit" disabled={busy || !canSubmit}>
              {busy ? "Un momento…" : mode === "signin" ? "Entrar" : "Crear mi cuenta"}
            </button>
            {mode === "signup" && (
              <p className="muted" style={{ fontSize: 11, textAlign: "center" }}>
                Tu biblioteca es tuya: privada y exportable siempre.
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
