import { ImageResponse } from "next/og";

export const runtime = "edge";

// Mirrors --hero-grad per theme from app/globals.css. Edge image
// generation can't read CSS variables, so the same colors are restated
// here — keep in sync if the theme palette ever changes.
const THEME_GRADIENTS: Record<string, string> = {
  aurora: "linear-gradient(135deg, #1E6FEF 0%, #6a4bf5 55%, #FF8A1E 100%)",
  midnight: "linear-gradient(135deg, #1E6FEF 0%, #6a4bf5 55%, #FF8A1E 100%)",
  cyber: "linear-gradient(135deg, #1E6FEF 0%, #6a4bf5 55%, #FF8A1E 100%)",
  ocean: "linear-gradient(135deg, #0891b2 0%, #14b8a6 55%, #38bdf8 100%)",
  forest: "linear-gradient(135deg, #2f9e44 0%, #84cc16 55%, #eab308 100%)",
  sunset: "linear-gradient(135deg, #f0568c 0%, #ff8a1e 55%, #ffc83d 100%)"
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
  const gradient = THEME_GRADIENTS[searchParams.get("theme") ?? ""] ?? THEME_GRADIENTS.aurora;

  const modeLabel = mode === "time" ? `${amount}s test` : `${amount} words`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: gradient,
          fontFamily: "sans-serif",
          position: "relative"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            position: "absolute",
            top: 44,
            left: 56
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24
            }}
          >
            ⌨️
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "white" }}>
            TypeNest
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(255,255,255,0.14)",
            borderRadius: 32,
            padding: "48px 90px",
            border: "1px solid rgba(255,255,255,0.28)"
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              marginBottom: 6,
              letterSpacing: 2,
              textTransform: "uppercase"
            }}
          >
            {username}&apos;s result
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <div style={{ display: "flex", fontSize: 148, fontWeight: 800, color: "white", lineHeight: 1 }}>
              {wpm}
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              WPM
            </div>
          </div>

          <div style={{ display: "flex", gap: 46, marginTop: 30 }}>
            <StatBlock label="Accuracy" value={`${accuracy}%`} />
            <StatBlock label="Consistency" value={`${consistency}%`} />
            <StatBlock label="Mode" value={modeLabel} />
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.75)", marginTop: 36 }}>
          Type Faster, Think Sharper — TypeNest
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "white" }}>{value}</div>
      <div
        style={{
          display: "flex",
          fontSize: 15,
          color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase",
          letterSpacing: 1
        }}
      >
        {label}
      </div>
    </div>
  );
}
