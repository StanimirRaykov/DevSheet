import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { AuthCard } from "../_components/auth-card";
import { ResetForm } from "./_components/reset-form";

// The token is in the URL: never send it to another site as a referrer.
export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer", robots: { index: false } };

async function WithToken({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <ResetForm token={typeof token === "string" ? token : ""} />;
}

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <AuthCard title="Choose a new password" intro="You will be signed in here and signed out on every other device.">
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <WithToken searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
