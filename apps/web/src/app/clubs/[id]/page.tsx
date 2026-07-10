"use client";

/**
 * Vida del club: libro actual, miembros, hilo de debate y código para
 * invitar. El owner elige el libro desde su biblioteca.
 */
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Detail = {
  club: {
    id: number;
    name: string;
    description: string | null;
    inviteCode: string;
    role: string;
    currentWork: { id: number; title: string; coverUrl: string | null } | null;
  };
  members: { name: string; role: string; you: boolean }[];
  posts: { id: number; text: string; createdAt: string; userName: string; own: boolean }[];
};

export default function ClubDetalle() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState("");
  const [picking, setPicking] = useState(false);
  const [library, setLibrary] = useState<{ id: number; title: string | null; editionId: number }[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setDetail(await api<Detail>(`/v1/clubs/${id}`));
  }, [id]);

  useEffect(() => {
    void load().catch(() => router.replace("/clubs"));
    const t = setInterval(() => void load().catch(() => {}), 20000);
    return () => clearInterval(t);
  }, [load, router]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [detail?.posts.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessage("");
    await api(`/v1/clubs/${id}/posts`, { method: "POST", body: { text } });
    await load();
  }

  async function openPicker() {
    const data = await api<{ items: { id: number; title: string | null; editionId?: number | null }[] }>("/v1/library");
    setLibrary(
      data.items.filter((it): it is { id: number; title: string | null; editionId: number } => !!it.editionId)
    );
    setPicking(true);
  }

  async function pick(editionId: number) {
    setPicking(false);
    await api(`/v1/clubs/${id}`, { method: "PATCH", body: { editionId } });
    await load();
  }

  if (!detail) {
    return (
      <Shell>
        <p className="muted">Cargando…</p>
      </Shell>
    );
  }

  const { club, members, posts } = detail;

  return (
    <Shell>
      <div style={{ display: "grid", gap: 16, maxWidth: 680 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 500, flex: 1 }}>
            {club.name}
          </h1>
          <button
            title="Copiar código de invitación"
            onClick={() => {
              void navigator.clipboard.writeText(club.inviteCode);
              alert(`Código copiado: ${club.inviteCode}`);
            }}
            style={{
              border: "1px solid rgba(217,164,65,.45)",
              color: "var(--ambar)",
              borderRadius: 10,
              padding: "6px 12px",
              fontWeight: 700,
              letterSpacing: 3,
              fontSize: 13,
            }}
          >
            {club.inviteCode} ⧉
          </button>
          <button
            className="muted"
            style={{ fontSize: 12.5 }}
            onClick={async () => {
              if (!confirm(`¿Salir de «${club.name}»?`)) return;
              await api(`/v1/clubs/${id}/leave`, { method: "POST", body: {} });
              router.replace("/clubs");
            }}
          >
            Salir del club
          </button>
        </div>

        <div className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {club.currentWork?.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={club.currentWork.coverUrl} alt="" style={{ width: 44, height: 64, objectFit: "cover", borderRadius: 6 }} />
          ) : null}
          <div style={{ flex: 1, display: "grid", gap: 2 }}>
            <span className="muted" style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
              Leyendo ahora
            </span>
            <strong style={{ fontSize: 15 }}>{club.currentWork?.title ?? "Aún sin libro elegido"}</strong>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {members.map((m) => (m.you ? "tú" : m.name.split(" ")[0])).join(", ")}
            </span>
          </div>
          {club.role === "owner" && (
            <button className="btn" style={{ fontSize: 12.5, padding: "8px 12px" }} onClick={() => void openPicker()}>
              {club.currentWork ? "Cambiar" : "Elegir libro"}
            </button>
          )}
        </div>

        {picking && (
          <div className="card" style={{ display: "grid", gap: 4, maxHeight: 300, overflowY: "auto" }}>
            <strong style={{ fontSize: 13, marginBottom: 6 }}>¿Qué vais a leer?</strong>
            {library.map((b) => (
              <button
                key={b.id}
                style={{ textAlign: "left", padding: "8px 4px", borderBottom: "1px solid var(--tinta3)", fontSize: 14 }}
                onClick={() => void pick(b.editionId)}
              >
                {b.title ?? "Sin título"}
              </button>
            ))}
            <button className="muted" style={{ fontSize: 12.5, padding: 8 }} onClick={() => setPicking(false)}>
              Cancelar
            </button>
          </div>
        )}

        <div
          ref={feedRef}
          style={{
            display: "grid",
            gap: 10,
            maxHeight: 420,
            overflowY: "auto",
            padding: "6px 2px",
            alignContent: "start",
          }}
        >
          {posts.length === 0 && (
            <p className="muted" style={{ textAlign: "center", padding: 20, fontSize: 13.5 }}>
              Todavía nadie ha dicho nada. Rompe el hielo ↓
            </p>
          )}
          {posts.map((p) => (
            <div
              key={p.id}
              style={{
                justifySelf: p.own ? "end" : "start",
                maxWidth: "80%",
                background: p.own ? "var(--ambar)" : "var(--tinta2)",
                color: p.own ? "var(--ink-on-accent)" : "var(--papel)",
                border: p.own ? "none" : "1px solid var(--tinta3)",
                borderRadius: 14,
                borderBottomRightRadius: p.own ? 4 : 14,
                borderBottomLeftRadius: p.own ? 14 : 4,
                padding: "9px 12px",
                display: "grid",
                gap: 3,
              }}
            >
              {!p.own && (
                <span style={{ color: "var(--ambar)", fontSize: 11, fontWeight: 600 }}>{p.userName}</span>
              )}
              <span style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{p.text}</span>
              <span style={{ fontSize: 10, opacity: 0.6, justifySelf: "end", fontVariantNumeric: "tabular-nums" }}>
                {p.createdAt.slice(11, 16)}
              </span>
            </div>
          ))}
        </div>

        <form style={{ display: "flex", gap: 10 }} onSubmit={send}>
          <input
            style={{ flex: 1 }}
            placeholder="Escribe al club…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button className="btn" type="submit" disabled={!message.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </Shell>
  );
}
