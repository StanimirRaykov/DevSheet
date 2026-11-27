"use client";

import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/password-input";
import { Button, Field, Input, useToast } from "@/components/ui";
import { answerMessage, postAuth, type AuthAnswer } from "@/lib/account";
import { formatTimeAgo } from "@/lib/dates";
import { SettingsSection } from "./settings-section";
import { useUnsavedChanges } from "./unsaved-changes";

/** GET /api/me/password. Without a password, email is the account email (a suggestion for adding one). */
export interface PasswordStatus {
  hasPassword: boolean;
  email: string | null;
  emailConfirmed: boolean;
  changedAt: string | null;
}

const FIELDS = ["currentPassword", "newPassword", "email"] as const;


/**
 * Change the password (current + new), or add one to an account that signs in with Google.
 * An added password works only after its confirm link is opened, so until then it does not count as a way in.
 */
export function PasswordSection({ status, onChange }: { status: PasswordStatus; onChange: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [email, setEmail] = useState(status.hasPassword ? "" : (status.email ?? ""));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AuthAnswer | null>(null);

  const adding = !status.hasPassword;
  useUnsavedChanges("password", current !== "" || next !== "");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const body = adding ? { newPassword: next, email: email.trim() || null } : { currentPassword: current, newPassword: next };
    const answer = await postAuth("/api/me/password", body, FIELDS);
    setBusy(false);
    if (answer.status === 204) {
      setCurrent("");
      setNext("");
      toast({ title: "Password changed", description: "Other devices were signed out. This one stays signed in.", tone: "success" });
      onChange();
    } else if (answer.status === 202) {
      setNext("");
      toast({ title: "Confirm link sent", description: `Open the link we sent to ${email.trim()}. Your password works after that.`, tone: "success" });
      onChange();
    } else {
      setProblem(answer);
    }
  }

  const fields = problem?.fields?.fields ?? {};
  const formError = problem && Object.keys(fields).length === 0 && (problem.fields?.form ?? answerMessage(problem));

  return (
    <SettingsSection
      title="Password"
      description={adding
        ? "Add a password to sign in with your email as well as with Google."
        : "Signs you in with your email. Changing it signs you out on your other devices."}
    >
      <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-4">
        {status.hasPassword && (
          <p className="text-sm text-graphite">
            Signs in as <strong className="font-medium break-all text-ink">{status.email}</strong>
            {status.emailConfirmed
              ? status.changedAt ? `. Changed ${formatTimeAgo(status.changedAt)}.` : "."
              : ". Waiting for you to open the confirm link we emailed. Until then this password does not sign you in."}
          </p>
        )}
        {formError && <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-ink">{formError}</div>}

        {/* Lets password managers save the new password against the right account. */}
        <input type="text" name="username" autoComplete="username" value={status.email ?? email} readOnly hidden />

        {adding ? (
          <Field label="Email" hint="The email you will sign in with. We send it a link to confirm it is yours." error={fields.email}>
            <Input type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        ) : (
          <Field label="Current password" error={fields.currentPassword}>
            <PasswordInput name="current-password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
        )}
        <Field label="New password" hint="At least 10 characters." error={fields.newPassword}>
          <PasswordInput name="new-password" autoComplete="new-password" maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <div>
          <Button type="submit" loading={busy} disabled={!next || (!adding && !current)}>
            {adding ? "Add password" : "Change password"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
