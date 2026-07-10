"use client";

import { toIsbn13 } from "@spine/shared";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Item = {
  id: number;
  title: string | null;
  isbn13: string | null;
  coverUrl: string | null;
  priority: number;
  notes: string | null;
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

  const load = useCallback(async () => {
    const data = await api<{ items: Item[] }>("/v1/wishlist");
    setItems(data.items);
  }, []);

  useEffect(() => {
    void load().catch(() => setItems([]));
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const isbn13 = toIsbn13(text.replace(/[-\s]/g, ""));
      await api("/v1/wishlist", {
        method: "POST",
        body: isbn13 ? { isbn: isbn13, priority } : { title: text, priority },
      });
      setInput("");
      await load();
    } finally {
      setBusy(false);
    }
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

        <form className="card" style={{ display: "grid", gap: 10 }} onSubmit={add}>
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
              placeholder="Título o ISBN"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn" type="submit" disabled={!input.trim() || busy}>
              {busy ? "…" : "Añadir"}
            </button>
          </div>
        </form>

        {items !== null && items.length === 0 && (
          <p className="muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
            Nada en la lista — apunta arriba un título o ISBN para no perderle la pista
          </p>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {(items ?? []).map((item) => {
            const p = prio(item.priority);
            return (
              <div key={item.id} className="card" style={{ display: "flex", gap: 14, alignItems: "center", padding: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 64,
                    borderRadius: 6,
                    overflow: "hidden",
                    background: "var(--tinta3)",
                    flexShrink: 0,
                  }}
                >
                  {item.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
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
