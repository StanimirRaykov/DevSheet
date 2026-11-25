import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, textLink } from "../_components/auth-card";
import { ResendLink } from "./_components/resend-link";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <AuthCard
      title="Check your email"
      intro="Open the link we emailed you to confirm your address and finish creating your account. It works for 24 hours."
    >
      <ResendLink />
      <div className="flex flex-col gap-2 text-sm text-graphite">
        <p>Nothing there? Look in spam, or check the address for typos.</p>
        <p>
          Wrong address? <Link href="/signup" className={textLink}>Sign up again</Link>
        </p>
      </div>
    </AuthCard>
  );
}
