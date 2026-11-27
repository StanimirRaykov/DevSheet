"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { answerMessage, pendingEmail, postAuth, rememberPendingEmail, type AuthAnswer } from "@/lib/account";
import { Notice } from "../../_components/auth-card";

/** Shows where the link went (when this tab knows) and sends a fresh one. */
export function ResendLink() {
  const [email, setEmail] = useState("");
  const [known, setKnown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState<AuthAnswer | null>(null);

  useEffect(() => {
    const saved = pendingEmail();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage exists only in the browser
    if (saved) { setEmail(saved); setKnown(true); }
  }, []);

  async function resend(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSent(false);
    setProblem(null);
    const answer = await postAuth("/auth/resend-confirmation", { email });
    setBusy(false);
    if (answer.status === 202) {
      rememberPendingEmail(email);
      setKnown(true);
      setSent(true);
    } else {
      setProblem(answer);
    }
  }

  return (
    <form onSubmit={resend} className="flex flex-col gap-4" noValidate>
      {known ? (
        <p className="text-ink">
          We sent it to <strong className="font-semibold break-all">{email}</strong>.
        </p>
      ) : (
        <Field label="Email">
          <Input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      )}
      {sent && <Notice tone="success">A new link is on its way. Only the newest link works.</Notice>}
      {problem && <Notice>{answerMessage(problem)}</Notice>}
      <Button type="submit" variant="secondary" loading={busy} disabled={!email}>Send a new link</Button>
    </form>
  );
}
