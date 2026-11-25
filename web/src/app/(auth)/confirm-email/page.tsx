import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { AuthCard } from "../_components/auth-card";
import { ConfirmButton } from "./_components/confirm-button";

// The token is in the URL: never send it to another site as a referrer.
export const metadata: Metadata = { title: "Confirm your email", referrer: "no-referrer", robots: { index: false } };

async function WithToken({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <ConfirmButton token={typeof token === "string" ? token : ""} />;
}

export default function ConfirmEmailPage({ searchParams }: PageProps<"/confirm-email">) {
  return (
    <AuthCard title="Confirm your email" intro="One click and your account is ready. You will be signed in.">
      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <WithToken searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
