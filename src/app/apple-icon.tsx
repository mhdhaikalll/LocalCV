import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#2b6469",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 84,
          fontWeight: 800,
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.04em",
        }}
      >
        CV
      </div>
    ),
    { ...size },
  );
}
