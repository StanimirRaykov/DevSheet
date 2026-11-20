import Link from "next/link";
import { buttonClasses, type ButtonSize } from "@/components/ui";
import { getMe } from "@/lib/session";

/**
 * The main call to action: "Get started" for visitors, "Go to dashboard" once signed in.
 * Reads the session, so render it inside <Suspense> with <StartLink> as the fallback.
 */
export async function AuthCta({ size = "md" }: { size?: ButtonSize }) {
  let signedIn = false;
  try {
    signedIn = (await getMe()) !== null;
  } catch {
    // The API is unreachable: the landing page still works, as for a visitor.
  }
  return signedIn ? (
    <Link href="/dashboard" className={buttonClasses("primary", size)}>Go to dashboard</Link>
  ) : (
    <StartLink size={size} />
  );
}

/** The visitor's version, also shown while the session is being checked. */
export function StartLink({ size = "md" }: { size?: ButtonSize }) {
  return <Link href="/login" className={buttonClasses("primary", size)}>Get started</Link>;
}

/** "Sign in" next to the main button, only for visitors. */
export async function SignInLink() {
  try {
    if (await getMe()) return null;
  } catch {}
  return <Link href="/login" className="text-sm font-medium text-graphite hover:text-ink">Sign in</Link>;
}
