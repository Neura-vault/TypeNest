import { ImageResponse } from "next/og";

export const runtime = "edge";

// Edge image generation cannot read CSS variables, so each theme's accent is
// restated here. Keep in sync with app/globals.css.
const ACCENTS: Record<string, string> = {
  aurora: "#2340ff",
  midnight: "#2340ff",
  cyber: "#8b6cff",
  ocean: "#0a8ca8",
  forest: "#2a8f40",
  sunset: "#e8456f"
};

function clampNumber(raw: string | null, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(Math.min(n, max));
}

function sanitizeUsername(raw: string | null): string {
  if (!raw) return "Guest";
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-. ]/g, "").slice(0, 24).trim();
  return cleaned || "Guest";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wpm = clampNumber(searchParams.get("wpm"), 0, 400);
  const accuracy = clampNumber(searchParams.get("acc"), 0, 100);
  const consistency = clampNumber(searchParams.get("cons"), 0, 100);
  const mode = searchParams.get("mode") === "words" ? "words" : "time";
  const amount = clampNumber(searchParams.get("amount"), 30, 500);
  const username = sanitizeUsername(searchParams.get("u"));
  const accent = ACCENTS[searchParams.get("theme") ?? ""] ?? ACCENTS.aurora;
  const modeLabel = mode === "time" ? `${amount} second test` : `${amount} word test`;

  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", paddingLeft: 28, borderLeft: "2px solid #e5e5ea" }}>
      <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#0b0b0f", letterSpacing: -2 }}>{value}</div>
      <div style={{ display: "flex", fontSize: 22, color: "#6b6b76", marginTop: 4 }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#0b0b0f", letterSpacing: -1 }}>TypeNest</div>
          <div style={{ display: "flex", fontSize: 24, color: "#6b6b76" }}>{modeLabel}</div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 280, fontWeight: 800, color: accent, lineHeight: 0.9, letterSpacing: -12 }}>{wpm}</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 600, color: "#0b0b0f", marginLeft: 20, marginBottom: 28 }}>WPM</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 36 }}>
            {stat("Accuracy", `${accuracy}%`)}
            {stat("Consistency", `${consistency}%`)}
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#0b0b0f" }}>{username}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
