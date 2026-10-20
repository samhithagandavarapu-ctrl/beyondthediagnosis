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
  | "face-worst"
  // "Where does it hurt?": what the hurt feels like
  | "pain-sharp"
  | "pain-achy"
  | "pain-burning"
  | "pain-heavy"
  | "pain-cramping"
  | "pain-itchy"
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
  | "breath"
  | "bell"
  | "eye"
  | "eye-off"
  | "chat"
  | "send"
  | "person"
  | "file"
  | "paperclip"
  | "search"
  // Symptom Timeline entry types
  | "tl-change"
  | "tl-skill"
  | "tl-medication"
  | "tl-illness"
  | "tl-test"
  | "tl-life"
  // Practice My Visit: visit types, steps and "what I might notice"
  | "clipboard"
  | "drop"
  | "tooth"
  | "ear"
  | "person-plus"
  | "cuff"
  | "needle"
  | "bandage"
  | "light"
  | "eye-chart"
  | "eye-drops"
  | "headphones"
  | "hand"
  | "card"
  | "lock"
  | "sign-out"
  | "trash"
  | "chevron-right"
  // "Say it my way" cards, All About Me, practice stories
  | "clock"
  | "question"
  | "repeat"
  | "alert"
  | "star"
  | "star-filled"
  | "book"
  | "heart"
  | "plus"
  | "play"
  | "doctor"
  // Symptom Calendar categories
  | "calendar"
  | "moon"
  | "utensils"
  | "toilet"
  | "battery"
  | "shuffle"
  // Feelings (emotions), next to the face scale
  | "face-angry"
  | "face-worried"
  | "face-tired"
  | "face-calm"
  | "skin";

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

const squeezedEyes = (
  <>
    <path d="M7.4 9.2 L10 10.4 L7.4 11.4" />
    <path d="M16.6 9.2 L14 10.4 L16.6 11.4" />
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
  // The pain scale's top face: eyes squeezed shut, an open frown and a tear.
  "face-worst": face(
    <>
      <path d="M8.4 17.2 Q12 12.6 15.6 17.2 Z" />
      <path d="M16.6 12.4 q0.9 1.4 0 2.2 q-0.9 -0.8 0 -2.2 Z" fill="currentColor" />
    </>,
    squeezedEyes
  ),

  // ---- What the hurt feels like ----
  "pain-sharp": <path d="M13.6 2.8 L6.4 13.4 h5.2 l-1.2 7.8 l7.2 -10.6 h-5.2 Z" />,
  "pain-achy": (
    <>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M7.6 7.6 a6.2 6.2 0 0 0 0 8.8 M16.4 7.6 a6.2 6.2 0 0 1 0 8.8" />
      <path d="M4.8 4.8 a10.2 10.2 0 0 0 0 14.4 M19.2 4.8 a10.2 10.2 0 0 1 0 14.4" />
    </>
  ),
  "pain-burning": (
    <>
      <path d="M12 2.8 C12 6 13.2 8.6 11.6 11.4 C13.2 11 14.4 9.8 14.6 7.6 C16 9 17.8 11.2 17.8 14.4 a5.8 5.8 0 0 1 -11.6 0 C6.2 9.4 12 6 12 2.8 Z" />
      <path d="M12 14.6 c-1 1 -1.7 1.9 -1.7 2.9 a1.7 1.7 0 0 0 3.4 0 c0 -1 -0.7 -1.9 -1.7 -2.9 Z" />
    </>
  ),
  "pain-heavy": (
    <>
      <path d="M9.2 7.6 a2.8 2.8 0 0 1 5.6 0" />
      <path d="M7.2 7.6 h9.6 l2.8 11.6 a1 1 0 0 1 -1 1.2 H5.4 a1 1 0 0 1 -1 -1.2 Z" />
      <path d="M12 11.4 v5 M10 14.6 l2 2 l2 -2" />
    </>
  ),
  "pain-cramping": (
    <path d="M12 12.4 a1.4 1.4 0 0 1 1.4 1.4 a2.8 2.8 0 0 1 -2.8 2.8 a4.2 4.2 0 0 1 -4.2 -4.2 a5.6 5.6 0 0 1 5.6 -5.6 a7 7 0 0 1 7 7 a8.4 8.4 0 0 1 -1.6 4.9" />
  ),
  "pain-itchy": (
    <path d="M6.6 3.4 q2 2.1 0 4.3 t0 4.3 t0 4.3 t0 4.3 M12 3.4 q2 2.1 0 4.3 t0 4.3 t0 4.3 t0 4.3 M17.4 3.4 q2 2.1 0 4.3 t0 4.3 t0 4.3 t0 4.3" />
  ),

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
  bell: (
    <>
      <path d="M6 16.4 V11 a6 6 0 0 1 12 0 v5.4 l1.6 1.8 H4.4 Z" />
      <path d="M10 20.4 a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  // Show / hide a password: an open eye, and the same eye struck through.
  eye: (
    <>
      <path d="M2.6 12 C5 7.4 8.4 5.2 12 5.2 S19 7.4 21.4 12 C19 16.6 15.6 18.8 12 18.8 S5 16.6 2.6 12 Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M2.6 12 C5 7.4 8.4 5.2 12 5.2 S19 7.4 21.4 12 C19 16.6 15.6 18.8 12 18.8 S5 16.6 2.6 12 Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M4 3.6 L20 20.4" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5.6 a1.8 1.8 0 0 1 1.8 -1.8 h12.4 a1.8 1.8 0 0 1 1.8 1.8 v8.8 a1.8 1.8 0 0 1 -1.8 1.8 H10 l-4.4 3.8 v-3.8 h0.2 A1.8 1.8 0 0 1 4 14.4 Z" />
      <path d="M8 8.6 h8M8 11.8 h5" />
    </>
  ),
  file: (
    <>
      <path d="M6 3.4 h8 l4.6 4.6 V20 a0.8 0.8 0 0 1 -0.8 0.8 H6 a0.8 0.8 0 0 1 -0.8 -0.8 V4.2 A0.8 0.8 0 0 1 6 3.4 Z" />
      <path d="M13.6 3.6 V8.4 h4.8" />
      <path d="M8.6 13 h6.8M8.6 16.4 h4.6" />
    </>
  ),
  paperclip: (
    <path d="M19.2 11.4 l-7.4 7.4 a4.4 4.4 0 0 1 -6.2 -6.2 l8 -8 a2.9 2.9 0 0 1 4.1 4.1 l-7.9 7.9 a1.4 1.4 0 0 1 -2 -2 l7.1 -7.1" />
  ),
  person: (
    <>
      <circle cx="12" cy="8.2" r="3.8" />
      <path d="M4.6 20.2 a7.4 7.4 0 0 1 14.8 0" />
    </>
  ),
  search: (
    <>
      <circle cx="10.6" cy="10.6" r="6.4" />
      <path d="M15.4 15.4 L20.4 20.4" />
    </>
  ),
  send: (
    <>
      <path d="M3.4 11.6 L20.4 4 L14.6 20.6 L11.4 13 Z" />
      <path d="M11.4 13 L20.4 4" />
    </>
  ),

  // ---- Symptom Timeline ----
  // A pulse line: something changed.
  "tl-change": <path d="M2.8 12.6 h4.2 l2.2 -5.4 l3.6 10.6 l2.4 -6.8 l1.6 1.6 h4.4" />,
  // A step with a downward arrow: an ability that slipped.
  "tl-skill": (
    <>
      <path d="M3.6 20 h5 v-4.6 h5 v-4.6 h5 V6" />
      <path d="M6.4 4.4 v6.8M3.8 8.6 l2.6 2.6 l2.6 -2.6" />
    </>
  ),
  // A capsule.
  "tl-medication": (
    <>
      <rect x="2.8" y="8.6" width="18.4" height="6.8" rx="3.4" transform="rotate(-40 12 12)" />
      <path d="M9.4 9.2 L14.6 14.8" />
    </>
  ),
  // A first-aid cross in a rounded square.
  "tl-illness": (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3.6" />
      <path d="M12 7.8 v8.4M7.8 12 h8.4" />
    </>
  ),
  // A clipboard with a tick.
  "tl-test": (
    <>
      <rect x="5" y="4.6" width="14" height="16.2" rx="2.2" />
      <path d="M9.2 4.6 V3.4 h5.6 v1.2" />
      <path d="M8.8 13 L11 15.2 L15.4 10.6" />
    </>
  ),
  // A house.
  "tl-life": (
    <>
      <path d="M3.6 11 L12 4 L20.4 11" />
      <path d="M6 9.4 V20 h12 V9.4" />
      <path d="M10 20 v-5.4 h4 V20" />
    </>
  ),
  // ---- Practice My Visit ----
  // A clipboard with lines: the check-in form.
  lock: (
    <>
      <rect x="5" y="10.6" width="14" height="10" rx="2.2" />
      <path d="M8.4 10.6 V7.6 a3.6 3.6 0 0 1 7.2 0 v3" />
      <path d="M12 14.6 v2" />
    </>
  ),
  "sign-out": (
    <>
      <path d="M13.6 4.4 H6.6 a1.8 1.8 0 0 0 -1.8 1.8 v11.6 a1.8 1.8 0 0 0 1.8 1.8 h7" />
      <path d="M10.4 12 H20M16.6 8.4 L20.2 12 L16.6 15.6" />
    </>
  ),
  trash: (
    <>
      <path d="M4.6 6.8 h14.8M9.6 6.8 V4.8 h4.8 v2" />
      <path d="M6.6 6.8 l0.9 12.6 a1.6 1.6 0 0 0 1.6 1.4 h5.8 a1.6 1.6 0 0 0 1.6 -1.4 l0.9 -12.6" />
      <path d="M10.2 10.6 v6M13.8 10.6 v6" />
    </>
  ),
  "chevron-right": <path d="M9.4 5.6 L15.8 12 L9.4 18.4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7 V12 L15.4 14.2" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M9.4 9.6 a2.6 2.6 0 1 1 3.8 2.3 c-0.8 0.4 -1.2 1 -1.2 1.9 v0.4" />
      <circle cx="12" cy="16.9" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  repeat: (
    <>
      <path d="M4.6 11 a7 7 0 0 1 12.4 -4.4 L18.8 8.4" />
      <path d="M19 4 V8.6 H14.4" />
      <path d="M19.4 13 a7 7 0 0 1 -12.4 4.4 L5.2 15.6" />
      <path d="M5 20 V15.4 H9.6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.4 L21.2 19.4 H2.8 Z" />
      <path d="M12 9.6 V14" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  star: <path d="M12 3.4 l2.6 5.4 l5.9 0.8 l-4.3 4.1 l1.1 5.8 L12 16.7 l-5.3 2.8 l1.1 -5.8 l-4.3 -4.1 l5.9 -0.8 Z" />,
  "star-filled": (
    <path
      d="M12 3.4 l2.6 5.4 l5.9 0.8 l-4.3 4.1 l1.1 5.8 L12 16.7 l-5.3 2.8 l1.1 -5.8 l-4.3 -4.1 l5.9 -0.8 Z"
      fill="currentColor"
    />
  ),
  book: (
    <>
      <path d="M12 6.4 C10 5 7 4.6 3.6 5 V18.4 C7 18 10 18.4 12 19.8 C14 18.4 17 18 20.4 18.4 V5 C17 4.6 14 5 12 6.4 Z" />
      <path d="M12 6.4 V19.8" />
    </>
  ),
  heart: (
    <path d="M12 19.6 C6.4 15.6 3.4 12.6 3.4 9.2 a4.2 4.2 0 0 1 8.6 -1.8 a4.2 4.2 0 0 1 8.6 1.8 c0 3.4 -3 6.4 -8.6 10.4 Z" />
  ),
  plus: <path d="M12 5 V19 M5 12 H19" />,
  play: <path d="M8 5.2 L18.4 12 L8 18.8 Z" />,
  doctor: (
    <>
      <circle cx="12" cy="7.4" r="3.6" />
      <path d="M4.8 20.4 c0 -4.2 3.2 -6.8 7.2 -6.8 s7.2 2.6 7.2 6.8" />
      <path d="M9.2 14.2 v2.4 a2.8 2.8 0 0 0 5.6 0 v-2.4" />
      <path d="M10.6 5.2 h2.8" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.6" width="14" height="16.2" rx="2.2" />
      <path d="M9.2 4.6 V3.4 h5.6 v1.2" />
      <path d="M8.6 10 h6.8M8.6 13.4 h6.8M8.6 16.8 h4" />
    </>
  ),
  // A single drop: a blood test.
  drop: <path d="M12 3.2 C12 3.2 5.8 10.2 5.8 14.4 a6.2 6.2 0 0 0 12.4 0 C18.2 10.2 12 3.2 12 3.2 Z" />,
  tooth: (
    <path d="M7.4 3.8 c-2.4 0 -3.8 2 -3.6 4.6 c0.3 3.4 1.6 4.8 2.2 7.6 c0.5 2.6 1 4.6 2.2 4.6 c1.4 0 1.4 -4.4 3.8 -4.4 s2.4 4.4 3.8 4.4 c1.2 0 1.7 -2 2.2 -4.6 c0.6 -2.8 1.9 -4.2 2.2 -7.6 c0.2 -2.6 -1.2 -4.6 -3.6 -4.6 c-1.8 0 -2.8 1 -4.6 1 s-2.8 -1 -4.6 -1 z" />
  ),
  ear: (
    <>
      <path d="M7 9.6 a5.4 5.4 0 0 1 10.8 0 c0 3.4 -3 4.4 -3.4 7 c-0.4 2.4 -2 3.8 -4 3.8 a3.2 3.2 0 0 1 -3.2 -3" />
      <path d="M10 9.8 a2.4 2.4 0 0 1 4.8 0 c0 1.4 -1.6 2 -1.6 3.4" />
    </>
  ),
  "person-plus": (
    <>
      <circle cx="10" cy="8.2" r="3.8" />
      <path d="M2.8 20.2 a7.2 7.2 0 0 1 12.6 -4.8" />
      <path d="M18.4 13.4 v6.4M15.2 16.6 h6.4" />
    </>
  ),
  // A blood pressure cuff around an arm, with its bulb.
  cuff: (
    <>
      <path d="M2.8 9.4 h18.4M2.8 14.6 h18.4" />
      <rect x="8" y="7.4" width="8" height="9.2" rx="1.6" />
      <path d="M12 16.6 v2.2" />
      <circle cx="12" cy="20.2" r="1.4" />
    </>
  ),
  needle: (
    <>
      <path d="M14.6 3.6 L20.4 9.4M17.5 6.5 L9 15 L6.2 15.8 L7 13 L15.5 4.5" />
      <path d="M6.6 15.4 L3.6 18.4M10.8 9.6 l1.4 1.4M12.6 7.8 l1.4 1.4" />
    </>
  ),
  bandage: (
    <>
      <rect x="2.8" y="8.4" width="18.4" height="7.2" rx="3.6" transform="rotate(-30 12 12)" />
      <rect x="9" y="9.4" width="6" height="5.2" rx="1" transform="rotate(-30 12 12)" />
    </>
  ),
  // A small exam light with its beam.
  light: (
    <>
      <rect x="3.4" y="9.6" width="9" height="4.8" rx="1.6" />
      <path d="M12.4 10.4 L15 9 v6 l-2.6 -1.4" />
      <path d="M17.4 8 L20.6 6.4M17.8 12 h3.4M17.4 16 l3.2 1.6" />
    </>
  ),
  // An eye chart: big letter on top, smaller lines below.
  "eye-chart": (
    <>
      <rect x="5" y="3.4" width="14" height="17.2" rx="2" />
      <path d="M10 6.4 h4M12 6.4 v4" />
      <path d="M8.6 13.4 h6.8M9.4 16.4 h5.2" />
    </>
  ),
  "eye-drops": (
    <>
      <path d="M9.6 2.8 h4.8 v3.4 l1.4 1.8 v6.4 a1.6 1.6 0 0 1 -1.6 1.6 h-4.4 a1.6 1.6 0 0 1 -1.6 -1.6 V8 l1.4 -1.8 z" />
      <path d="M12 18.2 c0 0 -1.6 1.8 -1.6 2.6 a1.6 1.6 0 0 0 3.2 0 c0 -0.8 -1.6 -2.6 -1.6 -2.6 z" />
    </>
  ),
  headphones: (
    <>
      <path d="M4.4 15 v-3 a7.6 7.6 0 0 1 15.2 0 v3" />
      <rect x="3.2" y="13.6" width="4.4" height="6.6" rx="1.6" />
      <rect x="16.4" y="13.6" width="4.4" height="6.6" rx="1.6" />
    </>
  ),
  // An open hand: something I might feel.
  hand: (
    <>
      <path d="M8 12.6 V5.4 a1.4 1.4 0 0 1 2.8 0 v6" />
      <path d="M10.8 11 V4.2 a1.4 1.4 0 0 1 2.8 0 V11" />
      <path d="M13.6 11.2 V5.6 a1.4 1.4 0 0 1 2.8 0 v6.8" />
      <path d="M16.4 9.8 a1.4 1.4 0 0 1 2.8 0 v4 a6.8 6.8 0 0 1 -6.8 6.8 h-0.6 a6 6 0 0 1 -4.6 -2.2 l-3 -3.8 a1.4 1.4 0 0 1 2.2 -1.8 L8 14.4" />
    </>
  ),
  // A card held up to show someone.
  card: (
    <>
      <rect x="3.2" y="5.6" width="17.6" height="12.8" rx="2.2" />
      <path d="M7 10 h10M7 13.6 h6" />
    </>
  ),
  // ---- Symptom Calendar ----
  calendar: (
    <>
      <rect x="3.6" y="5" width="16.8" height="15.4" rx="2.2" />
      <path d="M3.6 9.8 H20.4M8 3 V6.6M16 3 V6.6" />
      <path d="M7.6 13.4 h1.6M11.2 13.4 h1.6M14.8 13.4 h1.6M7.6 16.6 h1.6M11.2 16.6 h1.6" />
    </>
  ),
  moon: <path d="M19.6 14.6 A8 8 0 1 1 9.4 4.4 a6.4 6.4 0 0 0 10.2 10.2 Z" />,
  utensils: (
    <>
      <path d="M7 3.2 V9.6 a2.2 2.2 0 0 0 4.4 0 V3.2M9.2 3.2 V20.8" />
      <path d="M17.2 20.8 V3.4 c-2.4 0.8 -3.6 3.4 -3.6 6.4 c0 2 1 3.2 3.6 3.6" />
    </>
  ),
  toilet: (
    <>
      <path d="M6.4 3.4 h5.2 v7.2 h-5.2 Z" />
      <path d="M4.4 10.6 h15.2 a7.6 5.4 0 0 1 -15.2 0 Z" />
      <path d="M8.4 15.6 L7.6 20.6 h8.8 L15.6 15.6" />
    </>
  ),
  battery: (
    <>
      <rect x="2.8" y="7.4" width="16.4" height="9.2" rx="2" />
      <path d="M21.2 10.6 V13.4" />
      <path d="M5.8 10.4 V13.6M8.8 10.4 V13.6" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3.4 7.4 h3.4 c4.6 0 5.8 9.2 10.4 9.2 h3.4M17.6 13.6 l3 3 l-3 3" />
      <path d="M3.4 16.6 h3.4 c1.4 0 2.4 -0.8 3.2 -2M13.8 9.4 c0.8 -1.2 1.8 -2 3.2 -2 h3.6M17.6 4.4 l3 3 l-3 3" />
    </>
  ),
  "face-angry": face(
    <>
      <path d="M8.6 16.4 Q12 14 15.4 16.4" />
      <path d="M7.4 8.2 L10.4 9.4M16.6 8.2 L13.6 9.4" />
    </>,
    roundEyes
  ),
  "face-worried": face(<path d="M9 16 q1.5 -1.4 3 0 t3 0" />, worriedEyes),
  "face-tired": face(
    <>
      <path d="M9.6 15.8 h4.8" />
      <path d="M17.4 5.6 h2.4 l-2.4 2.6 h2.4" />
    </>,
    squintEyes
  ),
  // A face with a few spots on one cheek: "My skin".
  skin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9.4 15.4 Q12 17 14.6 15.4" />
      <circle cx="16.6" cy="13.4" r="0.7" />
      <circle cx="18" cy="15.4" r="0.55" />
      <circle cx="15.8" cy="15.6" r="0.5" />
    </>
  ),
  "face-calm": face(
    <path d="M8.6 14.6 Q12 16.8 15.4 14.6" />,
    <>
      <path d="M7.6 10.4 q1.4 1.2 2.8 0" />
      <path d="M13.6 10.4 q1.4 1.2 2.8 0" />
    </>
  ),
};
