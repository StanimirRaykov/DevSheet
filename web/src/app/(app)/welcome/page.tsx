import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { authErrorMessage } from "@/lib/auth-errors";
import { WelcomeFlow } from "./_components/welcome-flow";

export const metadata: Metadata = { title: "Welcome" };

type WelcomeSearchParams = Promise<{ error?: string | string[] }>;

// Connecting GitHub comes back here; a problem arrives as ?error= and is shown on the connect step.
async function Welcome({ searchParams }: { searchParams: WelcomeSearchParams }) {
  const { error } = await searchParams;
  return <WelcomeFlow error={authErrorMessage(error)} />;
}

export default function Page({ searchParams }: PageProps<"/welcome">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <Welcome searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
