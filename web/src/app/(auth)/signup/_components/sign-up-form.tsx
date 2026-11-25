"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { answerMessage, postAuth, rememberPendingEmail, type AuthAnswer } from "@/lib/account";
import { Notice } from "../../_components/auth-card";
import { PasswordInput } from "../../_components/password-input";

const FIELDS = ["name", "email", "password"] as const;

/**
 * Name, email and password. The API answers the same whether or not the email already has an account (the inbox
 * tells the owner), so the next page is always "check your email".
 */
export function SignUpForm() {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AuthAnswer | null>(null);
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    const answer = await postAuth("/auth/register", values, FIELDS);
    if (answer.status === 202) {
      rememberPendingEmail(values.email.trim());
      router.push("/check-email");
      return;
    }
    setBusy(false);
    setProblem(answer);
  }

  const fieldError = (f: (typeof FIELDS)[number]) => problem?.fields?.fields[f];
  const formError = problem && (problem.fields ? problem.fields.form : answerMessage(problem));

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {formError && <Notice>{formError}</Notice>}
      <Field label="Your name" hint="As it should appear on your CV." error={fieldError("name")}>
        <Input name="name" autoComplete="name" required maxLength={100} value={values.name} onChange={set("name")} />
      </Field>
      <Field label="Email" error={fieldError("email")}>
        <Input type="email" name="email" autoComplete="email" required value={values.email} onChange={set("email")} />
      </Field>
      <Field label="Password" hint="At least 10 characters. A few words you will remember work well." error={fieldError("password")}>
        <PasswordInput name="password" autoComplete="new-password" required minLength={10} maxLength={128} value={values.password} onChange={set("password")} />
      </Field>
      <Button type="submit" loading={busy}>Create account</Button>
    </form>
  );
}
