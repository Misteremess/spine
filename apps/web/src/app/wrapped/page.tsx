"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Wrapped = {
  year: number;
  finished: number;
  pages: number;
  addedThisYear: number;
  tsundoku: { added: number; finished: number };
  longest: { title: string; pages: number } | null;
  best: { title: string; rating: number; coverUrl: string | null } | null;
  topAuthor: { name: string; count: number } | null;
  busiestMonth: { name: string; count: number } | null;
};

export default function WrappedPage() {
  const year = new Date().getFullYear();
  const [data, setData] = useState<Wrapped | null>(null);

  useEffect(() => {
    void api<Wrapped>(`/v1/wrapped?year=${year}`).then(setData).catch(() => {});
  }, [year]);

  if (!data) {
    return (
      <Shell>
        <p className="muted">Cargando…</p>
      </Shell>
    );
  }

  const empty = data.finished === 0;

  return (
    <Shell>
      <div style={{ display: "grid", gap: 16, maxWidth: 460, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 className="serif" style={{ fontSize: 24, fontWeight: 500 }}>
            Tu año lector
          </h1>
          <Link href="/stats" className="muted" style={{ fontSize: 13 }}>
            ← Estadísticas
          </Link>
        </div>

        {/* La tarjeta compartible: captura de pantalla y a redes (plan §5.7). */}
        <div
          style={{
            borderRadius: 20,
            padding: 28,
            display: "grid",
            gap: 18,
            background:
              "radial-gradient(120% 120% at 0% 0%, #2a251c 0%, #1d1a15 55%, #14120f 100%)",
            border: "1px solid var(--tinta3)",
            boxShadow: "0 20px 60px rgba(0,0,0,.45)",
          }}
        >
          <div>
            <p style={{ color: "var(--ambar)", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
              Spine · {data.year}
            </p>
            <p className="serif" style={{ fontSize: 20, color: "var(--marfil)", marginTop: 2 }}>
              {empty ? "Tu historia empieza ahora" : "Lo que has leído este año"}
            </p>
          </div>

          {empty ? (
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
              Aún no has terminado ningún libro en {data.year}. Marca alguno como leído y tu resumen
              cobrará vida.
            </p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Big n={data.finished} label={data.finished === 1 ? "libro terminado" : "libros terminados"} />
                <Big n={data.pages.toLocaleString("es-ES")} label="páginas" />
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {data.best && (
                  <Row
                    k="Tu favorito"
                    v={`${data.best.title} · ${"★".repeat(Math.round(data.best.rating / 2))}`}
                  />
                )}
                {data.longest && <Row k="El más largo" v={`${data.longest.title} (${data.longest.pages} págs.)`} />}
                {data.topAuthor && (
                  <Row k="Autor del año" v={`${data.topAuthor.name} · ${data.topAuthor.count}`} />
                )}
                {data.busiestMonth && (
                  <Row k="Tu mes más lector" v={`${data.busiestMonth.name} (${data.busiestMonth.count})`} />
                )}
                <Row k="Ritmo comprado/leído" v={`${data.tsundoku.added} añadidos · ${data.tsundoku.finished} leídos`} />
              </div>

              <p className="serif" style={{ fontSize: 15, color: "var(--ambar)", textAlign: "center", marginTop: 4 }}>
                spine · tu biblioteca, con memoria
              </p>
            </>
          )}
        </div>

        {!empty && (
          <p className="muted" style={{ fontSize: 12.5, textAlign: "center" }}>
            Haz una captura de la tarjeta para compartir tu año lector.
          </p>
        )}
      </div>
    </Shell>
  );
}

function Big({ n, label }: { n: number | string; label: string }) {
  return (
    <div>
      <p className="serif" style={{ fontSize: 40, color: "var(--papel)", lineHeight: 1 }}>
        {n}
      </p>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
        {label}
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--tinta3)", paddingTop: 10 }}>
      <span className="muted" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
        {k}
      </span>
      <span style={{ fontSize: 13, color: "var(--marfil)", textAlign: "right" }}>{v}</span>
    </div>
  );
}
