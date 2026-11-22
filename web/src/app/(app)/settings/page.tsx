import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, Skeleton } from "@/components/ui";
import { authErrorMessage } from "@/lib/auth-errors";
import { AccountTab } from "./_components/account-tab";
import { parseSettingsTab } from "./_components/settings-tab-names";
import { SettingsTabs } from "./_components/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

type SettingsSearchParams = Promise<{ tab?: string | string[]; error?: string | string[] }>;

async function Settings({ searchParams }: { searchParams: SettingsSearchParams }) {
  const params = await searchParams;
  // Linking a sign-in method or connecting GitHub comes back here; a problem arrives as ?error=.
  const error = authErrorMessage(params.error);
  const later = (what: string) => <EmptyState title="Coming in the next step" description={what} />;

  return (
    <>
      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink">{error}</p>
      )}
      <SettingsTabs
        initialTab={parseSettingsTab(params.tab)}
        panels={{
          account: <AccountTab />,
          "sign-in": later("Sign-in methods and the GitHub connection."),
          "public-page": later("Your address, publishing and what the page shows."),
          delete: later("Deleting your account."),
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
