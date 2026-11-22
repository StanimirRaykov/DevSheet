"use server";

import { updateTag } from "next/cache";
import { publicPageTag } from "@/lib/public-page-tag";

/**
 * Drops the cached public pages at these addresses, so a move, an unpublish or a deleted account shows at once
 * instead of after the cache minute. It only empties a cache (the next visit reads the API again), so it is
 * harmless whoever calls it; the input is still checked.
 */
export async function refreshPublicPages(slugs: string[]): Promise<void> {
  if (!Array.isArray(slugs)) return;
  for (const slug of slugs.slice(0, 4)) {
    if (typeof slug === "string" && /^[a-z0-9-]{1,30}$/i.test(slug)) updateTag(publicPageTag(slug));
  }
}
