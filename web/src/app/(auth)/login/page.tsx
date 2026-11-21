import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Sheet, Skeleton } from "@/components/ui";
import { PUBLIC_API } from "@/lib/api";
import { authErrorMessage } from "@/lib/auth-errors";
import { getSignInProviders } from "@/lib/auth-providers";
import { safeNext } from "@/lib/redirect";
import { getMe } from "@/lib/session";
import { ProviderButton } from "./_components/provider-button";

export const metadata: Metadata = { title: "Sign in" };

type LoginSearchParams = Promise<{ next?: string | string[]; error?: string | string[] }>;

async function SignInOptions({ searchParams }: { searchParams: LoginSearchParams }) {
  const params = await searchParams;
  const next = safeNext(Array.isArray(params.next) ? params.next[0] : params.next);
  const error = authErrorMessage(params.error);

  let signedIn = false;
  try {
    signedIn = (await getMe()) !== null;
  } catch {
    // The API is down: the provider list below says so.
  }
  // Already signed in: skip the page.
  if (signedIn) redirect(next);

  const providers = await getSignInProviders();

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="mb-1 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink">{error}</p>
      )}
      {providers === null ? (
        <p role="alert" className="text-sm text-graphite">
          DevSheet can&apos;t reach its server right now. Try again in a minute.
        </p>
      ) : providers.length === 0 ? (
        <p className="text-sm text-graphite">Sign-in isn&apos;t set up on this server yet.</p>
      ) : (
        providers.map((p) => (
          <ProviderButton key={p} provider={p} href={`${PUBLIC_API}/auth/${p}?next=${encodeURIComponent(next)}`} />
        ))
      )}
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Sheet className="flex w-full max-w-sm flex-col gap-6 px-6 py-8 sm:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-title font-semibold text-ink">Sign in to DevSheet</h1>
        <p className="text-graphite">New here? Signing in creates your DevSheet.</p>
      </div>
      <Suspense fallback={<OptionsSkeleton />}>
        <SignInOptions searchParams={searchParams} />
      </Suspense>
      <p className="text-sm text-graphite">
        By continuing you agree to the{" "}
        <Link href="/terms" className="text-ink underline underline-offset-2 hover:text-accent">terms</Link>
        {" "}and the{" "}
        <Link href="/privacy" className="text-ink underline underline-offset-2 hover:text-accent">privacy notice</Link>.
        DevSheet only reads your public profile.
      </p>
    </Sheet>
  );
}

function OptionsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
