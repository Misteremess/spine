import Constants from "expo-constants";
import { authClient } from "./auth";

/**
 * URL de la API. En desarrollo con Expo Go se deduce sola la IP del Mac
 * (hostUri del bundler); EXPO_PUBLIC_API_URL la sobreescribe si hace falta.
 */
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return `http://${hostUri.split(":")[0]}:3123`;
  return "http://localhost:3123";
}

export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(typeof body.message === "string" ? body.message : `HTTP ${status}`);
  }
}

export async function api<T = Record<string, unknown>>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown }
): Promise<T> {
  const cookie = authClient.getCookie();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (res.status === 204) return {} as T;
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
