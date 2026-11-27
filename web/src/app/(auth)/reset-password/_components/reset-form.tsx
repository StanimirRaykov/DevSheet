"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field } from "@/components/ui";
import { answerMessage, hideTokenFromAddressBar, postAuth, type AuthAnswer } from "@/lib/account";
import { Notice, textLink } from "../../_components/auth-card";
import { PasswordInput } from "@/components/password-input";

/** The new password. Saving signs in here and signs out every other device. */
export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AuthAnswer | null>(null);

  useEffect(hideTokenFromAddressBar, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const answer = await postAuth("/auth/reset-password", { token, password }, ["password"]);
    if (answer.status === 200) {
      window.location.assign(answer.next ?? "/dashboard");
      return;
    }
    setBusy(false);
    setProblem(answer);
  }

  if (!token || problem?.error === "invalid_link" || problem?.error === "expired_link") {
    return (
      <div className="flex flex-col gap-4">
        <Notice>{problem ? answerMessage(problem) : "This link is missing its code. Open it again from the email."}</Notice>
        <Link href="/forgot-password" className={textLink}>Send a new reset link</Link>
      </div>
    );
  }

  const fieldError = problem?.fields?.fields.password;
  const formError = problem && !fieldError && (problem.fields?.form ?? answerMessage(problem));
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {formError && <Notice>{formError}</Notice>}
      <Field label="New password" hint="At least 10 characters." error={fieldError}>
        <PasswordInput name="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" loading={busy} disabled={!password}>Save new password</Button>
    </form>
  );
}
