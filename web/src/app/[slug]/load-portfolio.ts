import { cacheLife, cacheTag } from "next/cache";
import { SERVER_API, type PublicPortfolio } from "@/lib/api";
import { publicPageTag } from "@/lib/public-page-tag";

// Public pages read only stored data from our API and never call GitHub.
// Cached for a minute and shared by the page and its metadata. null = no published page with this slug.
// Settings refreshes the tag at once when the owner moves, unpublishes or deletes the page.
export async function loadPortfolio(slug: string): Promise<PublicPortfolio | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(publicPageTag(slug));
  const res = await fetch(`${SERVER_API}/api/public/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/public/${slug} failed with ${res.status}`);
  return (await res.json()) as PublicPortfolio;
}
