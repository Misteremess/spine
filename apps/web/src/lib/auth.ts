import { createAuthClient } from "better-auth/react";
import { API_URL } from "./api";

export const authClient = createAuthClient({
  baseURL: `${API_URL}/api/auth`,
  // La API vive en otro origen: sin esto la cookie de sesión no viaja.
  fetchOptions: { credentials: "include" },
});
