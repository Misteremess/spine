"use client";

import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { SafeImg } from "@/components/SafeImg";
import { api } from "@/lib/api";
import { spineColor, spineInk } from "@/lib/spine";

type Item = {
  id: number;
  title: string | null;
  isbn13: string | null;
  coverUrl: string | null;
  priority: number;
  notes: string | null;
};

type Candidate = {
  isbn13: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  coverUrl: string | null;
};

const PRIORITIES = [
  { value: 1, label: "La quiero ya", color: "var(--ambar)" },
  { value: 2, label: "Normal", color: "var(--mut)" },
  { value: 3, label: "Algún día", color: "var(--salvia)" },
];

const prio = (v: number) => PRIORITIES.find((p) => p.value === v) ?? PRIORITIES[1]!;

export default function Deseos() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState(2);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Candidate[] | null>(null);

  const load = useCallback(async () => {
    const data = await api<{ items: Item[] }>("/v1/wishlist");
    setItems(data.items);
  }, []);

  useEffect(() => {
    void load().catch(() => setItems([]));
  }, [load]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (q.length < 2 || busy) return;
    setBusy(true);
    try {
      const data = await api<{ candidates: Candidate[] }>(`/v1/search?q=${encodeURIComponent(q)}`);
      setResults(data.candidates);
    } finally {
      setBusy(false);
    }
  }

  async function addCandidate(c: Candidate) {
    await api("/v1/wishlist", {
      method: "POST",
      body: c.isbn13 ? { isbn: c.isbn13, priority } : { title: c.title, priority },
    });
    setInput("");
    setResults(null);
    await load();
  }

  async function purchase(item: Item) {
    if (!confirm(`«${item.title ?? "Sin título"}» pasará a tu biblioteca. ¿Lo compraste?`)) return;
    await api(`/v1/wishlist/${item.id}/purchased`, { method: "POST", body: {} });
    await load();
  }

  async function remove(item: Item) {
    if (!confirm(`Quitar «${item.title ?? "Sin título"}» de la lista de deseos?`)) return;
    await api(`/v1/wishlist/${item.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <Shell>
      <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 500 }}>
            Lista de deseos
          </h1>
          <span className="muted" style={{ fontSize: 14 }}>
            {items?.length ?? "…"}
          </span>
        </div>

        <form className="card" style={{ display: "grid", gap: 10 }} onSubmit={search}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                className="pill"
                style={
                  priority === p.value
                    ? { background: p.color, borderColor: p.color, color: "var(--ink-on-accent)" }
                    : { color: p.color }
                }
                onClick={() => setPriority(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              style={{ flex: 1 }}
              placeholder="Busca por título o ISBN"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn" type="submit" disabled={input.trim().length < 2 || busy}>
              {busy ? "…" : "Buscar"}
            </button>
          </div>

          {/* Resultados reales para elegir */}
          {results !== null && (
            <div style={{ display: "grid", gap: 2, marginTop: 4 }}>
              {results.length === 0 ? (
                <p className="muted" style={{ fontSize: 12.5 }}>Sin resultados. Prueba con el ISBN o otro título.</p>
              ) : (
                results.map((c, i) => (
                  <button
                    key={`${c.isbn13 ?? c.title}-${i}`}
                    type="button"
                    onClick={() => void addCandidate(c)}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      textAlign: "left",
                      padding: "8px 6px",
                      borderBottom: "1px solid var(--tinta3)",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 30, height: 44, borderRadius: 4, background: c.coverUrl ? `center/cover url(${c.coverUrl})` : "var(--tinta3)", flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{c.title}</span>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {[c.authors.join(", "), c.publishedDate?.slice(0, 4)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span style={{ color: "var(--ambar)", fontSize: 18 }}>＋</span>
                  </button>
                ))
              )}
            </div>
          )}
        </form>

        {items !== null && items.length === 0 && (
          <p className="muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
            Nada en la lista — apunta arriba un título o ISBN para no perderle la pista
          </p>
        )}

        <div className="stagger" style={{ display: "grid", gap: 10 }}>
          {(items ?? []).map((item) => {
            const p = prio(item.priority);
            return (
              <div key={item.id} className="card" style={{ display: "flex", gap: 14, alignItems: "center", padding: 12 }}>
                <div
                  style={{
                    position: "relative",
                    width: 44,
                    height: 64,
                    borderRadius: 6,
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    background: spineColor(item.title ?? "?"),
                  }}
                >
                  <span
                    className="serif"
                    style={{ color: spineInk(spineColor(item.title ?? "?")), fontSize: 20, fontWeight: 500 }}
                  >
                    {(item.title ?? "?").trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  {item.coverUrl && <SafeImg src={item.coverUrl} style={{ position: "absolute", inset: 0 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14.5, fontWeight: 600 }}>{item.title ?? "Sin título"}</p>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                    <span
                      style={{
                        border: `1px solid ${p.color}`,
                        color: p.color,
                        borderRadius: 99,
                        padding: "2px 9px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {p.label}
                    </span>
                    <button className="muted" style={{ fontSize: 12 }} onClick={() => void remove(item)}>
                      Quitar
                    </button>
                  </div>
                </div>
                <button
                  style={{
                    background: "var(--salvia)",
                    color: "var(--ink-on-accent)",
                    fontWeight: 700,
                    fontSize: 12.5,
                    borderRadius: 10,
                    padding: "9px 13px",
                  }}
                  onClick={() => void purchase(item)}
                >
                  Lo compré
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
