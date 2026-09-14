import type { BodyPartId } from "../../lib/myVoice";

// Body-part icons share the 24x24 grid and 1.75 stroke of the rest of the set.
// Each one is the same little figure with a single region highlighted, so the
// row reads as one drawing seen thirteen ways rather than thirteen clip-art
// pictures. Eyes, ears and mouth are drawn on their own, filling the grid —
// on a figure this small they'd be three identical dots.
//
// The highlight is currentColor at low opacity rather than a fixed coral, so
// it stays visible on a white chip and on a selected coral one alike.

const HIGHLIGHT = { fill: "currentColor", opacity: 0.42, stroke: "none" } as const;

function Figure({ highlight }: { highlight?: JSX.Element }) {
  return (
    <>
      {highlight}
      <circle cx="12" cy="4.3" r="2.7" />
      <path d="M11 6.9 L11 7.8M13 6.9 L13 7.8" />
      <path d="M8.6 7.8 h6.8 a1.5 1.5 0 0 1 1.5 1.5 v4.4 a1.1 1.1 0 0 1 -1.1 1.1 h-7.6 a1.1 1.1 0 0 1 -1.1 -1.1 v-4.4 a1.5 1.5 0 0 1 1.5 -1.5 z" />
      <path d="M8.3 8.2 L6.3 9.2 v4.6" />
      <path d="M15.7 8.2 L17.7 9.2 v4.6" />
      <path d="M10 14.8 v5.6M14 14.8 v5.6" />
      <path d="M8.7 20.8 h2.6M12.7 20.8 h2.6" />
    </>
  );
}

const SHAPES: Record<BodyPartId, JSX.Element> = {
  head: <Figure highlight={<circle cx="12" cy="4.3" r="3.6" {...HIGHLIGHT} />} />,
  throat: <Figure highlight={<rect x="9.8" y="6.5" width="4.4" height="2.2" rx="1.1" {...HIGHLIGHT} />} />,
  chest: <Figure highlight={<rect x="8.2" y="8" width="7.6" height="3.4" rx="1.4" {...HIGHLIGHT} />} />,
  tummy: <Figure highlight={<rect x="8.2" y="11.2" width="7.6" height="3.6" rx="1.4" {...HIGHLIGHT} />} />,
  arms: (
    <Figure
      highlight={
        <>
          <rect x="5.1" y="8" width="2.6" height="6.2" rx="1.3" {...HIGHLIGHT} />
          <rect x="16.3" y="8" width="2.6" height="6.2" rx="1.3" {...HIGHLIGHT} />
        </>
      }
    />
  ),
  hands: (
    <Figure
      highlight={
        <>
          <circle cx="6.3" cy="14.2" r="1.7" {...HIGHLIGHT} />
          <circle cx="17.7" cy="14.2" r="1.7" {...HIGHLIGHT} />
        </>
      }
    />
  ),
  legs: (
    <Figure
      highlight={
        <>
          <rect x="8.8" y="14.8" width="2.4" height="5.8" rx="1.2" {...HIGHLIGHT} />
          <rect x="12.8" y="14.8" width="2.4" height="5.8" rx="1.2" {...HIGHLIGHT} />
        </>
      }
    />
  ),
  feet: (
    <Figure
      highlight={
        <>
          <rect x="8.2" y="19.8" width="3.6" height="2" rx="1" {...HIGHLIGHT} />
          <rect x="12.2" y="19.8" width="3.6" height="2" rx="1" {...HIGHLIGHT} />
        </>
      }
    />
  ),
  "all-over": (
    <Figure
      highlight={
        <>
          <circle cx="12" cy="4.3" r="3.4" {...HIGHLIGHT} />
          <rect x="5.1" y="7.6" width="13.8" height="7.4" rx="2.2" {...HIGHLIGHT} />
          <rect x="8.8" y="14.8" width="6.4" height="6" rx="1.6" {...HIGHLIGHT} />
        </>
      }
    />
  ),
  // Seen from behind: no face, and the spine marks which side you're looking at.
  back: (
    <>
      <rect x="7.6" y="7.6" width="8.8" height="7.4" rx="2" {...HIGHLIGHT} />
      <circle cx="12" cy="4.3" r="2.7" />
      <path d="M11 6.9 L11 7.8M13 6.9 L13 7.8" />
      <path d="M8.6 7.8 h6.8 a1.5 1.5 0 0 1 1.5 1.5 v4.4 a1.1 1.1 0 0 1 -1.1 1.1 h-7.6 a1.1 1.1 0 0 1 -1.1 -1.1 v-4.4 a1.5 1.5 0 0 1 1.5 -1.5 z" />
      <path d="M12 8.4 L12 14.6" />
      <path d="M10.4 10 L13.6 10M10.4 12.2 L13.6 12.2" />
      <path d="M8.3 8.2 L6.3 9.2 v4.6M15.7 8.2 L17.7 9.2 v4.6" />
      <path d="M10 14.8 v5.6M14 14.8 v5.6" />
    </>
  ),
  // One big eye, filling the grid — at 28px a pair of small eyes on a head
  // is indistinguishable from the ear and mouth icons.
  eyes: (
    <>
      <ellipse cx="12" cy="12" rx="6.2" ry="4.4" {...HIGHLIGHT} />
      <path d="M2.4 12 Q12 4 21.6 12 Q12 20 2.4 12 Z" />
      <circle cx="12" cy="12" r="3.1" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  // A single ear, side on, with the sound curling into it.
  ears: (
    <>
      <path
        d="M8.2 21 C8.2 17 5.4 15.4 5.4 11.2 a6.4 6.4 0 0 1 12.8 -0.4 c0 3.6 -4 3.4 -4 6.2 a2.4 2.4 0 0 1 -4.6 0.8"
        {...HIGHLIGHT}
      />
      <path d="M8.2 21 C8.2 17 5.4 15.4 5.4 11.2 a6.4 6.4 0 0 1 12.8 -0.4 c0 3.6 -4 3.4 -4 6.2 a2.4 2.4 0 0 1 -4.6 0.8" />
      <path d="M9 11 a3 3 0 0 1 5.6 1.2" />
    </>
  ),
  // An open mouth with the upper teeth showing, filling the grid.
  mouth: (
    <>
      <path d="M2.8 12 Q12 5.4 21.2 12 Q12 19.8 2.8 12 Z" {...HIGHLIGHT} />
      <path d="M2.8 12 Q12 5.4 21.2 12 Q12 19.8 2.8 12 Z" />
      <path d="M6 10 L18 10" />
      <path d="M9.4 8.4 L9.4 10M12 7.9 L12 10M14.6 8.4 L14.6 10" />
    </>
  ),
};

export default function BodyPartIcon({
  part,
  size = 24,
  className = "",
}: {
  part: BodyPartId;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[part]}
    </svg>
  );
}
