"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type ReadingStatus = "pending" | "reading" | "paused" | "finished" | "abandoned";

type Detail = {
  book: {
    id: number;
    customTitle: string | null;
    customAuthors: string | null;
    customIsbn13: string | null;
    favorite: boolean;
    rating: number | null;
  };
  edition: {
    isbn13: string;
    title: string;
    pages: number | null;
    publishedDate: string | null;
    coverUrl: string | null;
    publisher: string | null;
    description: string | null;
    authors: string[];
    series: string | null;
    seriesVolume: number | null;
  } | null;
  reading: { status: ReadingStatus } | null;
  lastProgress: { page: number | null; percent: number | null } | null;
};

const STATUSES: { key: ReadingStatus; label: string; color: string }[] = [
  { key: "pending", label: "Pendiente", color: "var(--mut)" },
  { key: "reading", label: "Leyendo", color: "var(--ambar)" },
  { key: "paused", label: "En pausa", color: "var(--mut)" },
  { key: "finished", label: "Leído", color: "var(--salvia)" },
  { key: "abandoned", label: "Abandonado", color: "var(--arcilla)" },
];

export default function Libro() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [pageInput, setPageInput] = useState("");

  const load = useCallback(async () => {
    try {
      setDetail(await api<Detail>(`/v1/library/${id}`));
    } catch {
      router.replace("/biblioteca");
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!detail) {
    return (
      <Shell>
        <p className="muted">Cargando…</p>
      </Shell>
    );
  }

  const { book, edition, reading, lastProgress } = detail;
  const title = edition?.title ?? book.customTitle ?? "Sin título";
  const authors = edition?.authors.length ? edition.authors.join(", ") : book.customAuthors;
  const pages = edition?.pages ?? null;
  const percent =
    lastProgress?.percent ??
    (lastProgress?.page && pages ? Math.min(100, Math.round((lastProgress.page / pages) * 100)) : null);

  async function setStatus(status: ReadingStatus) {
    if (reading?.status === status) return;
    await api(`/v1/library/${book.id}/status`, { method: "POST", body: { status } });
    await load();
  }

  async function setRating(next: number | null) {
    setDetail((d) => (d ? { ...d, book: { ...d.book, rating: next } } : d));
    await api(`/v1/library/${book.id}`, { method: "PATCH", body: { rating: next } });
  }

  async function toggleFavorite() {
    const next = !book.favorite;
    setDetail((d) => (d ? { ...d, book: { ...d.book, favorite: next } } : d));
    await api(`/v1/library/${book.id}`, { method: "PATCH", body: { favorite: next } });
  }

  async function saveProgress(e: React.FormEvent) {
    e.preventDefault();
    const page = Number(pageInput);
    if (!Number.isInteger(page) || page <= 0) return;
    await api(`/v1/library/${book.id}/progress`, { method: "POST", body: { page } });
    setPageInput("");
    await load();
  }

  async function remove() {
    if (!confirm(`«${title}» saldrá de tu biblioteca. ¿Seguro?`)) return;
    await api(`/v1/library/${book.id}`, { method: "DELETE" });
    router.replace("/biblioteca");
  }

  return (
    <Shell>
      <div className="book-layout">
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div
            style={{
              aspectRatio: "2 / 3",
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--tinta2)",
              border: "1px solid var(--tinta3)",
            }}
          >
            {edition?.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={edition.coverUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ height: "100%", display: "grid", placeItems: "center" }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  sin portada
                </span>
              </div>
            )}
          </div>
          <button className="muted" style={{ fontSize: 13 }} onClick={() => void remove()}>
            <span style={{ color: "var(--arcilla)" }}>Eliminar de mi biblioteca</span>
          </button>
        </div>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <h1 className="serif" style={{ fontSize: 28, fontWeight: 500, flex: 1 }}>
                {title}
              </h1>
              <button
                onClick={() => void toggleFavorite()}
                title="Favorito"
                style={{ fontSize: 24, color: book.favorite ? "var(--arcilla)" : "var(--tinta3)" }}
              >
                {book.favorite ? "♥" : "♡"}
              </button>
            </div>
            {authors && (
              <p style={{ color: "var(--marfil)", fontSize: 15, marginTop: 4 }}>{authors}</p>
            )}
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              {[
                edition?.series
                  ? `▦ ${edition.series}${edition.seriesVolume ? ` · tomo ${edition.seriesVolume}` : ""}`
                  : null,
                edition?.publisher,
                pages ? `${pages} págs.` : null,
                edition?.publishedDate,
                edition?.isbn13 ?? book.customIsbn13,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="card" style={{ display: "grid", gap: 10 }}>
            <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
              ESTADO
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STATUSES.map((st) => {
                const active = reading?.status === st.key;
                return (
                  <button
                    key={st.key}
                    className="pill"
                    style={
                      active
                        ? { background: st.color, borderColor: st.color, color: "var(--ink-on-accent)" }
                        : { color: st.color }
                    }
                    onClick={() => void setStatus(st.key)}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ display: "grid", gap: 10 }}>
            <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
              PROGRESO
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              {lastProgress?.page
                ? `Vas por la página ${lastProgress.page}${pages ? ` de ${pages}` : ""}${
                    percent !== null ? ` · ${percent}%` : ""
                  }`
                : "Aún sin progreso registrado"}
            </p>
            {percent !== null && (
              <div style={{ height: 6, borderRadius: 99, background: "var(--tinta3)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${percent}%`, background: "var(--ambar)" }} />
              </div>
            )}
            <form style={{ display: "flex", gap: 10 }} onSubmit={saveProgress}>
              <input
                style={{ flex: 1, maxWidth: 200 }}
                inputMode="numeric"
                placeholder="Página actual"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
              />
              <button className="btn" type="submit" disabled={!pageInput}>
                Guardar
              </button>
            </form>
          </div>

          <div className="card" style={{ display: "grid", gap: 10 }}>
            <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
              TU VALORACIÓN
            </p>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const r = book.rating ?? 0;
                const glyph = r >= star * 2 ? "★" : r === star * 2 - 1 ? "⯨" : "☆";
                return (
                  <button
                    key={star}
                    style={{
                      fontSize: 28,
                      color: glyph === "☆" ? "var(--tinta3)" : "var(--ambar)",
                    }}
                    title={`${star} estrellas (toca de nuevo para media / quitar)`}
                    onClick={() => {
                      const next = r === star * 2 ? star * 2 - 1 : r === star * 2 - 1 ? null : star * 2;
                      void setRating(next);
                    }}
                  >
                    {glyph}
                  </button>
                );
              })}
              {book.rating ? (
                <span className="muted" style={{ fontSize: 13, marginLeft: 8 }}>
                  {(book.rating / 2).toFixed(1).replace(".0", "")} / 5
                </span>
              ) : null}
            </div>
          </div>

          {edition?.description && (
            <div className="card">
              <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, marginBottom: 8 }}>
                SINOPSIS
              </p>
              <p style={{ color: "var(--marfil)", fontSize: 14, lineHeight: 1.55 }}>
                {edition.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
