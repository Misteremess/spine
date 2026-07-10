"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Volume = { volume: number | null; userBookId: number; title: string; status: string };

type Collection = {
  series: { id: number; name: string; totalVolumes: number | null };
  volumes: Volume[];
  ownedCount: number;
  maxOwned: number;
  missing: number[];
};

export default function Colecciones() {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [totalInput, setTotalInput] = useState("");

  const load = useCallback(async () => {
    const data = await api<{ collections: Collection[] }>("/v1/collections");
    setCollections(data.collections);
  }, []);

  useEffect(() => {
    void load().catch(() => setCollections([]));
  }, [load]);

  async function saveTotal(seriesId: number) {
    const total = Number(totalInput);
    setEditingId(null);
    setTotalInput("");
    await api(`/v1/collections/${seriesId}`, {
      method: "PATCH",
      body: { totalVolumes: Number.isInteger(total) && total >= 1 ? total : null },
    });
    await load();
  }

  async function wishMissing(c: Collection, n: number) {
    const title = `${c.series.name} ${n}`;
    if (!confirm(`Te falta el tomo ${n}. ¿Añadir «${title}» a la lista de deseos?`)) return;
    await api("/v1/wishlist", { method: "POST", body: { title, priority: 2 } });
  }

  return (
    <Shell>
      <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Colecciones
        </h1>

        {collections !== null && collections.length === 0 && (
          <p className="muted" style={{ textAlign: "center", padding: 32, fontSize: 14 }}>
            Cuando añadas tomos de una serie (manga, cómic, saga) se agrupan aquí solos, con los
            huecos que te faltan
          </p>
        )}

        {(collections ?? []).map((c) => {
          const total = c.series.totalVolumes;
          const ownedByNumber = new Map<number, Volume[]>();
          for (const v of c.volumes) {
            if (v.volume === null) continue;
            ownedByNumber.set(v.volume, [...(ownedByNumber.get(v.volume) ?? []), v]);
          }
          const horizon = total ?? c.maxOwned;
          const pct = horizon > 0 ? Math.min(100, Math.round((ownedByNumber.size / horizon) * 100)) : 0;
          const editing = editingId === c.series.id;

          return (
            <div key={c.series.id} className="card" style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h2 className="serif" style={{ fontSize: 19, fontWeight: 500 }}>
                  {c.series.name}
                </h2>
                <span style={{ color: "var(--ambar)", fontSize: 13.5, fontWeight: 700 }}>
                  {ownedByNumber.size} de {total ?? "?"}
                </span>
              </div>

              <div style={{ height: 5, borderRadius: 99, background: "var(--tinta3)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "var(--ambar)" }} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Array.from({ length: horizon }, (_, i) => i + 1).map((n) => {
                  const owners = ownedByNumber.get(n);
                  if (!owners) {
                    return (
                      <button
                        key={n}
                        title={`Tomo ${n}: te falta — añadir a deseos`}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          border: "1px dashed rgba(193,85,61,.55)",
                          color: "var(--arcilla)",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        onClick={() => void wishMissing(c, n)}
                      >
                        {n}
                      </button>
                    );
                  }
                  const read = owners.some((o) => o.status === "finished");
                  const bg = read ? "var(--salvia)" : "var(--ambar)";
                  return (
                    <Link
                      key={n}
                      href={`/libro/${owners[0]!.userBookId}`}
                      title={owners[0]!.title}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: bg,
                        color: "var(--ink-on-accent)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {n}
                    </Link>
                  );
                })}
              </div>

              {c.missing.length > 0 && (
                <p style={{ color: "var(--arcilla)", fontSize: 12.5 }}>
                  Te faltan {c.missing.length}: pulsa un hueco para mandarlo a deseos
                </p>
              )}

              {editing ? (
                <form
                  style={{ display: "flex", gap: 8 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveTotal(c.series.id);
                  }}
                >
                  <input
                    style={{ maxWidth: 260, fontSize: 13 }}
                    autoFocus
                    inputMode="numeric"
                    placeholder={`¿Cuántos tomos tiene ${c.series.name}?`}
                    value={totalInput}
                    onChange={(e) => setTotalInput(e.target.value)}
                  />
                  <button className="btn" style={{ padding: "8px 14px", fontSize: 13 }} type="submit">
                    OK
                  </button>
                </form>
              ) : (
                <button
                  className="muted"
                  style={{ fontSize: 12.5, justifySelf: "start" }}
                  onClick={() => {
                    setEditingId(c.series.id);
                    setTotalInput(total ? String(total) : "");
                  }}
                >
                  {total ? `La serie completa son ${total} · cambiar` : "✎ Fijar cuántos tomos tiene la serie"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
