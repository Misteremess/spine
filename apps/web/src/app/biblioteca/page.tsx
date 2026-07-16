"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Cover } from "@/components/Cover";
import { api, ApiError } from "@/lib/api";
import { spineColor, spineHeight, spineInk, spineWidth } from "@/lib/spine";

type Item = {
  id: number;
  title: string | null;
  coverUrl: string | null;
  isbn13: string | null;
  pages: number | null;
  favorite: boolean;
  authors: string[];
  reading: { status: string } | null;
  loanedTo: string | null;
  tags: { id: number; name: string; color: string | null }[];
};

type Candidate = {
  isbn13: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  pages: number | null;
  coverUrl: string | null;
};

const STATUS: Record<string, { text: string; color: string }> = {
  pending: { text: "Pendiente", color: "var(--mut)" },
  reading: { text: "Leyendo", color: "var(--ambar)" },
  paused: { text: "En pausa", color: "var(--mut)" },
  finished: { text: "Leído", color: "var(--salvia)" },
  abandoned: { text: "Abandonado", color: "var(--arcilla)" },
};

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "reading", label: "Leyendo" },
  { key: "pending", label: "Pendientes" },
  { key: "finished", label: "Leídos" },
];

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

export default function Biblioteca() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [shelf, setShelf] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Item[] }>("/v1/library");
      setItems(data.items);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = addInput.trim();
    if (q.length < 2 || searching) return;
    setSearching(true);
    setAddMsg(null);
    try {
      const data = await api<{ candidates: Candidate[] }>(`/v1/search?q=${encodeURIComponent(q)}`);
      setResults(data.candidates);
    } catch {
      setAddMsg({ text: "No se pudo buscar. Inténtalo de nuevo", ok: false });
    } finally {
      setSearching(false);
    }
  }

  async function addCandidate(c: Candidate) {
    const key = c.isbn13 ?? c.title;
    if (addingKey) return;
    setAddingKey(key);
    setAddMsg(null);
    try {
      if (c.isbn13) {
        const res = await api<{ metadata: { title: string } }>("/v1/library", {
          method: "POST",
          body: { isbn: c.isbn13 },
        });
        setAddMsg({ text: `✓ «${res.metadata.title}» añadido`, ok: true });
      } else {
        await api("/v1/library/manual", {
          method: "POST",
          body: { title: c.title, authors: c.authors.join(", ") || undefined },
        });
        setAddMsg({ text: `✓ «${c.title}» añadido`, ok: true });
      }
      setAddInput("");
      setResults(null);
      setSearchOpen(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAddMsg({ text: "Ya tienes este libro en la biblioteca", ok: false });
      } else {
        setAddMsg({ text: "No se pudo añadir. Inténtalo de nuevo", ok: false });
      }
    } finally {
      setAddingKey(null);
    }
  }

  const visible = useMemo(() => {
    let list = items ?? [];
    if (filter !== "all") list = list.filter((it) => (it.reading?.status ?? "pending") === filter);
    const q = fold(query.trim());
    if (q) {
      list = list.filter(
        (it) => fold(it.title ?? "").includes(q) || it.authors.some((a) => fold(a).includes(q))
      );
    }
    return list;
  }, [items, query, filter]);

  return (
    <Shell>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 500 }}>
            Biblioteca
          </h1>
          <span className="muted" style={{ fontSize: 14 }}>
            {items?.length ?? "…"} libros
          </span>
          <span style={{ flex: 1 }} />
          <button
            className="btn"
            style={{ padding: "8px 14px", fontSize: 13.5 }}
            onClick={() => setSearchOpen((v) => !v)}
          >
            {searchOpen ? "Cerrar" : "＋ Añadir libro"}
          </button>
          <Link href="/importar" className="muted" style={{ fontSize: 13 }}>
            Importar de Goodreads
          </Link>
        </div>

        {searchOpen && (
          <div className="card" style={{ display: "grid", gap: 10, maxWidth: 640 }}>
            <form style={{ display: "flex", gap: 8 }} onSubmit={search}>
              <input
                style={{ flex: 1 }}
                placeholder="Busca por título, autor o ISBN"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                autoFocus
              />
              <button className="btn" type="submit" disabled={addInput.trim().length < 2 || searching}>
                {searching ? "…" : "Buscar"}
              </button>
            </form>

            {results !== null && (
              <div style={{ display: "grid", gap: 2, maxHeight: 360, overflowY: "auto" }}>
                {results.length === 0 ? (
                  <p className="muted" style={{ fontSize: 12.5 }}>
                    Sin resultados. Prueba con otro título o el ISBN.
                  </p>
                ) : (
                  results.map((c, i) => {
                    const key = c.isbn13 ?? c.title;
                    const busy = addingKey === key;
                    return (
                      <button
                        key={`${key}-${i}`}
                        type="button"
                        onClick={() => void addCandidate(c)}
                        disabled={Boolean(addingKey)}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          textAlign: "left",
                          padding: "8px 6px",
                          borderBottom: "1px solid var(--tinta3)",
                          cursor: "pointer",
                          opacity: busy ? 0.5 : 1,
                        }}
                      >
                        <span
                          style={{
                            width: 30,
                            height: 44,
                            borderRadius: 4,
                            background: c.coverUrl ? `center/cover url(${c.coverUrl})` : "var(--tinta3)",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{c.title}</span>
                          <span className="muted" style={{ fontSize: 11 }}>
                            {[c.authors.join(", "), c.publishedDate?.slice(0, 4)].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span style={{ color: "var(--ambar)", fontSize: 18 }}>{busy ? "…" : "＋"}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {addMsg && (
          <p style={{ color: addMsg.ok ? "var(--salvia)" : "var(--arcilla)", fontSize: 13.5 }}>
            {addMsg.text}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            className="pill"
            style={shelf ? { borderColor: "var(--ambar)", color: "var(--ambar)" } : undefined}
            onClick={() => setShelf((v) => !v)}
            title="Cambiar vista"
          >
            {shelf ? "▦ Mosaico" : "▥ Estantería"}
          </button>
          <input
            style={{ flex: "1 1 220px", maxWidth: 340 }}
            placeholder="Buscar por título o autor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className="pill"
              style={
                filter === f.key
                  ? { background: "var(--ambar)", borderColor: "var(--ambar)", color: "var(--ink-on-accent)" }
                  : undefined
              }
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {items === null && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ display: "grid", gap: 6 }}>
                <div className="skeleton" style={{ aspectRatio: "2 / 3", borderRadius: 10 }} />
                <div className="skeleton" style={{ height: 11, borderRadius: 4, width: "80%" }} />
                <div className="skeleton" style={{ height: 9, borderRadius: 4, width: "55%" }} />
              </div>
            ))}
          </div>
        )}

        {items !== null && visible.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <p className="serif" style={{ fontSize: 18, color: "var(--marfil)" }}>
              {items.length === 0 ? "Tu biblioteca está vacía" : "Nada coincide con la búsqueda"}
            </p>
            {items.length === 0 && (
              <p className="muted" style={{ fontSize: 13.5, marginTop: 8 }}>
                Escanea libros desde la app móvil y aparecerán aquí al instante
              </p>
            )}
          </div>
        )}

        {shelf && visible.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                gap: 4,
                borderBottom: "4px solid var(--tinta3)",
                paddingBottom: 4,
              }}
            >
              {visible.map((item) => {
                const seed = item.title ?? String(item.id);
                const bg = spineColor(seed);
                const ink = spineInk(bg);
                return (
                  <Link
                    key={item.id}
                    href={`/libro/${item.id}`}
                    title={item.title ?? undefined}
                    style={{
                      width: spineWidth(item.pages),
                      height: spineHeight(seed),
                      background: bg,
                      color: ink,
                      borderRadius: "4px 4px 0 0",
                      border: "1px solid rgba(0,0,0,0.25)",
                      borderTop: "5px solid rgba(255,255,255,0.16)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxHeight: spineHeight(seed) - 20,
                        padding: "8px 0",
                      }}
                    >
                      {item.title ?? "Sin título"}
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10, textAlign: "center" }}>
              Cada lomo es un libro · el grosor son sus páginas
            </p>
          </div>
        )}

        <div
          className="stagger"
          style={{
            display: shelf ? "none" : "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
            gap: 16,
          }}
        >
          {visible.map((item) => {
            const st = item.reading ? STATUS[item.reading.status] : undefined;
            return (
              <Link
                key={item.id}
                href={`/libro/${item.id}`}
                style={{ display: "grid", gap: 6 }}
                title={item.title ?? undefined}
              >
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "2 / 3",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "var(--tinta2)",
                    border: "1px solid var(--tinta3)",
                  }}
                >
                  <Cover title={item.title} authors={item.authors} coverUrl={item.coverUrl} />
                  {item.favorite && (
                    <span
                      style={{
                        position: "absolute",
                        top: 5,
                        right: 8,
                        color: "var(--arcilla)",
                        textShadow: "0 0 4px var(--tinta)",
                      }}
                    >
                      ♥
                    </span>
                  )}
                  {st && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 7,
                        left: 7,
                        width: 9,
                        height: 9,
                        borderRadius: 99,
                        background: st.color,
                        border: "1.5px solid var(--tinta)",
                      }}
                    />
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--papel)" }}>
                    {item.title ?? "Sin título"}
                  </p>
                  {item.authors.length > 0 && (
                    <p className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                      {item.authors.join(", ")}
                    </p>
                  )}
                  {item.loanedTo && (
                    <p style={{ color: "var(--arcilla)", fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                      → prestado a {item.loanedTo}
                    </p>
                  )}
                  {item.tags.length > 0 && (
                    <p style={{ color: "var(--salvia)", fontSize: 10.5, marginTop: 2 }}>
                      {item.tags.map((t) => t.name).join(" · ")}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
