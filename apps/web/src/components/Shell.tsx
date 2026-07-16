"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";

const NAV = [
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/colecciones", label: "Colecciones" },
  { href: "/deseos", label: "Deseos" },
  { href: "/clubs", label: "Clubs" },
  { href: "/stats", label: "Stats" },
];

/** Campana de avisos (SVG inline: el glifo ◷ era un reloj, no una campana). */
function BellIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3c-3.1 0-5.6 2.5-5.6 5.6v3.1l-1.6 3.2c-.3.6.1 1.3.8 1.3h12.8c.7 0 1.1-.7.8-1.3l-1.6-3.2V8.6C17.6 5.5 15.1 3 12 3Z"
        stroke={active ? "var(--ambar)" : "var(--mut)"}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.8 19.5a2.3 2.3 0 0 0 4.4 0" stroke={active ? "var(--ambar)" : "var(--mut)"} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

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
          background: "rgba(29,26,21,0.88)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          <Link href="/biblioteca" className="serif" style={{ fontSize: 20, color: "var(--ambar)" }}>
            Spine
          </Link>
          <nav style={{ display: "flex", gap: 4, fontSize: 14, flex: 1, flexWrap: "wrap" }}>
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                  data-active={active || undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/avisos"
            title="Avisos y novedades"
            style={{ position: "relative", display: "grid", placeItems: "center", padding: 4 }}
          >
            <BellIcon active={unread > 0} />
            {unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -6,
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
