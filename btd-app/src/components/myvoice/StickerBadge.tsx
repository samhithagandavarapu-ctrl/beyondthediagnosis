import { StickerId, stickerKind } from "../../lib/myVoice";

/** A sticker as an actual sticker: a coloured ring with its name curved around
 *  the top, the state curved around the bottom, and a filled mark in the middle.
 *
 *  The badge is decorative — every place it appears also names the sticker in
 *  real text — but the curved lettering is set in navy rather than white so it
 *  stays readable on all three ring colours. White on butter is about 1.4:1,
 *  which is not a thing to hand someone who is here because reading is work. */

type Props = {
  id: StickerId;
  earned: boolean;
  /** Rendered size in px; the drawing is a 200-unit square. */
  size?: number;
  className?: string;
};

const RING: Record<StickerId, string> = {
  "told-my-doctor": "#8FCBF2",
  "said-how-i-feel": "#FFA694",
  "knows-the-visit": "#FFDE9E",
  "used-my-voice": "#8FCBF2",
};

const NAVY = "#213244";

/** Filled marks, drawn to sit inside the white disc (radius 70 about 100,100). */
const GLYPHS: Record<StickerId, (color: string) => JSX.Element> = {
  "told-my-doctor": (c) => (
    <>
      <path
        d="M70 76 h60 a12 12 0 0 1 12 12 v26 a12 12 0 0 1 -12 12 h-26 l-18 16 v-16 h-16 a12 12 0 0 1 -12 -12 v-26 a12 12 0 0 1 12 -12 z"
        fill={c}
      />
      <circle cx="84" cy="101" r="5.5" fill="#fff" />
      <circle cx="100" cy="101" r="5.5" fill="#fff" />
      <circle cx="116" cy="101" r="5.5" fill="#fff" />
    </>
  ),
  "said-how-i-feel": (c) => (
    <path
      d="M100 132 C100 132 66 110 66 89 C66 78 74.6 69.4 85.6 69.4 C92.4 69.4 98.6 72.9 100 78 C101.4 72.9 107.6 69.4 114.4 69.4 C125.4 69.4 134 78 134 89 C134 110 100 132 100 132 Z"
      fill={c}
    />
  ),
  "knows-the-visit": (c) => (
    <>
      <rect x="66" y="80" width="68" height="54" rx="9" fill={c} />
      <rect x="80" y="66" width="7" height="20" rx="3.5" fill={c} />
      <rect x="113" y="66" width="7" height="20" rx="3.5" fill={c} />
      <rect x="66" y="80" width="68" height="14" rx="7" fill={c} />
      <circle cx="83" cy="107" r="4.5" fill="#fff" />
      <circle cx="100" cy="107" r="4.5" fill="#fff" />
      <circle cx="117" cy="107" r="4.5" fill="#fff" />
      <circle cx="83" cy="122" r="4.5" fill="#fff" />
      <circle cx="100" cy="122" r="4.5" fill="#fff" />
      {/* The one marked day — the visit itself. */}
      <circle cx="117" cy="122" r="4.5" fill="#FF8E77" />
    </>
  ),
  "used-my-voice": (c) => (
    <>
      <rect x="90" y="64" width="20" height="46" rx="10" fill={c} />
      <path
        d="M76 98 a24 24 0 0 0 48 0"
        fill="none"
        stroke={c}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect x="96.5" y="120" width="7" height="16" rx="3.5" fill={c} />
      <rect x="82" y="132" width="36" height="7" rx="3.5" fill={c} />
    </>
  ),
};

export default function StickerBadge({ id, earned, size = 132, className = "" }: Props) {
  const kind = stickerKind(id);
  const ring = RING[id];
  const label = kind.label.toUpperCase();
  const state = earned ? "EARNED" : "NOT YET EARNED";

  // Long names need smaller lettering to fit the arc without crowding.
  const labelSize = label.length > 26 ? 10 : label.length > 18 ? 11.5 : 13;

  const topArc = `top-${id}`;
  const bottomArc = `bottom-${id}`;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Left to right over the top. */}
        <path id={topArc} d="M 18 100 A 82 82 0 0 1 182 100" fill="none" />
        {/* Left to right under the bottom (sweep 0), which is what keeps the
            letters upright rather than mirrored. */}
        <path id={bottomArc} d="M 18 100 A 82 82 0 0 0 182 100" fill="none" />
      </defs>

      <circle cx="100" cy="100" r="96" fill={ring} opacity={earned ? 1 : 0.55} />
      <circle cx="100" cy="100" r="70" fill="#fff" />

      {/* The mark in the middle, in the ring's own colour. */}
      <g opacity={earned ? 1 : 0.45}>{GLYPHS[id](ring)}</g>

      <text
        fill={NAVY}
        fontSize={labelSize}
        fontWeight="700"
        letterSpacing="1.4"
        textAnchor="middle"
      >
        <textPath href={`#${topArc}`} startOffset="50%">
          {label}
        </textPath>
      </text>
      <text
        fill={NAVY}
        fontSize="9.5"
        fontWeight="700"
        letterSpacing="1.6"
        textAnchor="middle"
        opacity="0.75"
      >
        <textPath href={`#${bottomArc}`} startOffset="50%">
          {state}
        </textPath>
      </text>

      {/* Ticks at the sides, and the state marker on the right: a gold star
          once it's yours, an open dot while it's still waiting. */}
      <rect x="9" y="98" width="17" height="4" rx="2" fill="#fff" />
      {earned ? (
        <path
          d="M183 91 l2.6 5.3 5.9 0.9 -4.3 4.2 1 5.9 -5.2 -2.8 -5.2 2.8 1 -5.9 -4.3 -4.2 5.9 -0.9 Z"
          fill={ring === "#FFDE9E" ? "#E8A33C" : "#FFDE9E"}
          stroke={ring === "#FFDE9E" ? "#9A6B12" : "#E8B54B"}
          strokeWidth="0.8"
        />
      ) : (
        <>
          <circle cx="183" cy="100" r="7" fill="#fff" />
          <circle cx="183" cy="100" r="2.6" fill={ring} />
        </>
      )}
    </svg>
  );
}
