import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo/site";

export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d4043 0%, #2b6469 55%, #478f94 100%)",
          padding: 80,
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 40 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 800,
              color: "#2b6469",
            }}
          >
            CV
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {SITE.name}
          </div>
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            maxWidth: 980,
          }}
        >
          Build a resume that actually gets read.
        </div>
        <div
          style={{
            fontSize: 32,
            marginTop: 28,
            color: "#dcecec",
            maxWidth: 900,
          }}
        >
          Free · Local-first · Privacy-first
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
          {["ATS score", "12 templates", "PDF export", "No signup"].map((label) => (
            <div
              key={label}
              style={{
                fontSize: 24,
                padding: "12px 24px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.28)",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
