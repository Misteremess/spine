"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, ApiError } from "@/lib/api";

type Result = { imported: number; skipped: number; failed: number; total: number };

export default function Importar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const csv = await file.text();
      setResult(await api<Result>("/v1/import/goodreads", { method: "POST", body: { csv } }));
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 400
          ? "Ese archivo no parece un export de Goodreads."
          : "No se pudo importar. Inténtalo de nuevo."
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Shell>
      <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Importar de Goodreads
        </h1>

        <div className="card" style={{ display: "grid", gap: 8 }}>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: "var(--marfil)" }}>
            1 · Descarga tu biblioteca
          </p>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            En goodreads.com: <span style={{ color: "var(--papel)" }}>My Books → Import and
            export → Export library</span>. Te dará un archivo CSV.
          </p>
        </div>

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: "var(--marfil)" }}>
            2 · Tráela a Spine
          </p>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            Se importan títulos, autores, valoraciones, reseñas, estanterías y fechas de lectura.
            Los libros que ya tengas se saltan.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? "Importando…" : "Elegir archivo CSV"}
          </button>
          {busy && (
            <p className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>
              Con bibliotecas grandes puede tardar un poco
            </p>
          )}
        </div>

        {error && <p style={{ color: "var(--arcilla)", fontSize: 13.5 }}>{error}</p>}

        {result && (
          <div className="card" style={{ borderColor: "var(--salvia)", display: "grid", gap: 10 }}>
            <p style={{ color: "var(--salvia)", fontWeight: 700 }}>Hecho ✓</p>
            <p className="muted" style={{ fontSize: 14 }}>
              {result.imported} {result.imported === 1 ? "libro importado" : "libros importados"}
              {result.skipped > 0 ? ` · ${result.skipped} ya los tenías` : ""}
              {result.failed > 0 ? ` · ${result.failed} con error` : ""}
            </p>
            <Link href="/biblioteca" className="btn" style={{ textAlign: "center" }}>
              Ver mi biblioteca
            </Link>
          </div>
        )}
      </div>
    </Shell>
  );
}
