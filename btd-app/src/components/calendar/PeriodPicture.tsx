import type { FlowProduct } from "../../lib/calendar";

// Simple, original pictures of a used pad, tampon, or pair of period
// underwear, with a coral area that grows from "just a little" to "soaked
// through" — after the pictorial charts doctors use, without a score.

const CORAL = "#FFA694";
const CORAL_DARK = "#E4705A";
const NAVY = "#213244";

export default function PeriodPicture({
  product,
  fill,
  size = 72,
}: {
  product: FlowProduct;
  /** 0 to 1: how much of it is coral. */
  fill: number;
  size?: number;
}) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      {product === "pad" && <Pad fill={fill} />}
      {product === "tampon" && <Tampon fill={fill} />}
      {product === "underwear" && <Underwear fill={fill} />}
    </svg>
  );
}

function Pad({ fill }: { fill: number }) {
  // A long rounded pad; the stain is an oval in the middle that grows.
  const rx = 4 + fill * 9;
  const ry = 5 + fill * 20;
  return (
    <>
      <rect x="18" y="4" width="28" height="56" rx="13" fill="#fff" stroke={NAVY} strokeWidth="2.2" />
      <ellipse cx="32" cy="32" rx={rx} ry={ry} fill={CORAL} stroke={fill >= 1 ? CORAL_DARK : "none"} strokeWidth="1.5" />
      {fill >= 1 && <path d="M20 46 q-3 4 0 8 M44 18 q3 -4 0 -8" stroke={CORAL_DARK} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
    </>
  );
}

function Tampon({ fill }: { fill: number }) {
  // An upright tampon; coral rises from the top.
  const h = 6 + fill * 28;
  return (
    <>
      <clipPath id="tampon-body">
        <rect x="23" y="6" width="18" height="36" rx="9" />
      </clipPath>
      <rect x="23" y="6" width="18" height="36" rx="9" fill="#fff" />
      <rect x="23" y="6" width="18" height={h} fill={CORAL} clipPath="url(#tampon-body)" />
      <rect x="23" y="6" width="18" height="36" rx="9" fill="none" stroke={NAVY} strokeWidth="2.2" />
      <path d="M32 42 C32 50 28 52 30 60" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  );
}

function Underwear({ fill }: { fill: number }) {
  // A pair of briefs seen from the front; the stain sits in the middle.
  const rx = 3 + fill * 10;
  const ry = 3 + fill * 9;
  return (
    <>
      <path
        d="M6 14 H58 V24 C50 26 42 34 40 50 H24 C22 34 14 26 6 24 Z"
        fill="#fff"
        stroke={NAVY}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <ellipse cx="32" cy="38" rx={rx} ry={ry} fill={CORAL} stroke={fill >= 1 ? CORAL_DARK : "none"} strokeWidth="1.5" />
    </>
  );
}
