"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Item = {
  id: number;
  title: string | null;
  coverUrl: string | null;
  isbn13: string | null;
  pages: number | null;
  favorite: boolean;
  authors: string[];
  reading: { status: string } | null;
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
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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

        <div
          style={{
            display: "grid",
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
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.coverUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        padding: 10,
                        textAlign: "center",
                      }}
                    >
                      <span className="muted" style={{ fontSize: 12 }}>
                        {item.title ?? "Sin título"}
                      </span>
                    </div>
                  )}
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
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
