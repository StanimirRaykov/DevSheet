import { Roboto } from "next/font/google";
import { GithubMark } from "@/components/github-mark";
import { GoogleMark } from "@/components/google-mark";
import { cn } from "@/components/ui/cn";
import type { SignInProvider } from "@/lib/auth-providers";

// Google's sign-in button guidelines ask for Roboto Medium. Loaded only by this page.
const roboto = Roboto({ weight: "500", subsets: ["latin"], display: "swap" });

// Both buttons share Google's shape (40px high, 4px corners) so they read as one set of equal choices.
const shape =
  "flex h-10 w-full items-center justify-center gap-3 rounded-[4px] border px-3 text-sm " +
  "transition-[background-color,border-color] duration-150 ease-settle";

/** "Continue with GitHub" or "Continue with Google": a plain link, because the API runs the OAuth round trip. */
export function ProviderButton({ provider, href }: { provider: SignInProvider; href: string }) {
  if (provider === "google") {
    return (
      <a
        href={href}
        className={cn(
          shape,
          roboto.className,
          "tracking-[0.25px] border-[#747775] bg-white text-[#1f1f1f] hover:bg-[#f8f9fa]",
          "dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1f1f20]",
        )}
      >
        <GoogleMark />
        Continue with Google
      </a>
    );
  }
  return (
    <a href={href} className={cn(shape, "font-medium border-rule-strong bg-sheet text-ink hover:border-graphite")}>
      <GithubMark size={18} />
      Continue with GitHub
    </a>
  );
}
