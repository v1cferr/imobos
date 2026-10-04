import { ImageResponse } from "next/og";

// The link preview (WhatsApp, Telegram, e-mail). Built once at build time, public by design.
export const alt = "ImobOS: seus clientes e retornos do dia, num lugar só.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#18181b";
const PAPER = "#fafafa";
const MUTED = "#a1a1aa";

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
          padding: 80,
          background: INK,
          color: PAPER,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 26,
              background: PAPER,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* The app's house, solid, as on the favicon. */}
            <svg width="72" height="72" viewBox="14 14 36 36">
              <path
                fill={INK}
                fillRule="evenodd"
                d="M14 29.5a3 3 0 0 1 1.06-2.29l15-12.86a3 3 0 0 1 3.88 0l15 12.86A3 3 0 0 1 50 29.5V47a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z M28 50V38.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.5 1.5V50z"
              />
            </svg>
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2 }}>ImobOS</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            O que preciso fazer hoje?
          </div>
          <div style={{ fontSize: 34, color: MUTED }}>
            Seus clientes e retornos do dia, num lugar só.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
