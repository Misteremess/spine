/**
 * Inicio (prototipo, pantalla 2): el hábito diario. «Leyendo ahora» con el
 * progreso a un toque, las novedades de tus sagas y el estado de tus
 * colecciones. Nunca un feed.
 */
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth";
import { useThemeColors, useThemedStyles } from "../../lib/settings";
import { fonts, type Palette } from "../../lib/theme";
import { Text, TextInput } from "../../lib/ui";
import { Cover } from "../../lib/Cover";

type LibItem = {
  id: number;
  title: string | null;
  coverUrl: string | null;
  pages: number | null;
  authors: string[];
  reading: { status: string } | null;
};
type Collection = {
  series: { id: number; name: string; totalVolumes: number | null };
  ownedCount: number;
  missing: number[];
};
type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  data: { seriesId?: number; clubId?: number };
};

export default function Home() {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const [items, setItems] = useState<LibItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [lib, cols, notif] = await Promise.allSettled([
      api<{ items: LibItem[] }>("/v1/library"),
      api<{ collections: Collection[] }>("/v1/collections"),
      api<{ notifications: Notification[]; unreadCount: number }>("/v1/notifications"),
    ]);
    if (lib.status === "fulfilled") setItems(lib.value.items);
    if (cols.status === "fulfilled") setCollections(cols.value.collections);
    if (notif.status === "fulfilled") {
      setNotifications(notif.value.notifications.filter((n) => !n.readAt).slice(0, 3));
      setUnread(notif.value.unreadCount);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load().catch(() => {});
    }, [load])
  );

  const reading = items.filter((it) => it.reading?.status === "reading");
  const pending = items.filter((it) => (it.reading?.status ?? "pending") === "pending");
  const gaps = collections.filter((c) => c.missing.length > 0);
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingTop: insets.top + 14, padding: 18, gap: 20, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.ambar}
          onRefresh={async () => {
            setRefreshing(true);
            await load().catch(() => {});
            setRefreshing(false);
          }}
        />
      }
    >
      {/* Cabecera con campana de avisos */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: colors.mut, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Spine
          </Text>
          <Text style={s.h1}>{firstName ? `Hola, ${firstName}` : "Tu biblioteca"}</Text>
        </View>
        <Pressable onPress={() => router.push("/notifications")} hitSlop={10} style={s.bell}>
          <Text style={{ fontSize: 20, color: unread > 0 ? colors.ambar : colors.mut }}>◷</Text>
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={{ color: colors.inkOnAccent, fontSize: 9.5, fontFamily: fonts.sansBold }}>
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Novedades de tus sagas y clubs */}
      {notifications.length > 0 && (
        <View style={{ gap: 8 }}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              style={s.notifCard}
              onPress={() =>
                n.data?.seriesId
                  ? router.push(`/series/${n.data.seriesId}`)
                  : n.data?.clubId
                    ? router.push(`/club/${n.data.clubId}`)
                    : router.push("/notifications")
              }
            >
              <Text style={{ fontSize: 16 }}>{n.type === "club_post" ? "💬" : "✨"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.papel, fontSize: 13, fontFamily: fonts.sansSemi }} numberOfLines={1}>
                  {n.title}
                </Text>
                {n.body ? (
                  <Text style={{ color: colors.mut, fontSize: 11.5 }} numberOfLines={1}>
                    {n.body}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: colors.ambar, fontSize: 16 }}>›</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Reto anual de lectura (plan §5.11) */}
      <GoalCard />

      {/* Leyendo ahora */}
      <View style={{ gap: 10 }}>
        <Text style={s.section}>Leyendo ahora</Text>
        {reading.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ color: colors.mut, fontSize: 12.5, textAlign: "center" }}>
              Nada en marcha. Elige tu próxima lectura del montón de pendientes
              {pending.length > 0 ? ` (${pending.length})` : ""}.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {reading.map((it) => (
              <Pressable key={it.id} style={s.readingCard} onPress={() => router.push(`/book/${it.id}`)}>
                <Cover title={it.title} author={it.authors[0]} coverUrl={it.coverUrl} style={s.readingCover} titleSize={11} />
                <Text style={{ color: colors.papel, fontSize: 12, fontFamily: fonts.sansSemi, width: 96 }} numberOfLines={2}>
                  {it.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Tus sagas con huecos */}
      {gaps.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={s.section}>Tus colecciones</Text>
          {gaps.slice(0, 4).map((c) => {
            const total = c.series.totalVolumes;
            return (
              <Pressable key={c.series.id} style={s.gapCard} onPress={() => router.push(`/series/${c.series.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.papel, fontSize: 13.5, fontFamily: fonts.sansSemi }} numberOfLines={1}>
                    {c.series.name}
                  </Text>
                  <Text style={{ color: colors.mut, fontSize: 11.5 }}>
                    {c.ownedCount} de {total ?? "?"} · te faltan {c.missing.length}
                  </Text>
                </View>
                <Text style={{ color: colors.arcilla, fontSize: 12, fontFamily: fonts.sansBold }}>
                  {c.missing.slice(0, 5).map((n) => `#${n}`).join(" ")}
                  {c.missing.length > 5 ? "…" : ""}
                </Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push("/collections")} hitSlop={6}>
            <Text style={{ color: colors.ambar, fontSize: 12.5, fontFamily: fonts.sansSemi }}>
              Ver todas las colecciones →
            </Text>
          </Pressable>
        </View>
      )}

      {items.length === 0 && (
        <View style={{ alignItems: "center", gap: 10, marginTop: 30 }}>
          <Text style={{ color: colors.marfil, fontSize: 17, fontFamily: fonts.serif }}>
            Empieza escaneando un libro
          </Text>
          <Pressable style={s.cta} onPress={() => router.push("/scanner")}>
            <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 14 }}>▣ Abrir escáner</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/import")} hitSlop={8}>
            <Text style={{ color: colors.mut, fontSize: 12.5 }}>¿Vienes de Goodreads? Importa tu CSV →</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Reto anual: barra de progreso de libros del año. Si no hay objetivo,
 * ofrece fijarlo sin salir de Inicio. Se celebra, nunca se culpabiliza (§9).
 */
function GoalCard() {
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  type Goal = { type: string; target: number; current: number; pct: number };
  const year = new Date().getFullYear();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [progressBooks, setProgressBooks] = useState(0);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ progress: { books: number }; goals: Goal[] }>(`/v1/goals?year=${year}`);
      setProgressBooks(d.progress.books);
      setGoal(d.goals.find((g) => g.type === "books") ?? null);
    } catch {
      /* el reto nunca rompe Inicio */
    }
  }, [year]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function save() {
    const n = Number(target);
    if (!Number.isInteger(n) || n < 1 || saving) return;
    setSaving(true);
    try {
      await api("/v1/goals", { method: "PUT", body: { year, type: "books", target: n } });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
      setTarget("");
      Keyboard.dismiss();
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <View style={s.goalCard}>
        <Text style={s.section}>Reto {year}</Text>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <TextInput
            style={s.goalInput}
            value={target}
            onChangeText={setTarget}
            placeholder="Nº de libros"
            placeholderTextColor={colors.mut}
            keyboardType="number-pad"
            autoFocus
          />
          <Pressable style={[s.goalBtn, (!target || saving) && { opacity: 0.4 }]} disabled={!target || saving} onPress={() => void save()}>
            <Text style={{ color: colors.inkOnAccent, fontFamily: fonts.sansBold, fontSize: 13 }}>Guardar</Text>
          </Pressable>
          <Pressable onPress={() => setEditing(false)} hitSlop={8}>
            <Text style={{ color: colors.mut, fontSize: 13 }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!goal) {
    return (
      <Pressable
        style={s.goalCard}
        onPress={() => {
          setTarget("");
          setEditing(true);
        }}
      >
        <Text style={s.section}>Reto de lectura {year}</Text>
        <Text style={{ color: colors.mut, fontSize: 12.5 }}>
          Ponte un objetivo de libros para este año. Llevas {progressBooks} leído{progressBooks === 1 ? "" : "s"}.
        </Text>
        <Text style={{ color: colors.ambar, fontSize: 12.5, fontFamily: fonts.sansSemi }}>Fijar mi reto →</Text>
      </Pressable>
    );
  }

  const done = goal.current >= goal.target;
  return (
    <Pressable style={s.goalCard} onPress={() => { setTarget(String(goal.target)); setEditing(true); }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={s.section}>Reto {year}</Text>
        <Text style={{ color: done ? colors.salvia : colors.ambar, fontSize: 13, fontFamily: fonts.sansBold, fontVariant: ["tabular-nums"] }}>
          {goal.current} / {goal.target} libros
        </Text>
      </View>
      <View style={s.goalTrack}>
        <View style={[s.goalFill, { width: `${goal.pct}%`, backgroundColor: done ? colors.salvia : colors.ambar }]} />
      </View>
      <Text style={{ color: colors.mut, fontSize: 11.5 }}>
        {done
          ? "¡Reto conseguido! 🎉 Toca para ampliarlo."
          : `Te ${goal.target - goal.current === 1 ? "queda 1 libro" : `quedan ${goal.target - goal.current} libros`} · ${goal.pct}%`}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tinta },
  h1: { color: colors.papel, fontSize: 26, fontFamily: fonts.serif, marginTop: 2 },
  goalCard: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  goalTrack: { height: 8, borderRadius: 99, backgroundColor: colors.tinta3, overflow: "hidden" },
  goalFill: { height: 8, borderRadius: 99, backgroundColor: colors.ambar },
  goalInput: {
    flex: 1,
    backgroundColor: colors.tinta,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.papel,
    fontSize: 15,
  },
  goalBtn: { backgroundColor: colors.ambar, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  bell: { padding: 4 },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: colors.arcilla,
    borderRadius: 99,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  section: { color: colors.marfil, fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 0.4 },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,.35)",
    borderRadius: 12,
    padding: 12,
  },
  emptyCard: {
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 14,
    padding: 18,
  },
  readingCard: { gap: 6 },
  readingCover: {
    width: 96,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
  },
  gapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.tinta2,
    borderWidth: 1,
    borderColor: colors.tinta3,
    borderRadius: 12,
    padding: 12,
  },
  cta: {
    backgroundColor: colors.ambar,
    borderRadius: 99,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 4,
  },
});
