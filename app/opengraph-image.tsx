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
          background: "radial-gradient(circle, rgba(13,148,136,0.20) 0%, transparent 65%)",
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
          background: "radial-gradient(circle, rgba(232,130,90,0.10) 0%, transparent 70%)",
        }}
      />

      {/* Brand mark */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="52" height="52" viewBox="0 0 128 128">
          <defs>
            <linearGradient id="og-lares" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#d97a53" />
            </linearGradient>
          </defs>
          <rect width="128" height="128" rx="28" fill="url(#og-lares)" />
          <path
            d="M42 96V60a22 22 0 0 1 44 0v36"
            fill="none"
            stroke="#0b0e14"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <rect x="58" y="30" width="12" height="16" rx="3" fill="#0b0e14" />
        </svg>
        <span
          style={{
            color: "#e4e4e7",
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: -0.5,
          }}
        >
          Lares
        </span>
      </div>

      {/* Hero tagline */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          color: "#fafafa",
          fontSize: 66,
          fontWeight: 700,
          lineHeight: 1.08,
          letterSpacing: -2.5,
        }}
      >
        <span>Collect rent.</span>
        <span>Issue receipts.</span>
        <span>Stay compliant.</span>
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
        Property management built for European landlords.
      </div>

      {/* Feature chips */}
      <div style={{ display: "flex", gap: 12, marginTop: 44 }}>
        <div
          style={{
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(13,148,136,0.35)",
            background: "rgba(13,148,136,0.10)",
            color: "#5eead4",
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
            border: "1px solid rgba(13,148,136,0.35)",
            background: "rgba(13,148,136,0.10)",
            color: "#5eead4",
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
            border: "1px solid rgba(13,148,136,0.35)",
            background: "rgba(13,148,136,0.10)",
            color: "#5eead4",
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
            border: "1px solid rgba(13,148,136,0.35)",
            background: "rgba(13,148,136,0.10)",
            color: "#5eead4",
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
