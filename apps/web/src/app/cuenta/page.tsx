"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { API_URL, api } from "@/lib/api";
import { authClient } from "@/lib/auth";

/** Cuenta: export de datos (RGPD) y borrado self-service (plan §15). */
export default function Cuenta() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const email = session?.user?.email ?? "";

  async function deleteAccount() {
    if (confirm !== email || deleting) return;
    if (!window.confirm("Esto borrará tu cuenta y toda tu biblioteca para siempre. ¿Seguro?")) return;
    setDeleting(true);
    setError(null);
    try {
      await api("/v1/account", { method: "DELETE", body: { confirm } });
      await authClient.signOut().catch(() => {});
      router.replace("/login");
    } catch {
      setError("No se pudo borrar la cuenta. Inténtalo de nuevo.");
      setDeleting(false);
    }
  }

  return (
    <Shell>
      <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Tu cuenta
        </h1>

        <div className="card" style={{ display: "grid", gap: 6 }}>
          <p style={{ fontSize: 15 }}>{session?.user?.name}</p>
          <p className="muted" style={{ fontSize: 13 }}>{email}</p>
        </div>

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
            EXPORTAR TUS DATOS
          </p>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Tu biblioteca es tuya y te la puedes llevar cuando quieras, gratis. Descárgala en el
            formato que prefieras.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn" href={`${API_URL}/v1/export.csv`} download>
              Descargar CSV
            </a>
            <a
              className="pill"
              href={`${API_URL}/v1/export`}
              download
              style={{ display: "inline-flex", alignItems: "center", color: "var(--marfil)" }}
            >
              Descargar JSON completo
            </a>
          </div>
        </div>

        <div className="card" style={{ display: "grid", gap: 12, borderColor: "var(--arcilla)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "var(--arcilla)" }}>
            BORRAR LA CUENTA
          </p>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Se borrarán tu cuenta y toda tu biblioteca, lecturas, notas y listas de forma permanente.
            Escribe <strong style={{ color: "var(--papel)" }}>{email}</strong> para confirmar.
          </p>
          <input
            placeholder="Escribe tu email"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          {error && <p style={{ color: "var(--arcilla)", fontSize: 13 }}>{error}</p>}
          <button
            className="btn"
            style={{ background: "var(--arcilla)", justifySelf: "start", opacity: confirm === email ? 1 : 0.4 }}
            disabled={confirm !== email || deleting}
            onClick={() => void deleteAccount()}
          >
            {deleting ? "Borrando…" : "Borrar mi cuenta para siempre"}
          </button>
        </div>
      </div>
    </Shell>
  );
}
