/** The ImobOS key (Lucide key-round), shared by the icons and the preview image. */
export const KEY_PATH =
  "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z";

export function KeyMark({ size, color, stroke = 2.4 }: { size: number; color: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d={KEY_PATH}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="7.5" r="0.6" fill={color} />
    </svg>
  );
}
