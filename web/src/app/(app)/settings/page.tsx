import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { authErrorMessage } from "@/lib/auth-errors";
import { AccountTab } from "./_components/account-tab";
import { parseSettingsTab } from "./_components/settings-tab-names";
import { SignInTab } from "./_components/sign-in-tab";
import { PublicPageTab } from "./_components/public-page-tab";
import { DeleteTab } from "./_components/delete-tab";
import { SettingsTabs } from "./_components/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

type SettingsSearchParams = Promise<{ tab?: string | string[]; error?: string | string[] }>;

async function Settings({ searchParams }: { searchParams: SettingsSearchParams }) {
  const params = await searchParams;
  // Linking a sign-in method or connecting GitHub comes back here; a problem arrives as ?error=.
  const error = authErrorMessage(params.error);

  return (
    <>
      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink">{error}</p>
      )}
      <SettingsTabs
        initialTab={parseSettingsTab(params.tab)}
        panels={{
          account: <AccountTab />,
          "sign-in": <SignInTab />,
          "public-page": <PublicPageTab />,
          delete: <DeleteTab />,
        }}
      />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-title font-semibold text-ink">Settings</h1>
      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <Settings searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
