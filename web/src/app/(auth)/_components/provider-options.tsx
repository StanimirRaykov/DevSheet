import { PUBLIC_API } from "@/lib/api";
import { getSignInProviders } from "@/lib/auth-providers";
import { ProviderButton } from "../login/_components/provider-button";
import { OrDivider } from "./auth-card";

/** The provider buttons set up on the API, then "or". Nothing when there are none or the API is down. */
export async function ProviderOptions({ next }: { next: string }) {
  const providers = (await getSignInProviders()) ?? [];
  if (providers.length === 0) return null;
  return (
    <>
      <div className="flex flex-col gap-3">
        {providers.map((p) => (
          <ProviderButton key={p} provider={p} href={`${PUBLIC_API}/auth/${p}?next=${encodeURIComponent(next)}`} />
        ))}
      </div>
      <OrDivider />
    </>
  );
}
