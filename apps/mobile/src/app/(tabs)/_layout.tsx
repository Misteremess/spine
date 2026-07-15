/**
 * Barra de pestañas del prototipo: Inicio · Biblioteca · [＋ escanear] ·
 * Deseos · Perfil. El botón central no es una pestaña: abre el escáner.
 */
import { Redirect, router, Tabs } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authClient } from "../../lib/auth";
import { useThemeColors, useThemedStyles } from "../../lib/settings";
import { fonts, type Palette } from "../../lib/theme";
import { Text } from "../../lib/ui";

const TABS = [
  { name: "index", label: "Inicio", glyph: "⌂" },
  { name: "library", label: "Biblioteca", glyph: "▦" },
  { name: "scan", label: "", glyph: "＋" },
  { name: "wishlist", label: "Deseos", glyph: "♡" },
  { name: "profile", label: "Perfil", glyph: "◉" },
] as const;

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const route = state.routes.find((r: any) => r.name === tab.name);
        if (!route) return null;
        const focused = state.routes[state.index]?.name === tab.name;

        if (tab.name === "scan") {
          return (
            <Pressable key={tab.name} style={s.slot} onPress={() => router.push("/scanner")}>
              <View style={s.fab}>
                <Text style={{ color: colors.inkOnAccent, fontSize: 24, lineHeight: 28 }}>＋</Text>
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={tab.name}
            style={s.slot}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <Text style={{ fontSize: 19, color: focused ? colors.ambar : colors.mut }}>{tab.glyph}</Text>
            <Text
              style={{
                fontSize: 9.5,
                fontFamily: focused ? fonts.sansSemi : fonts.sans,
                color: focused ? colors.ambar : colors.mut,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { data: session, isPending } = authClient.useSession();
  const colors = useThemeColors();
  if (isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.tinta }}>
        <ActivityIndicator color={colors.ambar} size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/landing" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.tinta } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="wishlist" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.tinta2,
    borderTopWidth: 1,
    borderTopColor: colors.tinta3,
    paddingTop: 8,
    paddingHorizontal: 10,
  },
  slot: { flex: 1, alignItems: "center", gap: 3 },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 99,
    backgroundColor: colors.ambar,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    shadowColor: colors.ambar,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
