"use client";

/**
 * Detalle de saga: ficha viva con la rejilla de tomos (tuyos con portada,
 * huecos que se desean con su ISBN y próximos lanzamientos con fecha),
 * más el refresco manual del radar de novedades.
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Volume = {
  volume: number;
  owned: boolean;
  read: boolean;
  userBookId: number | null;
  title: string | null;
  coverUrl: string | null;
  isbn13: string | null;
  publishedDate: string | null;
  upcoming: boolean;
};

type Detail = {
  series: {
    id: number;
    name: string;
    status: "ongoing" | "completed" | "unknown";
    totalVolumes: number | null;
    latestVolume: number | null;
    latestVolumeDate: string | null;
    coverUrl: string | null;
    description: string | null;
    checkedAt: string | null;
  };
  volumes: Volume[];
  unnumbered: { userBookId: number; title: string }[];
  ownedCount: number;
  readCount: number;
  missing: number[];
  upcoming: { volume: number; title: string | null; publishedDate: string | null; isbn13: string | null }[];
};

const STATUS = {
  ongoing: { text: "En publicación", color: "var(--ambar)" },
  completed: { text: "Completada", color: "var(--salvia)" },
  unknown: { text: "", color: "var(--mut)" },
} as const;

export default function SerieDetalle() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setDetail(await api<Detail>(`/v1/series/${id}`));
  }, [id]);

  useEffect(() => {
    void load().catch(() => {});
  }, [load]);

  async function refresh() {
    setChecking(true);
    try {
      setDetail(await api<Detail>(`/v1/series/${id}/refresh`, { method: "POST", body: {} }));
    } finally {
      setChecking(false);
    }
  }

  async function wish(v: Volume, seriesName: string) {
    const title = v.title ?? `${seriesName} ${v.volume}`;
    if (!confirm(`Te falta el tomo ${v.volume}. ¿Añadir «${title}» a la lista de deseos?`)) return;
    await api("/v1/wishlist", {
      method: "POST",
      body: v.isbn13 ? { isbn: v.isbn13, priority: 2 } : { title, priority: 2 },
    });
  }

  if (!detail) {
    return (
      <Shell>
        <p className="muted">Cargando…</p>
      </Shell>
    );
  }

  const { series, volumes, unnumbered, ownedCount, readCount, missing, upcoming } = detail;
  const st = STATUS[series.status];
  const horizon = Math.max(series.totalVolumes ?? 0, volumes.length);
  const pct = horizon > 0 ? Math.min(100, Math.round((ownedCount / horizon) * 100)) : 0;

  return (
    <Shell>
      <div style={{ display: "grid", gap: 18, maxWidth: 760 }}>
        <div style={{ display: "flex", gap: 18 }}>
          {series.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={series.coverUrl}
              alt=""
              style={{ width: 110, height: 158, objectFit: "cover", borderRadius: 10 }}
            />
          ) : null}
          <div style={{ display: "grid", gap: 8, alignContent: "center" }}>
            <h1 className="serif" style={{ fontSize: 28, fontWeight: 500 }}>
              {series.name}
            </h1>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {st.text && (
                <span
                  style={{
                    border: `1px solid ${st.color}`,
                    color: st.color,
                    borderRadius: 99,
                    padding: "2px 10px",
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  {st.text}
                </span>
              )}
              <span style={{ color: "var(--ambar)", fontWeight: 700, fontSize: 14 }}>
                {ownedCount} de {series.totalVolumes ?? series.latestVolume ?? "?"}
              </span>
              {readCount > 0 && (
                <span style={{ color: "var(--salvia)", fontWeight: 600, fontSize: 13 }}>✓ {readCount} leídos</span>
              )}
              {series.latestVolume && (
                <span className="muted" style={{ fontSize: 12.5 }}>
                  último publicado: {series.latestVolume}
                  {series.latestVolumeDate ? ` (${series.latestVolumeDate})` : ""}
                </span>
              )}
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "var(--tinta3)", overflow: "hidden", maxWidth: 340 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--ambar)" }} />
            </div>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="card" style={{ borderColor: "rgba(217,164,65,.4)", display: "grid", gap: 8 }}>
            <strong style={{ color: "var(--ambar)", fontSize: 13 }}>✨ Próximos lanzamientos</strong>
            {upcoming.map((u) => (
              <div key={u.volume} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5 }}>
                <span>
                  Tomo {u.volume}
                  {u.title ? ` · ${u.title}` : ""}
                </span>
                <span style={{ color: "var(--ambar)", fontVariantNumeric: "tabular-nums" }}>{u.publishedDate}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <strong style={{ fontSize: 13, letterSpacing: 0.3 }}>Tomos</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {volumes.map((v) => {
              if (v.owned) {
                return (
                  <Link
                    key={v.volume}
                    href={`/libro/${v.userBookId}`}
                    title={v.title ?? `Tomo ${v.volume}`}
                    style={{
                      width: 52,
                      height: 74,
                      borderRadius: 7,
                      background: v.coverUrl ? `center/cover url(${v.coverUrl})` : "var(--ambar)",
                      color: "var(--ink-on-accent)",
                      display: "grid",
                      placeItems: v.coverUrl ? "end end" : "center",
                      fontWeight: 700,
                      fontSize: 13,
                      position: "relative",
                    }}
                  >
                    {v.read && (
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: 2,
                          background: "var(--salvia)",
                          color: "var(--ink-on-accent)",
                          borderRadius: 4,
                          fontSize: 9,
                          width: 14,
                          height: 14,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        ✓
                      </span>
                    )}
                    <span
                      style={
                        v.coverUrl
                          ? {
                              position: "absolute",
                              bottom: 2,
                              right: 2,
                              background: "rgba(20,18,15,.85)",
                              color: "var(--papel)",
                              borderRadius: 4,
                              fontSize: 9,
                              padding: "1px 4px",
                            }
                          : undefined
                      }
                    >
                      {v.volume}
                    </span>
                  </Link>
                );
              }
              if (v.upcoming) {
                return (
                  <div
                    key={v.volume}
                    title={`Tomo ${v.volume} — sale el ${v.publishedDate}`}
                    style={{
                      width: 52,
                      height: 74,
                      borderRadius: 7,
                      border: "1px dotted rgba(217,164,65,.55)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--ambar)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {v.volume}
                  </div>
                );
              }
              return (
                <button
                  key={v.volume}
                  title={`Tomo ${v.volume}: te falta — añadir a deseos${v.isbn13 ? " (con su ISBN)" : ""}`}
                  onClick={() => void wish(v, series.name)}
                  style={{
                    width: 52,
                    height: 74,
                    borderRadius: 7,
                    border: "1px dashed rgba(193,85,61,.55)",
                    color: "var(--arcilla)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {v.volume}
                </button>
              );
            })}
          </div>
          {missing.length > 0 && (
            <p style={{ color: "var(--arcilla)", fontSize: 12.5 }}>
              Te faltan {missing.length}: pulsa un hueco para mandarlo a deseos
            </p>
          )}
        </div>

        {unnumbered.length > 0 && (
          <div className="card" style={{ display: "grid", gap: 6 }}>
            <strong style={{ fontSize: 13 }}>Sin número de tomo</strong>
            {unnumbered.map((b) => (
              <Link key={b.userBookId} href={`/libro/${b.userBookId}`} style={{ color: "var(--marfil)", fontSize: 13.5 }}>
                · {b.title}
              </Link>
            ))}
          </div>
        )}

        {series.description && (
          <div className="card" style={{ display: "grid", gap: 8 }}>
            <strong style={{ fontSize: 13 }}>Sobre la serie</strong>
            <p style={{ color: "var(--marfil)", fontSize: 14, lineHeight: 1.55 }}>{series.description}</p>
          </div>
        )}

        <button className="muted" style={{ fontSize: 13, justifySelf: "center" }} disabled={checking} onClick={() => void refresh()}>
          {checking ? "Comprobando novedades…" : "⟳ Comprobar novedades ahora"}
          {series.checkedAt ? ` · última: ${series.checkedAt.slice(0, 10)}` : ""}
        </button>
      </div>
    </Shell>
  );
}
