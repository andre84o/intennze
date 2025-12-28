import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "intenzze webbstudio";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            background: "linear-gradient(90deg, #22d3ee 0%, #818cf8 50%, #c084fc 100%)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 20,
          }}
        >
          intenzze
        </div>
        <div
          style={{
            fontSize: 48,
            color: "#a78bfa",
            fontWeight: 500,
          }}
        >
          webbstudio
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
