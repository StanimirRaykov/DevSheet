import type { Metadata } from "next";
import { JetBrains_Mono, Schibsted_Grotesk, Source_Serif_4 } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// UI and body text.
const body = Schibsted_Grotesk({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
// Names and headings: the "printed document" voice of the sheet.
const serif = Source_Serif_4({ variable: "--font-document", subsets: ["latin", "latin-ext", "cyrillic"] });
// Only for real code values: slugs, repository names, URLs.
const code = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "DevSheet", template: "%s · DevSheet" },
  description: "A portfolio and CV for software engineers, built from their GitHub work and kept in sync.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the head script sets data-theme before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${body.variable} ${serif.variable} ${code.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
