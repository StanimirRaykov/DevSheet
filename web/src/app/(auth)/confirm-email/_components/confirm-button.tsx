"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { answerMessage, hideTokenFromAddressBar, postAuth, type AuthAnswer } from "@/lib/account";
import { Notice, textLink } from "../../_components/auth-card";

/**
 * Confirms on a click rather than on page load: mail scanners open links to check them, and must not use up the
 * one-time link before the person does. Confirming also signs in.
 */
export function ConfirmButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AuthAnswer | null>(null);

  useEffect(hideTokenFromAddressBar, []);

  async function confirm() {
    setBusy(true);
    const answer = await postAuth("/auth/confirm-email", { token });
    if (answer.status === 200) {
      window.location.assign(answer.next ?? "/welcome");
      return;
    }
    setBusy(false);
    setProblem(answer);
  }

  if (!token) return <BadLink />;
  if (problem?.error === "invalid_link" || problem?.error === "expired_link") return <BadLink problem={problem} />;
  return (
    <div className="flex flex-col gap-4">
      {problem && <Notice>{answerMessage(problem)}</Notice>}
      <Button onClick={confirm} loading={busy}>Confirm email</Button>
    </div>
  );
}

function BadLink({ problem }: { problem?: AuthAnswer }) {
  return (
    <div className="flex flex-col gap-4">
      <Notice>{problem ? answerMessage(problem) : "This link is missing its code. Open it again from the email."}</Notice>
      <p className="text-sm text-graphite">
        Already confirmed? <Link href="/login" className={textLink}>Sign in</Link>. Otherwise{" "}
        <Link href="/check-email" className={textLink}>send a new link</Link>.
      </p>
    </div>
  );
}
