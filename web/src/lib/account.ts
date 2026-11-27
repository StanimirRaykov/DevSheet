import { PUBLIC_API } from "@/lib/api";
import { mapFieldErrors, type MappedErrors } from "@/lib/field-errors";

/**
 * Email and password accounts: the calls to the API's /auth endpoints and plain-word messages for every answer.
 * The codes come from PasswordAuthController and AuthRateLimits in the API.
 */

export interface AuthAnswer {
  status: number;
  /** The `error` code of a refusal, if the API sent one. */
  error: string | null;
  /** Field errors of a 400 { errors }, mapped to the form's fields. */
  fields: MappedErrors | null;
  /** Where to go after a successful sign-in (always a local path). */
  next: string | null;
  /** Seconds from Retry-After on a 429. */
  retryAfter: number | null;
}

/** Posts JSON with the login cookie. A network failure is status 0, shown as "can't reach DevSheet". */
export async function postAuth(path: string, body: unknown, fields: readonly string[] = []): Promise<AuthAnswer> {
  let r: Response;
  try {
    r = await fetch(`${PUBLIC_API}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { status: 0, error: "network", fields: null, next: null, retryAfter: null };
  }
  let json: unknown = null;
  try { json = await r.json(); } catch { /* 202 and 204 have no body */ }
  const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const retry = Number(r.headers.get("Retry-After"));
  return {
    status: r.status,
    error: typeof obj.error === "string" ? obj.error : null,
    fields: r.status === 400 && "errors" in obj ? mapFieldErrors(json, fields) : null,
    next: typeof obj.next === "string" && obj.next.startsWith("/") && !obj.next.startsWith("//") ? obj.next : null,
    retryAfter: Number.isFinite(retry) && retry > 0 ? retry : null,
  };
}

/** "Try again in 3 minutes." from a Retry-After in seconds. */
export function waitText(seconds: number | null): string {
  if (!seconds) return "Try again in a few minutes.";
  if (seconds < 60) return `Try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`;
  const minutes = Math.ceil(seconds / 60);
  return `Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}

/** The message for a failed answer that has no field errors. */
export function answerMessage(answer: AuthAnswer): string {
  switch (answer.error) {
    case "network":
      return "DevSheet can't reach its server right now. Check your connection and try again.";
    case "invalid_credentials":
      return "That email and password don't match an account. Check both, or reset your password.";
    case "email_not_confirmed":
      return "Confirm your email first. Open the link we sent you, or send a new one.";
    case "too_many_attempts":
      return `Too many attempts. ${waitText(answer.retryAfter)}`;
    case "email_unavailable":
      return "DevSheet couldn't send the email right now. Nothing was saved. Try again in a minute.";
    case "invalid_link":
      return "This link doesn't work any more. It was already used, or a newer email replaced it.";
    case "expired_link":
      return "This link has expired. Ask for a new one below.";
    default:
      return answer.status === 429 ? `Too many attempts. ${waitText(answer.retryAfter)}` : "Something went wrong. Try again.";
  }
}

/** The email typed on sign-up, kept for this tab only so /check-email can offer to resend without putting it in the URL. */
const PENDING_EMAIL_KEY = "devsheet.pending-email";

export function rememberPendingEmail(email: string) {
  try { sessionStorage.setItem(PENDING_EMAIL_KEY, email); } catch { /* private mode: the page asks for it */ }
}

export function pendingEmail(): string {
  try { return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? ""; } catch { return ""; }
}

/** Removes ?token= from the address bar once the page has read it, so it is not left in history or shared by copy-paste. */
export function hideTokenFromAddressBar() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("token")) return;
    url.searchParams.delete("token");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch { /* nothing to hide */ }
}
