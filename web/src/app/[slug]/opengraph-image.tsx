import { ImageResponse } from "next/og";
import { loadPortfolio } from "./load-portfolio";

export const alt = "A developer's DevSheet: name, headline and top skills";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Light theme colours from globals.css: the card is the sheet on the desk.
const PAPER = "#f5f6f8", SHEET = "#ffffff", INK = "#151a22", GRAPHITE = "#5a6372", RULE = "#e1e4ea", ACCENT = "#2e44c8", ACCENT_SOFT = "#e8ebfb";

/**
 * The preview card shown when a public page is shared: name, headline and the most used skills.
 * An unknown or unpublished address gets a plain DevSheet card, so the image never tells whether it exists.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const data = await loadPortfolio((await params).slug);
  const name = data ? data.profile?.fullName || data.displayName : "DevSheet";
  const headline = data ? data.profile?.headline ?? "" : "Portfolios and CVs for software engineers";
  const skills = data?.skills.slice(0, 6).map((s) => s.name) ?? [];

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: PAPER, padding: 48 }}>
        <div
          style={{
            display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1,
            background: SHEET, borderRadius: 20, border: `1px solid ${RULE}`, padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: name.length > 24 ? 64 : 80, fontWeight: 700, color: INK, letterSpacing: -2, lineHeight: 1.05 }}>{name}</div>
            {headline && <div style={{ fontSize: 36, color: GRAPHITE, lineHeight: 1.3 }}>{headline}</div>}
            {skills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
                {skills.map((s) => (
                  <div key={s} style={{ display: "flex", fontSize: 26, color: ACCENT, background: ACCENT_SOFT, borderRadius: 999, padding: "8px 22px" }}>{s}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: GRAPHITE }}>
            <div style={{ display: "flex", fontWeight: 700, color: INK }}>DevSheet</div>
            {data && <div style={{ display: "flex" }}>/{data.slug}</div>}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
