import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#09090e",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "72px 80px",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow — top right */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)",
        }}
      />
      {/* Glow — bottom left */}
      <div
        style={{
          position: "absolute",
          bottom: -120,
          left: 40,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(129,140,248,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Brand mark */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "rgba(99,102,241,0.15)",
            border: "1.5px solid rgba(99,102,241,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#818cf8", fontSize: 26, fontWeight: 700, lineHeight: 1 }}>P</span>
        </div>
        <span
          style={{
            color: "#e4e4e7",
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: -0.5,
          }}
        >
          Proman
        </span>
      </div>

      {/* Hero tagline */}
      <div
        style={{
          marginTop: "auto",
          color: "#fafafa",
          fontSize: 66,
          fontWeight: 700,
          lineHeight: 1.08,
          letterSpacing: -2.5,
        }}
      >
        Collect rent.
        <br />
        Issue receipts.
        <br />
        Stay compliant.
      </div>

      {/* Descriptor */}
      <div
        style={{
          marginTop: 28,
          color: "#71717a",
          fontSize: 22,
          lineHeight: 1.5,
        }}
      >
        Property management built for landlords in Portugal and Spain.
      </div>

      {/* Feature chips */}
      <div style={{ display: "flex", gap: 12, marginTop: 44 }}>
        <div
          style={{
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.08)",
            color: "#a5b4fc",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          AT Receipts
        </div>
        <div
          style={{
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.08)",
            color: "#a5b4fc",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          IRS / IRPF Export
        </div>
        <div
          style={{
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.08)",
            color: "#a5b4fc",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          Self-hosted
        </div>
        <div
          style={{
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.08)",
            color: "#a5b4fc",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          PT · ES
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
