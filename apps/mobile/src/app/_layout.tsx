import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.tinta },
          headerTintColor: colors.papel,
          headerTitleStyle: { fontFamily: "Georgia", fontSize: 19 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.tinta },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="library" options={{ title: "Biblioteca", headerBackVisible: false }} />
        <Stack.Screen name="scanner" options={{ title: "Escáner", presentation: "fullScreenModal" }} />
      </Stack>
    </>
  );
}
