import { Roboto } from "next/font/google";
import { GoogleMark } from "@/components/google-mark";
import { cn } from "@/components/ui/cn";
import type { SignInProvider } from "@/lib/auth-providers";

// Google's sign-in button guidelines ask for Roboto Medium. Loaded only by the sign-in pages.
const roboto = Roboto({ weight: "500", subsets: ["latin"], display: "swap" });

/** "Continue with Google" (Apple later): a plain link, because the API runs the OAuth round trip. */
export function ProviderButton({ provider, href }: { provider: SignInProvider; href: string }) {
  switch (provider) {
    case "google":
      return (
        <a
          href={href}
          className={cn(
            // Google's shape: 40px high, 4px corners.
            "flex h-10 w-full items-center justify-center gap-3 rounded-[4px] border px-3 text-sm",
            "transition-[background-color,border-color] duration-150 ease-settle",
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
}
