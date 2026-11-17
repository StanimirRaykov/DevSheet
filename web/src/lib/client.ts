import { PUBLIC_API } from "@/lib/api";

export type FieldErrors = Record<string, string[]>;

export interface SendResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  errors: FieldErrors;
}

/** Calls the API with the login cookie. The API answers validation problems as { errors: { field: [messages] } }. */
export async function send<T = unknown>(path: string, method = "GET", body?: unknown): Promise<SendResult<T>> {
  const r = await fetch(`${PUBLIC_API}${path}`, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: unknown = null;
  try { json = await r.json(); } catch { /* 204 or empty body */ }
  const errors = !r.ok && json && typeof json === "object" && "errors" in json ? ((json as { errors: FieldErrors }).errors ?? {}) : {};
  return { ok: r.ok, status: r.status, data: r.ok ? (json as T) : null, errors };
}
