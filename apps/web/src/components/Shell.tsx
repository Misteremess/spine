"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";

/** Marco de las páginas con sesión: cabecera + expulsión al login. */
export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    const poll = () =>
      api<{ unreadCount: number }>("/v1/notifications")
        .then((d) => setUnread(d.unreadCount))
        .catch(() => {});
    poll();
    const t = setInterval(poll, 60000);
    return () => clearInterval(t);
  }, [session]);

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
            <Link href="/clubs" style={{ color: "var(--marfil)" }}>
              Clubs
            </Link>
            <Link href="/stats" style={{ color: "var(--marfil)" }}>
              Stats
            </Link>
          </nav>
          <Link
            href="/avisos"
            title="Avisos y novedades"
            style={{ position: "relative", color: unread > 0 ? "var(--ambar)" : "var(--mut)", fontSize: 17 }}
          >
            ◷
            {unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  right: -10,
                  background: "var(--arcilla)",
                  color: "var(--papel)",
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                  display: "grid",
                  placeItems: "center",
                  padding: "0 3px",
                }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link href="/cuenta" className="muted" style={{ fontSize: 13 }} title="Tu cuenta">
            {session.user.name}
          </Link>
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
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
        <div key={pathname} className="page-enter">
          {children}
        </div>
      </main>
    </>
  );
}
