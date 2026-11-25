"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { answerMessage, postAuth, type AuthAnswer } from "@/lib/account";
import { Notice } from "../../_components/auth-card";

/** Asks for a reset link. The answer is the same whether or not the email has an account. */
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [problem, setProblem] = useState<AuthAnswer | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const answer = await postAuth("/auth/forgot-password", { email });
    setBusy(false);
    if (answer.status === 202) setSentTo(email.trim());
    else setProblem(answer);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {sentTo && (
        <Notice tone="success">
          If <strong className="font-semibold break-all">{sentTo}</strong> has a DevSheet password, a reset link is on its
          way. It works for 1 hour.
        </Notice>
      )}
      {problem && <Notice>{answerMessage(problem)}</Notice>}
      <Field label="Email">
        <Input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" loading={busy} disabled={!email}>{sentTo ? "Send again" : "Send reset link"}</Button>
    </form>
  );
}
