import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { safeNext } from "@/lib/redirect";
import { AuthCard, textLink } from "../_components/auth-card";
import { ProviderOptions } from "../_components/provider-options";
import { redirectIfSignedIn } from "../_components/redirect-if-signed-in";
import { SignUpForm } from "./_components/sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

async function SignUpOptions({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const next = safeNext(Array.isArray(params.next) ? params.next[0] : params.next);
  await redirectIfSignedIn(next);
  return (
    <div className="flex flex-col gap-5">
      <ProviderOptions next={next} />
      <SignUpForm />
    </div>
  );
}

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <AuthCard title="Create your DevSheet" intro="One account for your CV, your projects and your public page.">
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <SignUpOptions searchParams={searchParams} />
      </Suspense>
      <div className="flex flex-col gap-3 text-sm text-graphite">
        <p>
          Already have an account? <Link href="/login" className={textLink}>Sign in</Link>
        </p>
        <p>
          By creating an account you agree to the <Link href="/terms" className={textLink}>terms</Link> and the{" "}
          <Link href="/privacy" className={textLink}>privacy notice</Link>.
        </p>
      </div>
    </AuthCard>
  );
}
