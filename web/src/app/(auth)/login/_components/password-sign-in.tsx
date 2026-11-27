"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { answerMessage, postAuth, rememberPendingEmail, type AuthAnswer } from "@/lib/account";
import { Notice, textLink } from "../../_components/auth-card";
import { PasswordInput } from "@/components/password-input";

/** Email and password sign-in. After it works, a full page load opens `next` (or /welcome before onboarding). */
export function PasswordSignIn({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AuthAnswer | null>(null);
  const [resending, setResending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const answer = await postAuth("/auth/sign-in", { email, password, next });
    if (answer.status === 200) {
      window.location.assign(answer.next ?? next);
      return; // keep the button busy while the next page loads
    }
    setBusy(false);
    setProblem(answer);
  }

  async function resend() {
    setResending(true);
    const answer = await postAuth("/auth/resend-confirmation", { email });
    setResending(false);
    if (answer.status === 202) {
      rememberPendingEmail(email);
      router.push("/check-email");
    } else {
      setProblem(answer);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {problem && (
        <Notice>
          <p>{answerMessage(problem)}</p>
          {problem.error === "email_not_confirmed" && (
            <Button variant="secondary" size="sm" className="mt-2" loading={resending} onClick={resend}>
              Send a new link
            </Button>
          )}
        </Notice>
      )}
      <Field label="Email">
        <Input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <Field label="Password">
          <PasswordInput name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Link href="/forgot-password" className={`self-end text-sm ${textLink}`}>Forgot password?</Link>
      </div>
      <Button type="submit" loading={busy} disabled={!email || !password}>Sign in</Button>
    </form>
  );
}
