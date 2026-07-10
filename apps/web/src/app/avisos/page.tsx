"use client";

/** Centro de avisos: novedades de tus sagas y actividad de tus clubs. */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  data: { seriesId?: number; clubId?: number };
};

const GLYPH: Record<string, string> = {
  new_volume: "✨",
  upcoming_volume: "◷",
  club_post: "💬",
};

export default function Avisos() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const data = await api<{ notifications: Notification[]; unreadCount: number }>("/v1/notifications");
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }, []);

  useEffect(() => {
    void load().catch(() => setItems([]));
  }, [load]);

  async function open(n: Notification) {
    if (!n.readAt) void api(`/v1/notifications/${n.id}/read`, { method: "POST", body: {} }).catch(() => {});
    if (n.data?.seriesId) router.push(`/serie/${n.data.seriesId}`);
    else if (n.data?.clubId) router.push(`/clubs/${n.data.clubId}`);
    else await load();
  }

  return (
    <Shell>
      <div style={{ display: "grid", gap: 14, maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 500 }}>
            Avisos
          </h1>
          {unread > 0 && (
            <button
              className="muted"
              style={{ fontSize: 13 }}
              onClick={async () => {
                await api("/v1/notifications/read-all", { method: "POST", body: {} });
                await load();
              }}
            >
              Marcar todo como leído
            </button>
          )}
        </div>

        {items !== null && items.length === 0 && (
          <p className="muted" style={{ textAlign: "center", padding: 32, fontSize: 14 }}>
            Cuando salga un tomo nuevo de tus sagas o haya movimiento en tus clubs, aparecerá aquí
          </p>
        )}

        {(items ?? []).map((n) => (
          <button
            key={n.id}
            className="card"
            onClick={() => void open(n)}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              textAlign: "left",
              borderColor: n.readAt ? undefined : "rgba(217,164,65,.4)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18 }}>{GLYPH[n.type] ?? "•"}</span>
            <span style={{ display: "grid", gap: 2, flex: 1 }}>
              <strong style={{ fontSize: 14, fontWeight: n.readAt ? 400 : 600 }}>{n.title}</strong>
              {n.body && (
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {n.body}
                </span>
              )}
              <span className="muted" style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                {n.createdAt.slice(0, 10)}
              </span>
            </span>
            {!n.readAt && <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--ambar)" }} />}
          </button>
        ))}
      </div>
    </Shell>
  );
}
