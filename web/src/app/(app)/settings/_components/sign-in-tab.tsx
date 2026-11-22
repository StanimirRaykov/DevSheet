"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { GithubMark } from "@/components/github-mark";
import { GoogleMark } from "@/components/google-mark";
import { useMe } from "@/components/me-provider";
import { Avatar, Badge, Button, Dialog, buttonClasses, useToast } from "@/components/ui";
import { PUBLIC_API } from "@/lib/api";
import { knownProviders, SIGN_IN_PROVIDERS, type SignInProvider } from "@/lib/auth-providers";
import { send } from "@/lib/client";
import { formatTimeAgo } from "@/lib/dates";
import { SettingsLoadError, SettingsLoading, SettingsSection } from "./settings-section";

/** Where the OAuth round trips started here come back to. */
export const RETURN_HERE = "/settings?tab=sign-in";

const NAMES: Record<SignInProvider, string> = { github: "GitHub", google: "Google" };
const MARKS: Record<SignInProvider, ReactNode> = {
  github: <GithubMark size={20} />,
  google: <GoogleMark size={20} />,
};

export interface Login {
  provider: string;
  email: string | null;
  createdAt: string;
}

export function SignInTab() {
  const [data, setData] = useState<{ logins: Login[]; enabled: SignInProvider[] } | null | "error">(null);

  const load = useCallback(async () => {
    const [logins, providers] = await Promise.all([
      send<Login[]>("/api/me/logins"),
      send<{ providers: unknown }>("/auth/providers"),
    ]);
    if (!logins.data || !providers.data) return setData("error");
    setData({ logins: logins.data, enabled: knownProviders(providers.data.providers) });
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads from the API once; state is set when it answers
  useEffect(() => { load(); }, [load]);

  if (data === null) return <SettingsLoading />;
  if (data === "error") return <SettingsLoadError />;
  return (
    <div>
      <SignInMethods logins={data.logins} enabled={data.enabled} onChange={load} />
      <GithubConnection />
    </div>
  );
}

/**
 * One row per provider: linked ones with Remove (not for the last one), set-up ones with Add.
 * A provider that is linked but no longer set up on the server still shows, so it can be removed.
 */
export function SignInMethods({ logins, enabled, onChange }: { logins: Login[]; enabled: SignInProvider[]; onChange: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const linked = new Map(logins.map((l) => [l.provider, l]));
  const rows = SIGN_IN_PROVIDERS.filter((p) => linked.has(p) || enabled.includes(p));
  const onlyOne = logins.length <= 1;

  async function unlink(provider: SignInProvider) {
    setBusy(provider);
    const r = await send(`/api/me/logins/${provider}`, "DELETE");
    setBusy(null);
    if (r.ok) {
      toast({ title: `${NAMES[provider]} sign-in removed`, tone: "success" });
      onChange();
    } else {
      toast({ title: `${NAMES[provider]} sign-in was not removed`, description: "Try again in a moment.", tone: "danger" });
    }
  }

  return (
    <SettingsSection
      title="Sign-in methods"
      description="Any of these signs you in to this DevSheet. Keep at least one."
    >
      <ul className="flex max-w-xl flex-col divide-y divide-rule rounded-panel border border-rule bg-sheet">
        {rows.map((p) => {
          const login = linked.get(p);
          return (
            <li key={p} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="text-ink">{MARKS[p]}</span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-ink">{NAMES[p]}</span>
                <span className="truncate text-sm text-graphite">
                  {login
                    ? (login.email ? `${login.email} · added ` : "Added ") + formatTimeAgo(login.createdAt)
                    : "Not added"}
                </span>
              </div>
              {login ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={onlyOne}
                  loading={busy === p}
                  title={onlyOne ? "This is your only way to sign in. Add another one first." : undefined}
                  onClick={() => unlink(p)}
                >
                  Remove
                </Button>
              ) : (
                <a href={`${PUBLIC_API}/auth/link/${p}?next=${encodeURIComponent(RETURN_HERE)}`} className={buttonClasses("secondary", "sm")}>
                  Add {NAMES[p]}
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {onlyOne && <p className="mt-2 text-sm text-graphite">This is your only sign-in method, so it cannot be removed. Add another one first.</p>}
    </SettingsSection>
  );
}

/** The GitHub account repositories sync from: sync, disconnect, or connect one. Separate from signing in. */
export function GithubConnection() {
  const me = useMe();
  const router = useRouter();
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const github = me.github;

  async function sync() {
    setSyncing(true);
    const r = await send<{ added: number }>("/api/me/sync", "POST");
    setSyncing(false);
    if (r.data) {
      const added = r.data.added;
      toast({
        title: "GitHub synced",
        description: added === 0 ? "No new repositories." : `${added} new ${added === 1 ? "repository" : "repositories"} waiting for review.`,
        tone: "success",
      });
      router.refresh();
    } else {
      toast({ title: "GitHub sync failed", description: "GitHub did not answer. Try again in a moment.", tone: "danger" });
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    const r = await send("/api/me/github/disconnect", "POST");
    setDisconnecting(false);
    setConfirming(false);
    if (r.ok) {
      toast({ title: "GitHub disconnected", tone: "success" });
      router.refresh();
    } else {
      toast({ title: "GitHub was not disconnected", description: "Try again in a moment.", tone: "danger" });
    }
  }

  return (
    <SettingsSection
      title="GitHub repositories"
      description="The GitHub account your projects sync from. Connecting it does not change how you sign in."
    >
      {github ? (
        <div className="flex max-w-xl flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={github.login} src={`https://github.com/${encodeURIComponent(github.login)}.png?size=80`} size={40} />
            <div className="flex flex-col">
              <a
                href={`https://github.com/${encodeURIComponent(github.login)}`}
                className="font-medium text-ink underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                @{github.login}
              </a>
              <span className="text-sm text-graphite">
                {github.lastSyncedAt ? `Last synced ${formatTimeAgo(github.lastSyncedAt)}` : "Not synced yet"}
              </span>
            </div>
            <Badge tone="success" className="ml-auto">Connected</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={sync} loading={syncing}>{syncing ? "Syncing…" : "Sync now"}</Button>
            <Button variant="secondary" onClick={() => setConfirming(true)}>Disconnect GitHub</Button>
          </div>
        </div>
      ) : (
        <div className="flex max-w-xl flex-col items-start gap-3">
          <p className="text-sm text-graphite">
            No GitHub account is connected. Connect one to bring in your public repositories as projects.
          </p>
          <a href={`${PUBLIC_API}/auth/github/connect?next=${encodeURIComponent(RETURN_HERE)}`} className={buttonClasses("primary", "md")}>
            <GithubMark />
            Connect GitHub
          </a>
        </div>
      )}
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Disconnect GitHub?"
        description="Your projects stay on DevSheet and on your public page, but they stop updating from GitHub."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>Keep connected</Button>
            <Button variant="danger" loading={disconnecting} onClick={disconnect}>Disconnect GitHub</Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          DevSheet deletes its access token at once. To remove DevSheet from your GitHub account as well, open GitHub,
          then Settings, Applications, Authorized OAuth Apps. You can connect again at any time.
        </p>
      </Dialog>
    </SettingsSection>
  );
}
