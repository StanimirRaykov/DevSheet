import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { parseProfileTab } from "./_components/profile-tab-names";
import { ProfileView } from "./_components/profile-view";

export const metadata: Metadata = { title: "Profile" };

async function Profile({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  return <ProfileView initialTab={parseProfileTab(tab)} />;
}

export default function Page({ searchParams }: PageProps<"/dashboard/profile">) {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <Profile searchParams={searchParams} />
    </Suspense>
  );
}
