import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f766e 0%, #115e59 40%, #4c1d95 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 88,
              height: 88,
              borderRadius: 20,
              background: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M14 34h8l4-12 8 20 4-12h12"
                fill="none"
                stroke="#ffffff"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>MCG Learn</div>
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 600, textAlign: "center", maxWidth: 900 }}>
          Build a medical coding career that matters.
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#ccfbf1", marginTop: 20 }}>
          Structured learning paths · Verified certificates · Career guidance
        </div>
      </div>
    ),
    { ...size },
  );
}
