import { ImageResponse } from "next/og";
import { ICON_URI } from "../lib/icon-uri";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e0d14" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ICON_URI} width={140} height={140} alt="" />
      </div>
    ),
    { ...size },
  );
}
