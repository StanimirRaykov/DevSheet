import { cn } from "./cn";

/** Up to two initials from a display name: "Ada Lovelace" -> "AL", "octocat" -> "O". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? [words[0][0]] : [words[0][0], words[words.length - 1][0]];
  return letters.join("").toUpperCase();
}

/** Picture when there is one, initials otherwise. The name is the accessible label either way. */
export function Avatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- avatars come from providers' CDNs; no Next image config needed
    return <img src={src} alt={name} style={style} className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span
      role="img"
      aria-label={name}
      style={style}
      className={cn("inline-grid place-items-center rounded-full bg-accent-soft font-medium text-accent", className)}
    >
      {initials(name)}
    </span>
  );
}
