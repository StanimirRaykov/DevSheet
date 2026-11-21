import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClasses, Sheet, Skeleton } from "@/components/ui";
import { PUBLIC_API } from "@/lib/api";
import { authErrorMessage } from "@/lib/auth-errors";
import { safeNext } from "@/lib/redirect";
import { getMe } from "@/lib/session";
import { GithubMark } from "@/components/github-mark";

export const metadata: Metadata = { title: "Sign in" };

async function SignInOptions({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  const params = await searchParams;
  const next = safeNext(Array.isArray(params.next) ? params.next[0] : params.next);
  const error = authErrorMessage(params.error);
  // Already signed in: skip the page.
  if (await getMe()) redirect(next);

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink">{error}</p>
      )}
      <a href={`${PUBLIC_API}/auth/github?next=${encodeURIComponent(next)}`} className={buttonClasses("primary", "md", "w-full")}>
        <GithubMark />
        Continue with GitHub
      </a>
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Sheet className="flex w-full max-w-sm flex-col gap-6 px-6 py-8 sm:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-title font-semibold text-ink">Sign in</h1>
        <p className="text-graphite">Use your GitHub account. New here? Signing in creates your DevSheet.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <SignInOptions searchParams={searchParams} />
      </Suspense>
      <p className="text-sm text-graphite">
        DevSheet reads your public GitHub profile and repositories only. See the{" "}
        <Link href="/privacy" className="text-ink underline underline-offset-2 hover:text-accent">privacy notice</Link>.
      </p>
    </Sheet>
  );
}
