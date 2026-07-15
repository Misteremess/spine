/** Cliente de la API de Spine. Cookies de sesión cross-origin (CORS). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3123";

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
  // Solo declaramos JSON cuando hay cuerpo: Fastify devuelve 400 si el
  // content-type es application/json pero el cuerpo va vacío (p. ej. DELETE).
  const hasBody = init?.body !== undefined;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    body: hasBody ? JSON.stringify(init.body) : undefined,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (res.status === 204) return {} as T;
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
