import { ImageResponse } from "next/og";

import { KeyMark } from "@/components/brand/key-mark";

// The home-screen icon on iPhone and iPad. iOS rounds the corners itself, so the tile is square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
        }}
      >
        <KeyMark size={108} color="#fafafa" stroke={2.2} />
      </div>
    ),
    size,
  );
}
