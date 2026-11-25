"use client";

import { RouteError } from "@/components/route-states";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * The last resort, when the root layout itself fails. It replaces the whole document, so it brings its own <html>,
 * styles and theme script (fonts fall back to the system ones).
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something went wrong · DevSheet</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="grid min-h-screen place-items-center bg-paper px-4 py-16">
        <main>
          <RouteError error={error} retry={retry} home={{ href: "/", label: "Go to DevSheet" }} />
        </main>
      </body>
    </html>
  );
}
