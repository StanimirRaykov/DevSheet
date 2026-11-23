import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Portfolio } from "./_components/portfolio";
import { loadPortfolio } from "./load-portfolio";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const data = await loadPortfolio((await params).slug);
  // Unknown or unpublished. Search engines and link previews (Slack, X, LinkedIn...) get metadata before the
  // page streams, so for them this is a real 404 status. Browsers get the page streamed: the status is already
  // 200 by then, and Next.js marks the not-found page noindex instead.
  if (!data) notFound();
  const name = data.profile?.fullName || data.displayName;
  const description = data.profile?.headline || `${name}'s projects and skills.`;
  // The preview card when the link is shared; the image comes from opengraph-image.tsx next to this page.
  return {
    title: name,
    description,
    alternates: { canonical: `/${data.slug}` },
    openGraph: { type: "profile", title: `${name} · DevSheet`, description, url: `/${data.slug}`, siteName: "DevSheet" },
    twitter: { card: "summary_large_image", title: `${name} · DevSheet`, description },
  };
}

async function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await loadPortfolio((await params).slug);
  if (!data) notFound();
  return <Portfolio data={data} />;
}

export default function PublicPage({ params }: PageProps<"/[slug]">) {
  return (
    <main>
      <Suspense fallback={<div className="min-h-screen bg-paper" />}>
        <PortfolioPage params={params} />
      </Suspense>
    </main>
  );
}
