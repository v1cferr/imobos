import { ImageResponse } from "next/og";

import { KeyMark } from "@/components/brand/key-mark";

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
            <KeyMark size={72} color={INK} stroke={2.2} />
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
