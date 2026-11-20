import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "../_components/prose-page";
import { REPO_URL } from "../_components/site-links";

export const metadata: Metadata = {
  title: "About",
  description: "What DevSheet is, why it exists, and how it is built.",
};

export default function AboutPage() {
  return (
    <ProsePage
      title="About DevSheet"
      lead="DevSheet turns the work a developer already has on GitHub into a public portfolio page and a CV, with the developer deciding what is shown."
    >
      <h2>Why it exists</h2>
      <p>
        A developer&apos;s best evidence is usually their code, but a CV lists skills as bare words. DevSheet links the two:
        each skill on your page points to the projects that use it, and your CV is built from the same data, so the two
        never drift apart.
      </p>

      <h2>How it treats your data</h2>
      <ul>
        <li>It reads public repositories only and cannot change anything on GitHub.</li>
        <li>New repositories arrive hidden. Nothing is public until you approve it and publish your page.</li>
        <li>Suggested skills are only suggestions. A skill appears on your page only after you confirm it.</li>
        <li>Your GitHub token is stored encrypted and never sent to the browser.</li>
      </ul>
      <p>
        The details are in the <Link href="/privacy">privacy notice</Link>.
      </p>

      <h2>Who builds it</h2>
      <p>
        DevSheet is a final-year university project, built by one student. It is not a company, it has no paid plans and
        it shows no ads. The code is open: <a href={REPO_URL}>DevSheet on GitHub</a>.
      </p>

      <h2>How it is built</h2>
      <ul>
        <li>Web app: Next.js and React, rendered on the server.</li>
        <li>API: ASP.NET Core 8 with a layered design (domain, application, infrastructure, API).</li>
        <li>Database: PostgreSQL, with schema changes as EF Core migrations.</li>
        <li>CV export: PDF in a modern layout and in one that follows the Europass layout.</li>
      </ul>
    </ProsePage>
  );
}
