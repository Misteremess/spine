"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth";

/** Marco de las páginas con sesión: cabecera + expulsión al login. */
export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [session, isPending, router]);

  if (isPending || !session) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <p className="serif muted" style={{ fontSize: 18 }}>
          Spine
        </p>
      </main>
    );
  }

  return (
    <>
      <header
        style={{
          borderBottom: "1px solid var(--tinta3)",
          background: "var(--tinta2)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          <Link href="/biblioteca" className="serif" style={{ fontSize: 20, color: "var(--ambar)" }}>
            Spine
          </Link>
          <nav style={{ display: "flex", gap: 18, fontSize: 14, flex: 1, flexWrap: "wrap" }}>
            <Link href="/biblioteca" style={{ color: "var(--marfil)" }}>
              Biblioteca
            </Link>
            <Link href="/colecciones" style={{ color: "var(--marfil)" }}>
              Colecciones
            </Link>
            <Link href="/deseos" style={{ color: "var(--marfil)" }}>
              Deseos
            </Link>
            <Link href="/stats" style={{ color: "var(--marfil)" }}>
              Stats
            </Link>
          </nav>
          <span className="muted" style={{ fontSize: 13 }}>
            {session.user.name}
          </span>
          <button
            className="muted"
            style={{ fontSize: 13 }}
            onClick={async () => {
              await authClient.signOut();
              router.replace("/login");
            }}
          >
            Salir
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>{children}</main>
    </>
  );
}
