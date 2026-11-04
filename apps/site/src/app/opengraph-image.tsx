import { ImageResponse } from "next/og";
import { ICON_URI } from "../lib/icon-uri";

export const alt = "Farsha: free, open source design tool";
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
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg,#0e0d14 0%,#1b1530 60%,#2a1c5c 100%)",
          color: "#f2f0fa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICON_URI} width={96} height={96} alt="" />
          <div style={{ fontSize: 56, fontWeight: 800 }}>Farsha</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Design freely for everyone.</div>
          <div style={{ fontSize: 34, color: "#a29cba" }}>Free, open source Figma alternative. Same panels and shortcuts. Your files stay in your Google Drive.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: "#7c5cff" }}>
          <div>farsha.org</div>
          <div style={{ color: "#a29cba" }}>Open source · MIT</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
