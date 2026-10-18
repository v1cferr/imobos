import { ImageResponse } from "next/og";

import { KeyMark } from "@/components/brand/key-mark";

// Android launcher icons for the manifest. "maskable" keeps the key inside the safe zone (the
// central 80%), because Android crops the tile into its own shape.
const VARIANTS = {
  "192": { px: 192, key: 0.62 },
  "512": { px: 512, key: 0.62 },
  maskable: { px: 512, key: 0.46 },
} as const;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((size) => ({ size }));
}

export async function GET(_: Request, { params }: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await params;
  const variant = VARIANTS[size as keyof typeof VARIANTS];
  if (!variant) return new Response(null, { status: 404 });
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
        <KeyMark size={Math.round(variant.px * variant.key)} color="#fafafa" stroke={2.2} />
      </div>
    ),
    { width: variant.px, height: variant.px },
  );
}
