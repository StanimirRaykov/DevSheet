import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { authErrorMessage } from "@/lib/auth-errors";
import { safeNext } from "@/lib/redirect";
import { AuthCard, Notice, textLink } from "../_components/auth-card";
import { ProviderOptions } from "../_components/provider-options";
import { redirectIfSignedIn } from "../_components/redirect-if-signed-in";
import { PasswordSignIn } from "./_components/password-sign-in";

export const metadata: Metadata = { title: "Sign in" };

type LoginSearchParams = Promise<{ next?: string | string[]; error?: string | string[] }>;

async function SignInOptions({ searchParams }: { searchParams: LoginSearchParams }) {
  const params = await searchParams;
  const next = safeNext(Array.isArray(params.next) ? params.next[0] : params.next);
  const error = authErrorMessage(params.error);
  await redirectIfSignedIn(next);

  return (
    <div className="flex flex-col gap-5">
      {error && <Notice>{error}</Notice>}
      <ProviderOptions next={next} />
      <PasswordSignIn next={next} />
      <p className="text-sm text-graphite">
        New to DevSheet?{" "}
        <Link href={next === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`} className={textLink}>
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard title="Sign in to DevSheet">
      <Suspense fallback={<OptionsSkeleton />}>
        <SignInOptions searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

function OptionsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
