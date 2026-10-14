import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

/** App icon: ?size=192|512|180, &round=1 for the rounded "any" icon, &maskable=1 for the safe-zone version. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const n = Number(q.get("size"));
  const size = SIZES.has(n) ? n : 512;
  const maskable = q.get("maskable") === "1";
  const round = q.get("round") === "1";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg,#FF4D8D,#F5C26B)", borderRadius: round ? Math.round(size * 0.22) : 0,
        }}
      >
        <span style={{ fontSize: Math.round(size * (maskable ? 0.44 : 0.58)), fontWeight: 800, color: "#0B0B0F", lineHeight: 1 }}>V</span>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
