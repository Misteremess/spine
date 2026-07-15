import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SettingsProvider, useSettings, useThemeColors } from "../lib/settings";
import { fonts } from "../lib/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SettingsProvider>
      <RootNav />
    </SettingsProvider>
  );
}

function RootNav() {
  const { ready, theme } = useSettings();
  const colors = useThemeColors();
  const [loaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded && ready) void SplashScreen.hideAsync();
  }, [loaded, ready]);

  if (!loaded || !ready) return null;

  return (
    <>
      <StatusBar style={theme === "papel" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.tinta },
          headerTintColor: colors.papel,
          headerTitleStyle: { fontFamily: fonts.serif, fontSize: 19, color: colors.papel },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerBackTitle: "",
          contentStyle: { backgroundColor: colors.tinta },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="landing" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="scanner" options={{ title: "Escáner", presentation: "fullScreenModal" }} />
        <Stack.Screen name="notifications" options={{ title: "Avisos" }} />
        <Stack.Screen name="clubs" options={{ title: "Clubs de lectura" }} />
        <Stack.Screen name="settings" options={{ title: "Ajustes" }} />
      </Stack>
    </>
  );
}
