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
import React, { useEffect } from "react";
import { SettingsProvider, useSettings } from "../lib/settings";
import { colors, fonts } from "../lib/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SettingsProvider>
      <RootNav />
    </SettingsProvider>
  );
}

function RootNav() {
  const { revision } = useSettings();
  const [loaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    // La `key` remonta el árbol al cambiar el tamaño de texto (ver settings.tsx).
    <React.Fragment key={revision}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.tinta },
          headerTintColor: colors.papel,
          headerTitleStyle: { fontFamily: fonts.serif, fontSize: 19 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerBackTitle: "",
          contentStyle: { backgroundColor: colors.tinta },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="scanner" options={{ title: "Escáner", presentation: "fullScreenModal" }} />
        <Stack.Screen name="notifications" options={{ title: "Avisos" }} />
        <Stack.Screen name="clubs" options={{ title: "Clubs de lectura" }} />
      </Stack>
    </React.Fragment>
  );
}
