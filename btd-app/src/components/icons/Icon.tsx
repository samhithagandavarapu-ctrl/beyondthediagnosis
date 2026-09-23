// One icon set for the whole app, so nothing is borrowed from the platform's
// emoji font. Every icon is drawn on the same 24x24 grid with the same 1.75
// stroke, round caps and round joins, and inherits color from its parent —
// which is what makes a row of them read as one family.

export type IconName =
  // Face scale, great through really bad
  | "face-great"
  | "face-good"
  | "face-okay"
  | "face-bad"
  | "face-awful"
  // How long it's been going on
  | "since-today"
  | "since-few-days"
  | "since-week"
  // Visit walkthrough steps
  | "door"
  | "chair"
  | "thermometer"
  | "talk"
  | "stethoscope"
  | "celebrate"
  // Stickers
  | "sticker-told"
  | "sticker-feel"
  | "sticker-map"
  | "sticker-voice"
  // My Voice hub
  | "hub-feelings"
  | "hub-tell"
  | "hub-visit"
  | "hub-stickers"
  // Controls
  | "mic"
  | "stop"
  | "speaker"
  | "speaker-off"
  | "check"
  | "save"
  | "refine"
  | "breath";

type Props = {
  name: IconName;
  /** Pixel size; the icon is always square. */
  size?: number;
  className?: string;
  /** Icons are decorative by default — the control around them carries the
   *  label. Pass a title only when the icon is the sole meaning. */
  title?: string;
};

const S = 1.75;

export default function Icon({ name, size = 24, className = "", title }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={S}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}

// A face is a circle, two eyes and a mouth; only the mouth curve and the eye
// shape change across the scale, so the five read as one continuous range
// rather than five unrelated drawings.
function face(mouth: JSX.Element, eyes: JSX.Element) {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      {eyes}
      {mouth}
    </>
  );
}

const roundEyes = (
  <>
    <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
  </>
);

const squintEyes = (
  <>
    <path d="M7.6 10.4 L10.4 10.4" />
    <path d="M13.6 10.4 L16.4 10.4" />
  </>
);

const worriedEyes = (
  <>
    <circle cx="9" cy="10.4" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10.4" r="0.9" fill="currentColor" stroke="none" />
    <path d="M7.4 8.2 L10.2 8.9" />
    <path d="M16.6 8.2 L13.8 8.9" />
  </>
);

const PATHS: Record<IconName, JSX.Element> = {
  // ---- Face scale ----
  "face-great": face(<path d="M8 14.2 Q12 18 16 14.2 Z" />, roundEyes),
  "face-good": face(<path d="M8.4 14.4 Q12 17.2 15.6 14.4" />, roundEyes),
  "face-okay": face(<path d="M8.6 15 L15.4 15" />, roundEyes),
  "face-bad": face(<path d="M8.4 16.2 Q12 13.4 15.6 16.2" />, roundEyes),
  "face-awful": face(<path d="M8.2 16.6 Q12 13 15.8 16.6" />, worriedEyes),

  // ---- Since ----
  "since-today": (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.6 L12 4.4M12 19.6 L12 21.4M2.6 12 L4.4 12M19.6 12 L21.4 12" />
      <path d="M5.4 5.4 L6.7 6.7M17.3 17.3 L18.6 18.6M18.6 5.4 L17.3 6.7M6.7 17.3 L5.4 18.6" />
    </>
  ),
  "since-few-days": (
    <>
      <rect x="3.2" y="5" width="17.6" height="15.4" rx="2.4" />
      <path d="M3.2 9.6 L20.8 9.6M8 3.2 L8 6.4M16 3.2 L16 6.4" />
      <circle cx="8.4" cy="13.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="13.6" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  "since-week": (
    <>
      <circle cx="12" cy="12.6" r="8.4" />
      <path d="M12 7.6 L12 12.6 L15.6 14.6" />
      <path d="M4.6 4.2 L7.4 6.2M19.4 4.2 L16.6 6.2" />
    </>
  ),

  // ---- Visit walkthrough ----
  door: (
    <>
      <path d="M5 20.6 L5 4.6 a1.4 1.4 0 0 1 1.4-1.4 h8.8 a1.4 1.4 0 0 1 1.4 1.4 v16" />
      <path d="M3.2 20.6 L20.8 20.6" />
      <circle cx="13.4" cy="12.4" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  chair: (
    <>
      <path d="M6.4 11.6 L6.4 5.4 a2 2 0 0 1 2-2 h7.2 a2 2 0 0 1 2 2 v6.2" />
      <path d="M4.6 11.6 L19.4 11.6 a1.4 1.4 0 0 1 1.4 1.4 v2.2 a1.4 1.4 0 0 1 -1.4 1.4 h-14.8 a1.4 1.4 0 0 1 -1.4 -1.4 v-2.2 a1.4 1.4 0 0 1 1.4 -1.4 z" />
      <path d="M6.4 16.6 L6.4 20.8M17.6 16.6 L17.6 20.8" />
    </>
  ),
  thermometer: (
    <>
      <path d="M14.4 14.2 L14.4 5.4 a2.4 2.4 0 0 0 -4.8 0 v8.8 a4 4 0 1 0 4.8 0 z" />
      <circle cx="12" cy="17.6" r="1.4" fill="currentColor" stroke="none" />
      <path d="M16.6 7.2 L18.8 7.2M16.6 10.4 L18.8 10.4" />
    </>
  ),
  talk: (
    <>
      <path d="M3.2 6.6 a2 2 0 0 1 2-2 h7.4 a2 2 0 0 1 2 2 v4.4 a2 2 0 0 1 -2 2 h-4.8 L4.6 16 v-3 h-1.4 z" />
      <path d="M12.6 9.4 h6.2 a2 2 0 0 1 2 2 v4.4 a2 2 0 0 1 -2 2 h-1 v2.8 L14.4 17.8" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M5.4 3.4 L5.4 9.2 a4 4 0 0 0 8 0 L13.4 3.4" />
      <path d="M3.8 3.4 L6.6 3.4M12.2 3.4 L15 3.4" />
      <path d="M9.4 13.2 v2.2 a4.2 4.2 0 0 0 8.4 0 v-1.6" />
      <circle cx="18" cy="11.4" r="2.2" />
    </>
  ),
  celebrate: (
    <>
      <path d="M12 3.2 L13.9 8.6 L19.6 8.8 L15.1 12.3 L16.7 17.8 L12 14.6 L7.3 17.8 L8.9 12.3 L4.4 8.8 L10.1 8.6 Z" />
      <path d="M4 20.4 L5.4 19.6M20 20.4 L18.6 19.6M12 20.8 L12 19.4" />
    </>
  ),

  // ---- Stickers ----
  // The four stickers are little characters rather than symbols: each one has
  // a face, because a sticker you earned should look pleased about it.
  "sticker-told": (
    <>
      <path d="M4 5.6 a2 2 0 0 1 2-2 h12 a2 2 0 0 1 2 2 v7.6 a2 2 0 0 1 -2 2 h-7.4 L6 19.2 v-4 h-2 z" />
      <circle cx="9.6" cy="8.2" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="8.2" r="0.85" fill="currentColor" stroke="none" />
      <path d="M9.8 10.9 Q12 12.7 14.2 10.9" />
    </>
  ),
  "sticker-feel": (
    <>
      <path d="M12 20.4 L4.8 13.4 a4.4 4.4 0 0 1 6.2 -6.2 L12 8.2 l1 -1 a4.4 4.4 0 0 1 6.2 6.2 z" />
      <circle cx="9.7" cy="12.1" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.3" cy="12.1" r="0.8" fill="currentColor" stroke="none" />
      <path d="M9.9 14.6 Q12 16.3 14.1 14.6" />
    </>
  ),
  "sticker-map": (
    <>
      <path d="M3.4 6.4 L9 4.2 L15 6.8 L20.6 4.6 L20.6 17.6 L15 19.8 L9 17.2 L3.4 19.4 Z" />
      {/* A dotted route from a starting dot to a star, rather than two fold
          lines: the visit has a beginning and somewhere good at the end. */}
      <path d="M6.8 16.6 Q9.2 12.6 12 13 T14 10.8" strokeDasharray="0.1 3" />
      <circle cx="6.8" cy="16.6" r="1.2" fill="currentColor" stroke="none" />
      <path d="M17.6 9.9 L18.5 11.5 L20.1 12.4 L18.5 13.3 L17.6 14.9 L16.7 13.3 L15.1 12.4 L16.7 11.5 Z" />
    </>
  ),
  "sticker-voice": (
    <>
      <rect x="9" y="2.8" width="6" height="11.2" rx="3" />
      <circle cx="10.7" cy="7" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="13.3" cy="7" r="0.7" fill="currentColor" stroke="none" />
      <path d="M10.8 9.3 Q12 10.4 13.2 9.3" />
      <path d="M5.4 11.4 a6.6 6.6 0 0 0 13.2 0" />
      <path d="M12 18 L12 21.2M8.8 21.2 L15.2 21.2" />
      {/* Two little "it's being heard" sparkles either side of the mic. */}
      <path d="M4.3 4.9 L5.1 6.5 L4.3 8.1 L3.5 6.5 Z" />
      <path d="M19.7 4.9 L20.5 6.5 L19.7 8.1 L18.9 6.5 Z" />
    </>
  ),

  // ---- My Voice hub ----
  "hub-feelings": face(<path d="M8.4 14.4 Q12 17.2 15.6 14.4" />, roundEyes),
  "hub-tell": (
    <>
      <path d="M3.4 6.2 a2 2 0 0 1 2 -2 h13.2 a2 2 0 0 1 2 2 v8.4 a2 2 0 0 1 -2 2 h-9.2 L5.6 20.2 v-3.6 h-0.2 a2 2 0 0 1 -2 -2 z" />
      <path d="M7.6 8.8 L16.4 8.8M7.6 12 L12.8 12" />
    </>
  ),
  "hub-visit": (
    <>
      <path d="M3.6 20.6 L3.6 9.4 L12 3.6 L20.4 9.4 L20.4 20.6 Z" />
      <path d="M12 9.6 L12 15.4M9.1 12.5 L14.9 12.5" />
    </>
  ),
  "hub-stickers": (
    <path d="M12 3.2 L14.3 9.1 L20.6 9.5 L15.7 13.5 L17.3 19.6 L12 16.2 L6.7 19.6 L8.3 13.5 L3.4 9.5 L9.7 9.1 Z" />
  ),

  // ---- Controls ----
  mic: (
    <>
      <rect x="9" y="2.8" width="6" height="11.2" rx="3" />
      <path d="M5.4 11.4 a6.6 6.6 0 0 0 13.2 0" />
      <path d="M12 18 L12 21.2" />
    </>
  ),
  stop: <rect x="5.6" y="5.6" width="12.8" height="12.8" rx="2.4" />,
  speaker: (
    <>
      <path d="M4 9.2 h3.4 L12 5 v14 L7.4 14.8 H4 a1 1 0 0 1 -1 -1 v-3.6 a1 1 0 0 1 1 -1 z" />
      <path d="M15.4 9.4 a3.6 3.6 0 0 1 0 5.2M18 6.8 a7.2 7.2 0 0 1 0 10.4" />
    </>
  ),
  "speaker-off": (
    <>
      <path d="M4 9.2 h3.4 L12 5 v14 L7.4 14.8 H4 a1 1 0 0 1 -1 -1 v-3.6 a1 1 0 0 1 1 -1 z" />
      <path d="M16 9.6 L21 14.4M21 9.6 L16 14.4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.8 12.4 L10.8 15.2 L16.2 9.2" />
    </>
  ),
  save: (
    <>
      <path d="M4.6 5.6 a1.8 1.8 0 0 1 1.8 -1.8 h9.6 L20.2 7.6 v10.8 a1.8 1.8 0 0 1 -1.8 1.8 h-12 a1.8 1.8 0 0 1 -1.8 -1.8 z" />
      <path d="M8 3.8 L8 9 h7 L15 3.8" />
      <path d="M7.6 13.4 h8.8 v6.8 h-8.8 z" />
    </>
  ),
  // Replaces the sparkle emoji on "Refine with AI": a wand with two small
  // glints, which reads as "tidy this up" rather than as decoration.
  refine: (
    <>
      <path d="M14.6 4.6 L19.4 9.4 L9.4 19.4 L4.6 14.6 Z" />
      <path d="M12.4 6.8 L17.2 11.6" />
      <path d="M18.4 2.6 L19 4.4 L20.8 5 L19 5.6 L18.4 7.4 L17.8 5.6 L16 5 L17.8 4.4 Z" />
      <path d="M5.2 3.4 L5.6 4.6 L6.8 5 L5.6 5.4 L5.2 6.6 L4.8 5.4 L3.6 5 L4.8 4.6 Z" />
    </>
  ),
  breath: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="12" cy="12" r="7.6" opacity="0.55" />
      <circle cx="12" cy="12" r="11" opacity="0.28" />
    </>
  ),
};
