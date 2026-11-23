import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PublicPortfolio, SERVER_API } from "@/lib/api";
import { publicPageTag } from "@/lib/public-page-tag";
import { Portfolio } from "./_components/portfolio";

// Public pages read only stored data from our API and never call GitHub.
// Cached for a minute and shared by the page and its metadata. null = no published page with this slug.
// Settings refreshes the tag at once when the owner moves, unpublishes or deletes the page.
async function loadPortfolio(slug: string): Promise<PublicPortfolio | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(publicPageTag(slug));
  const res = await fetch(`${SERVER_API}/api/public/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/public/${slug} failed with ${res.status}`);
  return (await res.json()) as PublicPortfolio;
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const data = await loadPortfolio((await params).slug);
  if (!data) return { title: "Page not found" };
  const name = data.profile?.fullName || data.displayName;
  return { title: name, description: data.profile?.headline || `${name}'s projects and skills.` };
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
