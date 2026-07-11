"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Stats = {
  library: { total: number; byStatus: Record<string, number>; readPct: number };
  thisYear: { finished: number; pages: number };
  months: { month: string; finished: number; pages: number }[];
  streakDays: number;
  collection: { valueCents: number; series: number; seriesComplete: number };
  topAuthors: { name: string; count: number }[];
};

const MONTH_LABEL = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const euros = (cents: number) =>
  (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

/** Reto anual de lectura (plan §5.11): barra de progreso editable. */
function GoalWidget() {
  type Goal = { type: string; target: number; current: number; pct: number };
  const year = new Date().getFullYear();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [progressBooks, setProgressBooks] = useState(0);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState("");

  const load = () =>
    api<{ progress: { books: number }; goals: Goal[] }>(`/v1/goals?year=${year}`)
      .then((d) => {
        setProgressBooks(d.progress.books);
        setGoal(d.goals.find((g) => g.type === "books") ?? null);
      })
      .catch(() => {});

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(target);
    if (!Number.isInteger(n) || n < 1) return;
    await api("/v1/goals", { method: "PUT", body: { year, type: "books", target: n } });
    setEditing(false);
    setTarget("");
    await load();
  }

  if (editing || !goal) {
    return (
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
          RETO DE LECTURA {year}
        </p>
        {!goal && !editing && (
          <p className="muted" style={{ fontSize: 13 }}>
            Ponte un objetivo de libros para este año. Llevas {progressBooks} leído{progressBooks === 1 ? "" : "s"}.
          </p>
        )}
        <form style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }} onSubmit={save}>
          <input
            inputMode="numeric"
            placeholder="Nº de libros"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ width: 130 }}
            autoFocus={editing}
          />
          <button className="btn" type="submit" disabled={!target}>
            Guardar
          </button>
          {editing && (
            <button className="muted" type="button" style={{ fontSize: 13 }} onClick={() => setEditing(false)}>
              Cancelar
            </button>
          )}
        </form>
      </div>
    );
  }

  const done = goal.current >= goal.target;
  return (
    <button className="card" style={{ display: "grid", gap: 10, textAlign: "left" }} onClick={() => { setTarget(String(goal.target)); setEditing(true); }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
          RETO {year}
        </p>
        <span style={{ color: done ? "var(--salvia)" : "var(--ambar)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {goal.current} / {goal.target} libros
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--tinta3)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${goal.pct}%`, background: done ? "var(--salvia)" : "var(--ambar)" }} />
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        {done ? "¡Reto conseguido! 🎉 Pulsa para ampliarlo." : `Te quedan ${goal.target - goal.current} · ${goal.pct}%`}
      </p>
    </button>
  );
}

function Tile({ big, label, accent }: { big: string; label: string; accent?: string }) {
  return (
    <div className="card">
      <p className="serif" style={{ fontSize: 30, color: accent ?? "var(--papel)" }}>
        {big}
      </p>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
        {label}
      </p>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void api<Stats>("/v1/stats").then(setStats).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <Shell>
        <p className="muted">Cargando…</p>
      </Shell>
    );
  }

  const { library, thisYear, months, streakDays, collection, topAuthors } = stats;
  const maxFinished = Math.max(1, ...months.map((m) => m.finished));

  return (
    <Shell>
      <div style={{ display: "grid", gap: 16, maxWidth: 760 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 500 }}>
            Estadísticas
          </h1>
          <a href="/wrapped" style={{ color: "var(--ambar)", fontSize: 13.5, fontWeight: 600 }}>
            ✦ Tu año lector →
          </a>
        </div>

        <GoalWidget />

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <Tile big={String(library.total)} label="en tu biblioteca" />
          <Tile big={`${library.readPct}%`} label="ya leído" accent="var(--salvia)" />
          <Tile big={String(library.byStatus.reading ?? 0)} label="leyendo ahora" accent="var(--ambar)" />
          <Tile big={String(library.byStatus.pending ?? 0)} label="esperando turno" />
        </div>

        <div className="card" style={{ display: "grid", gap: 14 }}>
          <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
            ESTE AÑO
          </p>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div>
              <p className="serif" style={{ fontSize: 26 }}>{thisYear.finished}</p>
              <p className="muted" style={{ fontSize: 12 }}>libros terminados</p>
            </div>
            <div>
              <p className="serif" style={{ fontSize: 26 }}>{thisYear.pages.toLocaleString("es-ES")}</p>
              <p className="muted" style={{ fontSize: 12 }}>páginas</p>
            </div>
            <div>
              <p className="serif" style={{ fontSize: 26, color: streakDays > 0 ? "var(--ambar)" : undefined }}>
                {streakDays > 0 ? `🔥 ${streakDays}` : "—"}
              </p>
              <p className="muted" style={{ fontSize: 12 }}>días de racha</p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              borderTop: "1px solid var(--tinta3)",
              paddingTop: 12,
            }}
          >
            {months.map((m) => {
              const h = m.finished === 0 ? 3 : 14 + (m.finished / maxFinished) * 56;
              const idx = Number(m.month.slice(5, 7)) - 1;
              return (
                <div key={m.month} style={{ flex: 1, display: "grid", gap: 4, justifyItems: "center" }}>
                  <span className="muted" style={{ fontSize: 10 }}>
                    {m.finished > 0 ? m.finished : " "}
                  </span>
                  <div
                    style={{
                      height: h,
                      width: "100%",
                      maxWidth: 30,
                      borderRadius: 5,
                      background: m.finished > 0 ? "var(--ambar)" : "var(--tinta3)",
                    }}
                  />
                  <span className="muted" style={{ fontSize: 10 }}>
                    {MONTH_LABEL[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ display: "grid", gap: 12 }}>
          <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
            TU COLECCIÓN
          </p>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {collection.valueCents > 0 && (
              <div>
                <p className="serif" style={{ fontSize: 26 }}>{euros(collection.valueCents)}</p>
                <p className="muted" style={{ fontSize: 12 }}>invertido</p>
              </div>
            )}
            <div>
              <p className="serif" style={{ fontSize: 26 }}>{collection.series}</p>
              <p className="muted" style={{ fontSize: 12 }}>series</p>
            </div>
            <div>
              <p className="serif" style={{ fontSize: 26, color: collection.seriesComplete > 0 ? "var(--salvia)" : undefined }}>
                {collection.seriesComplete}
              </p>
              <p className="muted" style={{ fontSize: 12 }}>completas</p>
            </div>
          </div>
          {collection.valueCents === 0 && (
            <p className="muted" style={{ fontSize: 12.5 }}>
              Apunta el precio de compra en la ficha de tus libros y aquí verás cuánto vale tu estantería
            </p>
          )}
        </div>

        {topAuthors.length > 0 && (
          <div className="card" style={{ display: "grid", gap: 10 }}>
            <p className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>
              AUTORES DE CABECERA
            </p>
            {topAuthors.map((a, i) => (
              <div key={a.name} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span className="serif" style={{ color: "var(--ambar)", width: 18 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 14.5 }}>{a.name}</span>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {a.count} {a.count === 1 ? "libro" : "libros"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
