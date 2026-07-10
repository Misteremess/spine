"use client";

/** Tus clubs de lectura: crear uno o unirse con el código de 6 letras. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, ApiError } from "@/lib/api";

type Club = {
  id: number;
  name: string;
  description: string | null;
  inviteCode: string;
  role: string;
  members: number;
  currentWork: { title: string } | null;
};

export default function Clubs() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const data = await api<{ clubs: Club[] }>("/v1/clubs");
    setClubs(data.clubs);
  }, []);

  useEffect(() => {
    void load().catch(() => setClubs([]));
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    const res = await api<{ club: { id: number } }>("/v1/clubs", { method: "POST", body: { name: name.trim() } });
    router.push(`/clubs/${res.club.id}`);
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api<{ club: { id: number } }>("/v1/clubs/join", {
        method: "POST",
        body: { code: code.trim().toUpperCase() },
      });
      router.push(`/clubs/${res.club.id}`);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "Ese código no existe." : "No se pudo entrar.");
    }
  }

  return (
    <Shell>
      <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 500 }}>
          Clubs de lectura
        </h1>

        {clubs !== null && clubs.length === 0 && (
          <p className="muted" style={{ fontSize: 14 }}>
            Lee acompañado: crea un club para tu grupo o únete con el código que te pasen.
          </p>
        )}

        {(clubs ?? []).map((c) => (
          <Link key={c.id} href={`/clubs/${c.id}`} className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span
              className="serif"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--salvia)",
                color: "var(--ink-on-accent)",
                display: "grid",
                placeItems: "center",
                fontSize: 18,
              }}
            >
              {c.name.slice(0, 1).toUpperCase()}
            </span>
            <span style={{ display: "grid", gap: 2, flex: 1 }}>
              <strong style={{ fontSize: 15 }}>{c.name}</strong>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {c.members} {c.members === 1 ? "miembro" : "miembros"}
                {c.currentWork ? ` · leyendo «${c.currentWork.title}»` : ""}
              </span>
            </span>
            {c.role === "owner" && (
              <span style={{ border: "1px solid rgba(217,164,65,.5)", color: "var(--ambar)", borderRadius: 6, fontSize: 10, padding: "2px 7px", fontWeight: 600 }}>
                ADMIN
              </span>
            )}
          </Link>
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <form className="card" style={{ display: "grid", gap: 10 }} onSubmit={create}>
            <strong style={{ fontSize: 13 }}>Crear un club</strong>
            <input placeholder="Nombre del club" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn" type="submit" disabled={name.trim().length < 2}>
              Crear
            </button>
          </form>
          <form className="card" style={{ display: "grid", gap: 10 }} onSubmit={join}>
            <strong style={{ fontSize: 13 }}>Unirse con código</strong>
            <input
              placeholder="CÓDIGO"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ letterSpacing: 4, textTransform: "uppercase" }}
            />
            <button className="btn" type="submit" disabled={code.trim().length !== 6}>
              Entrar
            </button>
            {error && <span style={{ color: "var(--arcilla)", fontSize: 12.5 }}>{error}</span>}
          </form>
        </div>
      </div>
    </Shell>
  );
}
