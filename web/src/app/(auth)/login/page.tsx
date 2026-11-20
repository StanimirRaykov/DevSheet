import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClasses, Sheet, Skeleton } from "@/components/ui";
import { PUBLIC_API } from "@/lib/api";
import { authErrorMessage } from "@/lib/auth-errors";
import { safeNext } from "@/lib/redirect";
import { getMe } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

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
