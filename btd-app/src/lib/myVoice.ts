// Structured data + vocabulary for the "My Voice" self-advocacy feature.
//
// Everything the check-in and sentence builder produce is stored as data (not
// just visual state) so it can be merged into the existing jsPDF Appointment
// Prep export without re-deriving anything from the UI.

export type ReadingLevel = "icon" | "icon-text" | "full";

export const READING_LEVELS: {
  id: ReadingLevel;
  label: string;
  description: string;
}[] = [
  {
    id: "icon",
    label: "Pictures only",
    description: "Tap a picture. No reading needed to finish anything.",
  },
  {
    id: "icon-text",
    label: "Pictures and short words",
    description: "Pictures with a word or two next to them.",
  },
  {
    id: "full",
    label: "Full sentences",
    description: "Closer to a normal form, in plain language.",
  },
];

export type FeelingId = "great" | "good" | "okay" | "bad" | "awful";

export type Feeling = {
  id: FeelingId;
  face: string;
  /** Short word used at the icon+text tier. */
  short: string;
  /** Full-text label, also what gets read aloud. */
  label: string;
  /** How it reads inside "I feel ___ in my ___". */
  sentence: string;
  tone: string;
};

export const FEELINGS: Feeling[] = [
  { id: "great", face: "😀", short: "Great", label: "I feel great", sentence: "great", tone: "bg-sky-tint" },
  { id: "good", face: "🙂", short: "Good", label: "I feel good", sentence: "okay", tone: "bg-sky-tint" },
  { id: "okay", face: "😐", short: "So-so", label: "I feel so-so", sentence: "not great", tone: "bg-butter/40" },
  { id: "bad", face: "🙁", short: "Bad", label: "I feel bad", sentence: "bad", tone: "bg-coral/30" },
  { id: "awful", face: "😣", short: "Really bad", label: "I feel really bad", sentence: "really bad", tone: "bg-coral/50" },
];

export type BodyPartId =
  | "head"
  | "eyes"
  | "ears"
  | "mouth"
  | "throat"
  | "chest"
  | "tummy"
  | "back"
  | "arms"
  | "hands"
  | "legs"
  | "feet"
  | "all-over";

export type BodyPart = {
  id: BodyPartId;
  short: string;
  label: string;
  /** How it reads inside "in my ___". */
  sentence: string;
  /** A picture for the parts that get their own button. */
  icon?: string;
  /** Hotspot placement on the outline, as percentages of its box. Parts with
   *  no position are the ones a front-facing outline can't show clearly
   *  (eyes, ears, mouth, back) or that aren't one place at all (all over) —
   *  those become picture buttons under the map instead of overlapping
   *  hotspots too small to tap apart. */
  x?: number;
  y?: number;
  /** Hotspot size as a percentage of the outline's width. */
  size?: number;
};

export const BODY_PARTS: BodyPart[] = [
  { id: "head", short: "Head", label: "My head", sentence: "head", icon: "🤕", x: 50, y: 11, size: 28 },
  { id: "throat", short: "Throat", label: "My throat", sentence: "throat", icon: "😷", x: 50, y: 21.5, size: 12 },
  { id: "chest", short: "Chest", label: "My chest", sentence: "chest", icon: "🫁", x: 50, y: 31, size: 26 },
  { id: "tummy", short: "Tummy", label: "My tummy", sentence: "tummy", icon: "🤢", x: 50, y: 45, size: 26 },
  { id: "arms", short: "Arms", label: "My arms", sentence: "arms", icon: "💪", x: 20, y: 37, size: 14 },
  { id: "hands", short: "Hands", label: "My hands", sentence: "hands", icon: "✋", x: 82, y: 47, size: 14 },
  { id: "legs", short: "Legs", label: "My legs", sentence: "legs", icon: "🦵", x: 41, y: 62, size: 16 },
  { id: "feet", short: "Feet", label: "My feet", sentence: "feet", icon: "🦶", x: 59, y: 93.5, size: 15 },
  { id: "eyes", short: "Eyes", label: "My eyes", sentence: "eyes", icon: "👀" },
  { id: "ears", short: "Ears", label: "My ears", sentence: "ears", icon: "👂" },
  { id: "mouth", short: "Mouth", label: "My mouth or teeth", sentence: "mouth", icon: "👄" },
  { id: "back", short: "Back", label: "My back", sentence: "back", icon: "🔙" },
  { id: "all-over", short: "All over", label: "All over my body", sentence: "whole body", icon: "🧍" },
];

/** Parts drawn as hotspots on the outline. */
export const MAPPED_BODY_PARTS = BODY_PARTS.filter(
  (p) => p.x !== undefined && p.y !== undefined && p.size !== undefined
);

/** Parts that get a picture button under the outline instead. */
export const OFF_MAP_BODY_PARTS = BODY_PARTS.filter((p) => p.x === undefined);

export function bodyPart(id: BodyPartId): BodyPart {
  return BODY_PARTS.find((p) => p.id === id) ?? BODY_PARTS[0];
}

export function feeling(id: FeelingId): Feeling {
  return FEELINGS.find((f) => f.id === id) ?? FEELINGS[2];
}

export type SinceId = "today" | "few-days" | "week-plus";

export type SinceOption = {
  id: SinceId;
  icon: string;
  short: string;
  label: string;
  /** How it reads inside "since ___". */
  sentence: string;
};

export const SINCE_OPTIONS: SinceOption[] = [
  { id: "today", icon: "☀️", short: "Today", label: "Since today", sentence: "today" },
  { id: "few-days", icon: "📆", short: "A few days", label: "Since a few days ago", sentence: "a few days ago" },
  { id: "week-plus", icon: "🗓️", short: "A week or more", label: "Since a week or more ago", sentence: "a week or more ago" },
];

export function sinceOption(id: SinceId): SinceOption {
  return SINCE_OPTIONS.find((s) => s.id === id) ?? SINCE_OPTIONS[0];
}

/** One completed check-in / sentence session. Plain data on purpose. */
export type CheckIn = {
  createdAt: string;
  overall: FeelingId | null;
  bodyParts: BodyPartId[];
  since: SinceId | null;
  /** Optional typed note — never required to finish a check-in. */
  note: string;
  /** True if they recorded a voice note. The audio itself stays in the tab
   *  and is never persisted. */
  hasVoiceNote: boolean;
};

export function emptyCheckIn(): CheckIn {
  return {
    createdAt: new Date().toISOString(),
    overall: null,
    bodyParts: [],
    since: null,
    note: "",
    hasVoiceNote: false,
  };
}

export function checkInHasContent(c: CheckIn): boolean {
  return !!c.overall || c.bodyParts.length > 0 || !!c.since || !!c.note.trim() || c.hasVoiceNote;
}

function listOut(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** The tap-to-build sentence: "I feel [face] in my [part] since [when]". */
export function buildSentence(c: CheckIn): string {
  if (!c.overall && c.bodyParts.length === 0) return "";
  const how = c.overall ? feeling(c.overall).sentence : "not right";
  const where = c.bodyParts.length
    ? ` in my ${listOut(c.bodyParts.map((id) => bodyPart(id).sentence))}`
    : "";
  const when = c.since ? ` since ${sinceOption(c.since).sentence}` : "";
  return `I feel ${how}${where}${when}.`;
}

/** Everything the check-in knows, as lines the PDF/summary can print. */
export function checkInLines(c: CheckIn): string[] {
  const lines: string[] = [];
  const sentence = buildSentence(c);
  if (sentence) lines.push(sentence);
  if (c.overall) lines.push(`Overall today: ${feeling(c.overall).label.replace(/^I feel /, "")}.`);
  if (c.note.trim()) lines.push(c.note.trim());
  if (c.hasVoiceNote) lines.push("They also recorded a voice note about this.");
  return lines;
}

// ---- Visit walkthrough ----

export type WalkthroughCard = {
  id: string;
  icon: string;
  short: string;
  title: string;
  body: string;
  /** Cards marked false are dropped at the pictures-only tier, so that tier
   *  gets a shorter, simpler sequence. */
  inShortSequence: boolean;
};

export const WALKTHROUGH_CARDS: WalkthroughCard[] = [
  {
    id: "arrive",
    icon: "🚪",
    short: "I arrive",
    title: "First, I arrive",
    body: "We walk in and tell the front desk my name. Someone will say hello.",
    inShortSequence: true,
  },
  {
    id: "wait",
    icon: "🪑",
    short: "I wait",
    title: "Then I wait",
    body: "We sit in the waiting room. I can bring something I like. Waiting is the boring part — that's okay.",
    inShortSequence: true,
  },
  {
    id: "vitals",
    icon: "🌡️",
    short: "They check me",
    title: "A nurse checks a few things",
    body: "They may check my height, my weight, and how warm I am. It doesn't hurt.",
    inShortSequence: false,
  },
  {
    id: "talk",
    icon: "🗣️",
    short: "I talk",
    title: "The doctor talks with me",
    body: "The doctor asks how I feel. I can tell them, or show them what I made here. They should talk to me, not only to the person who came with me.",
    inShortSequence: true,
  },
  {
    id: "exam",
    icon: "🩺",
    short: "Maybe a shot",
    title: "There might be an exam or a shot",
    body: "The doctor may listen to my chest or look in my ears. Sometimes there is a shot. It's quick. I can ask them to count to three first.",
    inShortSequence: true,
  },
  {
    id: "done",
    icon: "🎉",
    short: "I'm done",
    title: "Then I'm done",
    body: "We say goodbye and go home. I did it.",
    inShortSequence: true,
  },
];

export function walkthroughCards(level: ReadingLevel): WalkthroughCard[] {
  return level === "icon"
    ? WALKTHROUGH_CARDS.filter((c) => c.inShortSequence)
    : WALKTHROUGH_CARDS;
}

// ---- Stickers ----

export type StickerId = "told-my-doctor" | "said-how-i-feel" | "knows-the-visit" | "used-my-voice";

export type StickerKind = {
  id: StickerId;
  art: string;
  label: string;
  /** Why it was earned — phrased as the action, never as a streak. */
  earnedFor: string;
};

export const STICKER_KINDS: StickerKind[] = [
  {
    id: "told-my-doctor",
    art: "🗣️",
    label: "I told my doctor something",
    earnedFor: "You made a sentence to tell your doctor. That is self-advocacy.",
  },
  {
    id: "said-how-i-feel",
    art: "💙",
    label: "I said how I feel",
    earnedFor: "You finished a check-in and said how your body feels.",
  },
  {
    id: "knows-the-visit",
    art: "🗺️",
    label: "I know what happens at a visit",
    earnedFor: "You looked through the whole visit, start to finish.",
  },
  {
    id: "used-my-voice",
    art: "🎤",
    label: "I used my own voice",
    earnedFor: "You recorded your voice instead of typing.",
  },
];

export function stickerKind(id: StickerId): StickerKind {
  return STICKER_KINDS.find((s) => s.id === id) ?? STICKER_KINDS[0];
}

export type EarnedSticker = {
  id: StickerId;
  at: string;
};
