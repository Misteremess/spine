"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Cover } from "@/components/Cover";
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
    workId: number;
    seriesId: number | null;
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
  const [editingSaga, setEditingSaga] = useState(false);
  const [sagaName, setSagaName] = useState("");
  const [sagaVol, setSagaVol] = useState("");
  const [sagaResults, setSagaResults] = useState<{ id: number; name: string; totalVolumes: number | null; owned: boolean }[]>([]);
  const [celebrate, setCelebrate] = useState(false);

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

  // Buscar sagas mientras se edita: las tuyas primero, luego el catálogo.
  useEffect(() => {
    if (!editingSaga) return;
    const t = setTimeout(() => {
      api<{ items: typeof sagaResults }>(`/v1/series?q=${encodeURIComponent(sagaName.trim())}`)
        .then((d) => setSagaResults(d.items))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [editingSaga, sagaName]);

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
    // Celebrar al terminar un libro (plan §9): confeti discreto, una vez.
    if (status === "finished") {
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1400);
    }
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

  async function saveSaga(seriesId?: number) {
    const vol = Number(sagaVol);
    const volume = Number.isInteger(vol) && vol >= 1 ? vol : null;
    await api(`/v1/library/${book.id}/series`, {
      method: "PATCH",
      body: seriesId != null ? { seriesId, volume } : { series: sagaName.trim() || null, volume },
    });
    setEditingSaga(false);
    setSagaResults([]);
    await load();
  }

  return (
    <Shell>
      {celebrate && <Confetti />}
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
            <Cover title={title} authors={authors ? [authors] : undefined} coverUrl={edition?.coverUrl} />
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
              {edition?.series && (
                <>
                  {edition.seriesId ? (
                    <Link href={`/serie/${edition.seriesId}`} style={{ color: "var(--ambar)" }}>
                      ▦ {edition.series}
                      {edition.seriesVolume ? ` · tomo ${edition.seriesVolume}` : ""} ›
                    </Link>
                  ) : (
                    `▦ ${edition.series}${edition.seriesVolume ? ` · tomo ${edition.seriesVolume}` : ""}`
                  )}
                  {" · "}
                </>
              )}
              {[edition?.publisher, pages ? `${pages} págs.` : null, edition?.publishedDate, edition?.isbn13 ?? book.customIsbn13]
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

          <Tags userBookId={book.id} />

          <Loan userBookId={book.id} />

          <Notes userBookId={book.id} />

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

          {edition && (
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
                  SAGA
                </p>
                {!editingSaga && (
                  <button
                    style={{ color: "var(--ambar)", fontSize: 13, fontWeight: 600 }}
                    onClick={() => {
                      setSagaName(edition.series ?? "");
                      setSagaVol(edition.seriesVolume ? String(edition.seriesVolume) : "");
                      setEditingSaga(true);
                    }}
                  >
                    {edition.series ? "Cambiar" : "Asignar"}
                  </button>
                )}
              </div>
              {editingSaga ? (
                <form
                  style={{ display: "grid", gap: 10 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveSaga();
                  }}
                >
                  <input
                    autoFocus
                    placeholder="Busca una saga o escribe una nueva"
                    value={sagaName}
                    onChange={(e) => setSagaName(e.target.value)}
                  />
                  {sagaResults.length > 0 && (
                    <div style={{ display: "grid", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                      {sagaResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => void saveSaga(r.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            textAlign: "left",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--tinta3)",
                            background: r.id === edition.seriesId ? "var(--tinta3)" : "var(--tinta)",
                          }}
                        >
                          <span style={{ fontSize: 13.5, color: "var(--papel)", flex: 1 }}>▦ {r.name}</span>
                          {r.owned && (
                            <span style={{ fontSize: 10.5, color: "var(--salvia)", fontWeight: 600 }}>en tu biblioteca</span>
                          )}
                          {r.totalVolumes ? (
                            <span className="muted" style={{ fontSize: 11 }}>{r.totalVolumes} tomos</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    inputMode="numeric"
                    placeholder="Nº de tomo (opcional)"
                    value={sagaVol}
                    onChange={(e) => setSagaVol(e.target.value)}
                    style={{ maxWidth: 200 }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn" type="submit">
                      Guardar saga
                    </button>
                    <button className="muted" type="button" style={{ fontSize: 13 }} onClick={() => setEditingSaga(false)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : edition.series ? (
                <Link href={edition.seriesId ? `/serie/${edition.seriesId}` : "/colecciones"} style={{ color: "var(--marfil)", fontSize: 14 }}>
                  ▦ {edition.series}
                  {edition.seriesVolume ? ` · tomo ${edition.seriesVolume}` : ""}
                </Link>
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  Este libro no está en ninguna saga. Asígnala si pertenece a una (ej. La Rueda del Tiempo).
                </p>
              )}
            </div>
          )}

          {edition?.workId ? <Reviews workId={edition.workId} /> : null}
        </div>
      </div>
    </Shell>
  );
}

/** Etiquetas del ejemplar: chips con × y alta por nombre. */
function Tags({ userBookId }: { userBookId: number }) {
  type Tag = { id: number; name: string; color: string | null };
  const [tags, setTags] = useState<Tag[]>([]);
  const [input, setInput] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<{ items: Tag[] }>(`/v1/library/${userBookId}/tags`);
      setTags(d.items);
    } catch {
      /* no romper la ficha */
    }
  }, [userBookId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = input.trim();
    if (!name) return;
    await api(`/v1/library/${userBookId}/tags`, { method: "POST", body: { name } });
    setInput("");
    await load();
  }

  async function remove(tagId: number) {
    setTags((t) => t.filter((x) => x.id !== tagId));
    await api(`/v1/library/${userBookId}/tags/${tagId}`, { method: "DELETE" }).catch(() => load());
  }

  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
        ETIQUETAS
      </p>
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.map((t) => (
            <button
              key={t.id}
              className="pill"
              style={{ color: "var(--ambar)", borderColor: "var(--tinta3)" }}
              onClick={() => void remove(t.id)}
              title="Quitar etiqueta"
            >
              {t.name} <span className="muted">×</span>
            </button>
          ))}
        </div>
      )}
      <form style={{ display: "flex", gap: 10 }} onSubmit={add}>
        <input
          style={{ flex: 1, maxWidth: 260 }}
          placeholder="Nueva etiqueta (manga, firmado…)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn" type="submit" disabled={!input.trim()}>
          Añadir
        </button>
      </form>
    </div>
  );
}

/** Préstamo: a quién y desde cuándo; "me lo devolvió" cierra y guarda historial. */
function Loan({ userBookId }: { userBookId: number }) {
  type LoanRow = { id: number; borrower: string; loanedAt: string; dueAt: string | null };
  const [active, setActive] = useState<LoanRow | null>(null);
  const [borrower, setBorrower] = useState("");
  const [dueAt, setDueAt] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api<{ active: LoanRow | null }>(`/v1/library/${userBookId}/loans`);
      setActive(d.active);
    } catch {
      /* no romper la ficha */
    }
  }, [userBookId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function lend(e: React.FormEvent) {
    e.preventDefault();
    if (!borrower.trim()) return;
    await api(`/v1/library/${userBookId}/loans`, {
      method: "POST",
      body: { borrower: borrower.trim(), dueAt: /^\d{4}-\d{2}-\d{2}$/.test(dueAt.trim()) ? dueAt.trim() : null },
    });
    setBorrower("");
    setDueAt("");
    await load();
  }

  async function giveBack() {
    if (!active) return;
    await api(`/v1/loans/${active.id}/return`, { method: "POST" });
    await load();
  }

  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
        PRÉSTAMO
      </p>
      {active ? (
        <>
          <p style={{ fontSize: 14 }}>
            Prestado a <strong style={{ color: "var(--ambar)" }}>{active.borrower}</strong>
          </p>
          <p className="muted" style={{ fontSize: 13 }}>
            Desde el {active.loanedAt}
            {active.dueAt ? ` · recuérdalo el ${active.dueAt}` : ""}
          </p>
          <button className="btn" style={{ justifySelf: "start" }} onClick={() => void giveBack()}>
            Me lo devolvió
          </button>
        </>
      ) : (
        <form style={{ display: "grid", gap: 10 }} onSubmit={lend}>
          <input placeholder="¿A quién se lo prestas?" value={borrower} onChange={(e) => setBorrower(e.target.value)} style={{ maxWidth: 280 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <input placeholder="Recordatorio (2026-08-01)" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={{ maxWidth: 200 }} />
            <button className="btn" type="submit" disabled={!borrower.trim()}>
              Prestar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Notas y citas privadas: lista + alta con página opcional y toggle "es cita". */
function Notes({ userBookId }: { userBookId: number }) {
  type Note = { id: number; text: string; page: number | null; isQuote: boolean };
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [isQuote, setIsQuote] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ items: Note[] }>(`/v1/library/${userBookId}/notes`);
      setNotes(d.items);
    } catch {
      /* no romper la ficha */
    }
  }, [userBookId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const p = Number(page);
    await api(`/v1/library/${userBookId}/notes`, {
      method: "POST",
      body: { text: text.trim(), page: Number.isInteger(p) && p > 0 ? p : null, isQuote },
    });
    setText("");
    setPage("");
    setIsQuote(false);
    await load();
  }

  async function remove(id: number) {
    setNotes((n) => n.filter((x) => x.id !== id));
    await api(`/v1/notes/${id}`, { method: "DELETE" }).catch(() => load());
  }

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
        NOTAS Y CITAS
      </p>
      {notes.map((n) => (
        <div
          key={n.id}
          style={{
            background: "var(--tinta)",
            border: "1px solid var(--tinta3)",
            borderRadius: 10,
            padding: 12,
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <p
              className={n.isQuote ? "serif" : undefined}
              style={{
                color: n.isQuote ? "var(--marfil)" : "var(--papel)",
                fontSize: 14,
                lineHeight: 1.55,
                fontStyle: n.isQuote ? "italic" : "normal",
              }}
            >
              {n.isQuote ? `“${n.text}”` : n.text}
            </p>
            <button className="muted" style={{ fontSize: 16 }} onClick={() => void remove(n.id)} title="Eliminar">
              ×
            </button>
          </div>
          {n.page !== null && <span className="muted" style={{ fontSize: 12 }}>pág. {n.page}</span>}
        </div>
      ))}
      <form style={{ display: "grid", gap: 10 }} onSubmit={add}>
        <textarea
          rows={2}
          placeholder="Escribe una nota o una cita…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            inputMode="numeric"
            placeholder="Página"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            style={{ width: 100 }}
          />
          <button
            type="button"
            className="pill"
            style={isQuote ? { background: "var(--ambar)", borderColor: "var(--ambar)", color: "var(--ink-on-accent)" } : undefined}
            onClick={() => setIsQuote((q) => !q)}
          >
            Es cita
          </button>
          <button className="btn" type="submit" disabled={!text.trim()}>
            Añadir
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Confeti al terminar un libro (plan §9): celebración discreta, ~1,3s, no
 * bloquea nada (pointer-events: none). Sin dependencias: divs + keyframes.
 */
function Confetti() {
  const palette = ["var(--ambar)", "var(--salvia)", "var(--arcilla)", "var(--marfil)"];
  const pieces = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      <style>{`
        @keyframes spine-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .spine-confetti-piece { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
      {pieces.map((i) => {
        const left = (i * 173) % 100;
        const delay = (i % 7) * 60;
        const dur = 900 + ((i * 53) % 500);
        const size = 6 + (i % 4) * 2;
        return (
          <span
            key={i}
            className="spine-confetti-piece"
            style={{
              position: "absolute",
              top: 0,
              left: `${left}%`,
              width: size,
              height: size * 1.6,
              background: palette[i % palette.length],
              borderRadius: 1,
              animation: `spine-confetti-fall ${dur}ms cubic-bezier(.25,.6,.4,1) ${delay}ms forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Reseñas públicas de la obra: la tuya + las de la comunidad con su media. */
function Reviews({ workId }: { workId: number }) {
  type ReviewList = {
    reviews: { id: number; rating: number; text: string | null; spoilers: boolean; userName: string; own: boolean }[];
    count: number;
    average: number | null;
    mine: { rating: number; text: string | null } | null;
  };
  const [data, setData] = useState<ReviewList | null>(null);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [shown, setShown] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      setData(await api<ReviewList>(`/v1/works/${workId}/reviews`));
    } catch {
      /* las reseñas nunca rompen la ficha */
    }
  }, [workId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return null;

  const stars = (r: number, size = 15) => (
    <span style={{ color: "var(--ambar)", fontSize: size }}>
      {"★".repeat(Math.floor(r / 2))}
      {r % 2 === 1 ? "⯨" : ""}
      <span style={{ color: "var(--tinta3)" }}>{"★".repeat(5 - Math.ceil(r / 2))}</span>
    </span>
  );

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
          RESEÑAS
        </p>
        {data.average !== null && (
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {stars(Math.round(data.average))}
            <span className="muted" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
              {(data.average / 2).toFixed(1)} · {data.count}
            </span>
          </span>
        )}
      </div>

      {editing ? (
        <form
          style={{ display: "grid", gap: 10 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (rating < 1) return;
            await api(`/v1/works/${workId}/review`, {
              method: "PUT",
              body: { rating, text: text.trim() || undefined },
            });
            setEditing(false);
            await load();
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const glyph = rating >= star * 2 ? "★" : rating === star * 2 - 1 ? "⯨" : "☆";
              return (
                <button
                  key={star}
                  type="button"
                  style={{ fontSize: 26, color: glyph === "☆" ? "var(--tinta3)" : "var(--ambar)" }}
                  onClick={() =>
                    setRating(rating === star * 2 ? star * 2 - 1 : rating === star * 2 - 1 ? 0 : star * 2)
                  }
                >
                  {glyph}
                </button>
              );
            })}
          </div>
          <textarea
            rows={3}
            placeholder="¿Qué te ha parecido? (opcional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              background: "var(--tinta)",
              border: "1px solid var(--tinta3)",
              borderRadius: 8,
              color: "var(--papel)",
              padding: 10,
              fontSize: 13.5,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" type="submit" disabled={rating < 1}>
              Publicar reseña
            </button>
            <button className="muted" type="button" style={{ fontSize: 13 }} onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          style={{ color: "var(--ambar)", fontSize: 13.5, fontWeight: 600, justifySelf: "start" }}
          onClick={() => {
            setRating(data.mine?.rating ?? 0);
            setText(data.mine?.text ?? "");
            setEditing(true);
          }}
        >
          {data.mine ? "✎ Editar tu reseña" : "✎ Escribir una reseña"}
        </button>
      )}

      {data.reviews.map((r) => {
        const hidden = r.spoilers && !r.own && !shown.has(r.id);
        return (
          <div
            key={r.id}
            style={{
              background: "var(--tinta)",
              border: "1px solid var(--tinta3)",
              borderRadius: 10,
              padding: 12,
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <strong style={{ fontSize: 13 }}>{r.own ? "Tu reseña" : r.userName}</strong>
              {stars(r.rating, 13)}
            </div>
            {r.text &&
              (hidden ? (
                <button
                  className="muted"
                  style={{ fontSize: 13, fontStyle: "italic", justifySelf: "start" }}
                  onClick={() => setShown((prev) => new Set(prev).add(r.id))}
                >
                  Contiene spoilers · pulsa para leer
                </button>
              ) : (
                <p style={{ color: "var(--marfil)", fontSize: 13.5, lineHeight: 1.5 }}>{r.text}</p>
              ))}
          </div>
        );
      })}
      {data.count === 0 && !editing && (
        <p className="muted" style={{ fontSize: 13 }}>
          Nadie ha reseñado este libro todavía. Estrena tú.
        </p>
      )}
    </div>
  );
}
