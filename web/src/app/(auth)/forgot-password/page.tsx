import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, textLink } from "../_components/auth-card";
import { ForgotForm } from "./_components/forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" intro="Enter the email you sign in with. We'll send a link to choose a new password.">
      <ForgotForm />
      <p className="text-sm text-graphite">
        Remembered it? <Link href="/login" className={textLink}>Sign in</Link>
      </p>
    </AuthCard>
  );
}
