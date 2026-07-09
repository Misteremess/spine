import { expoClient } from "@better-auth/expo/client";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createAuthClient } from "better-auth/react";

function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri.split(":")[0]}:3123`;
  return "http://localhost:3123";
}

export const authClient = createAuthClient({
  baseURL: resolveApiUrl(),
  plugins: [
    expoClient({
      scheme: "spine",
      storagePrefix: "spine",
      storage: SecureStore,
    }),
  ],
});
