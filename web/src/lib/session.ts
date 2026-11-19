import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Me, SERVER_API } from "@/lib/api";
import { loginHref } from "@/lib/redirect";
import { PATH_HEADER } from "@/proxy";

/**
 * The signed-in account, or null when the visitor is not logged in.
 * Runs on the server and forwards the browser's cookies to the API, so it sees the same login.
 */
export async function getMe(): Promise<Me | null> {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${SERVER_API}/api/me`, { headers: cookie ? { cookie } : {}, cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`GET /api/me failed with ${res.status}`);
  return (await res.json()) as Me;
}

/** Like getMe, but sends a logged-out visitor to the login page and back here afterwards. */
export async function requireMe(): Promise<Me> {
  const me = await getMe();
  if (!me) redirect(loginHref((await headers()).get(PATH_HEADER) ?? "/dashboard"));
  return me;
}
