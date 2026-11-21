import { SERVER_API } from "@/lib/api";

/** Sign-in providers the web app knows how to show, in display order. */
export const SIGN_IN_PROVIDERS = ["github", "google"] as const;
export type SignInProvider = (typeof SIGN_IN_PROVIDERS)[number];

/** Keeps the providers this app can show, in our order, from GET /auth/providers. */
export function knownProviders(fromApi: unknown): SignInProvider[] {
  const listed = Array.isArray(fromApi) ? fromApi : [];
  return SIGN_IN_PROVIDERS.filter((p) => listed.includes(p));
}

/**
 * The providers set up on the API (a provider without credentials is left out, so its button would not work).
 * Null when the API cannot be reached.
 */
export async function getSignInProviders(): Promise<SignInProvider[] | null> {
  try {
    const res = await fetch(`${SERVER_API}/auth/providers`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { providers?: unknown };
    return knownProviders(body.providers);
  } catch {
    return null;
  }
}
