import type { Metadata } from "next";
import Link from "next/link";
import { DRAFT_NOTE, ProsePage } from "../_components/prose-page";
import { REPO_URL } from "../_components/site-links";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using DevSheet, a free university project.",
};

export default function TermsPage() {
  return (
    <ProsePage title="Terms of use" lead="The short version: it is free, it is a student project, and your content stays yours." note={DRAFT_NOTE}>
      <h2>The service</h2>
      <p>
        DevSheet is a final-year university project offered free of charge. It may change, be unavailable at times, or
        stop. There is no guarantee that it works without errors, and you should keep your own copy of anything important,
        such as your CV.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You sign in with an account you own on a provider such as GitHub, and you are responsible for it.</li>
        <li>One person, one account. Do not sign in as someone else or create pages that pretend to be someone else.</li>
        <li>You can stop using DevSheet and delete your account at any time.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        What you enter and what is synced from your repositories stays yours. By publishing your page you allow DevSheet
        to show it to visitors. Unpublishing or deleting your account stops that.
      </p>
      <p>Do not publish content that is unlawful, that you have no right to share, or that contains other people&apos;s personal data without their consent.</p>

      <h2>Public page addresses</h2>
      <p>
        Your page address is chosen when you sign up. Some words are reserved for the site itself. An address that
        impersonates someone or misleads visitors may be changed or removed.
      </p>

      <h2>Privacy</h2>
      <p>
        How your data is handled is described in the <Link href="/privacy">privacy notice</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Open an issue in the <a href={REPO_URL}>DevSheet repository</a>.
      </p>
    </ProsePage>
  );
}
