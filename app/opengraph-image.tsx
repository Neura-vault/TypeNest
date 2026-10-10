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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1E6FEF 0%, #6a4bf5 55%, #FF8A1E 100%)",
          fontFamily: "sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34
            }}
          >
            ⌨️
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "white" }}>TypeNest</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.92)", textAlign: "center", padding: "0 80px" }}>
          Type Faster, Think Sharper, Build Your Nest.
        </div>
      </div>
    ),
    { ...size }
  );
}
