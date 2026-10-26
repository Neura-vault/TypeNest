import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TypeNest — Type Faster, Think Sharper, Build Your Nest";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0B0B0F",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#FFFFFF", letterSpacing: -1 }}>TypeNest</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 116, fontWeight: 700, lineHeight: 1, letterSpacing: -4 }}>
          <div style={{ display: "flex", color: "#FFFFFF" }}>Type faster.</div>
          <div style={{ display: "flex", color: "#7C93FF" }}>Think sharper.</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#9A9AA6" }}>
          Typing tests, lessons, games and live races.
        </div>
      </div>
    ),
    { ...size }
  );
}
