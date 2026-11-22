/** Cache tag of the public page at /{slug}. Changing what that page shows refreshes the tag (see settings/actions.ts). */
export function publicPageTag(slug: string): string {
  return `public-page:${slug.toLowerCase()}`;
}
