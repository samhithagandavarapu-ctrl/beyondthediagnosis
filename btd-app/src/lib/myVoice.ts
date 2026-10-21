// Structured data + vocabulary for the "My Voice" self-advocacy feature.
//
// Everything the check-in and sentence builder produce is stored as data (not
// just visual state) so it can be merged into the existing jsPDF Appointment
// Prep export without re-deriving anything from the UI.

import type { IconName } from "../components/icons/Icon";
import { EMOTIONS, type EmotionId } from "./calendar";

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
  icon: IconName;
  /** Short word used at the icon+text tier. */
  short: string;
  /** Full-text label, also what gets read aloud. */
  label: string;
  /** How it reads inside "I feel ___ in my ___". */
  sentence: string;
  tone: string;
};

export const FEELINGS: Feeling[] = [
  { id: "great", icon: "face-great", short: "Great", label: "I feel great", sentence: "great", tone: "bg-sky-tint" },
  { id: "good", icon: "face-good", short: "Good", label: "I feel good", sentence: "okay", tone: "bg-sky-tint" },
  { id: "okay", icon: "face-okay", short: "So-so", label: "I feel so-so", sentence: "not great", tone: "bg-butter/40" },
  { id: "bad", icon: "face-bad", short: "Bad", label: "I feel bad", sentence: "bad", tone: "bg-coral/30" },
  { id: "awful", icon: "face-awful", short: "Really bad", label: "I feel really bad", sentence: "really bad", tone: "bg-coral/50" },
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
  { id: "head", short: "Head", label: "My head", sentence: "head", x: 50, y: 11, size: 28 },
  { id: "throat", short: "Throat", label: "My throat", sentence: "throat", x: 50, y: 21.5, size: 12 },
  { id: "chest", short: "Chest", label: "My chest", sentence: "chest", x: 50, y: 31, size: 26 },
  { id: "tummy", short: "Tummy", label: "My tummy", sentence: "tummy", x: 50, y: 45, size: 26 },
  { id: "arms", short: "Arms", label: "My arms", sentence: "arms", x: 20, y: 37, size: 14 },
  { id: "hands", short: "Hands", label: "My hands", sentence: "hands", x: 82, y: 47, size: 14 },
  { id: "legs", short: "Legs", label: "My legs", sentence: "legs", x: 41, y: 62, size: 16 },
  { id: "feet", short: "Feet", label: "My feet", sentence: "feet", x: 59, y: 93.5, size: 15 },
  { id: "eyes", short: "Eyes", label: "My eyes", sentence: "eyes" },
  { id: "ears", short: "Ears", label: "My ears", sentence: "ears" },
  { id: "mouth", short: "Mouth", label: "My mouth or teeth", sentence: "mouth" },
  { id: "back", short: "Back", label: "My back", sentence: "back" },
  { id: "all-over", short: "All over", label: "All over my body", sentence: "whole body" },
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
  icon: IconName;
  short: string;
  label: string;
  /** How it reads inside "since ___". */
  sentence: string;
};

export const SINCE_OPTIONS: SinceOption[] = [
  { id: "today", icon: "since-today", short: "Today", label: "Since today", sentence: "today" },
  { id: "few-days", icon: "since-few-days", short: "A few days", label: "Since a few days ago", sentence: "a few days ago" },
  { id: "week-plus", icon: "since-week", short: "A week or more", label: "Since a week or more ago", sentence: "a week or more ago" },
];

export function sinceOption(id: SinceId): SinceOption {
  return SINCE_OPTIONS.find((s) => s.id === id) ?? SINCE_OPTIONS[0];
}

/** One check-in: everything said in one sitting — how they feel, where it
 *  hurts, since when, and anything else — saved together as one dated entry
 *  in their list of check-ins (see lib/checkIns.ts). Plain data on purpose. */
export type CheckIn = {
  id: string;
  createdAt: string;
  /** Set when an old check-in is opened and changed. */
  updatedAt?: string;
  overall: FeelingId | null;
  /** Simple body parts. Only Practice My Visit and check-ins made before the
   *  body map was part of the check-in use these; new ones use `pain`. */
  bodyParts: BodyPartId[];
  /** "Where does it hurt?": each place, how it feels, and how bad. */
  pain?: PainSpot[];
  /** "Any feelings?": the emotion faces, after the body face. */
  feelings?: EmotionId[];
  /** "Just for me": linked grown-ups don't see it. */
  private?: boolean;
  /** Its calendar entries (see lib/checkIns.ts), once saved. */
  entryIds?: { mood?: string; pain?: string };
  since: SinceId | null;
  /** Optional typed note — never required to finish a check-in. */
  note: string;
  /** True if they recorded a voice note. The audio itself stays in the tab
   *  and is never persisted. */
  hasVoiceNote: boolean;
  /** Sentences from Practice My Visit that the person said yes to putting on
   *  their doctor sheet. Printed as-is, first, in place of the built sentence. */
  ownWords?: string[];
};

export function emptyCheckIn(): CheckIn {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    overall: null,
    bodyParts: [],
    pain: [],
    since: null,
    note: "",
    hasVoiceNote: false,
  };
}

export function checkInHasContent(c: CheckIn): boolean {
  return (
    !!c.ownWords?.length ||
    !!c.overall ||
    !!c.feelings?.length ||
    c.bodyParts.length > 0 ||
    !!c.pain?.length ||
    !!c.since ||
    !!c.note.trim() ||
    c.hasVoiceNote
  );
}

/** Check-ins saved before they had ids or a body map, made whole. */
export function normalizeCheckIn(c: Partial<CheckIn> & { createdAt: string }): CheckIn {
  return {
    ...emptyCheckIn(),
    ...c,
    id: c.id || crypto.randomUUID(),
    bodyParts: c.bodyParts ?? [],
    pain: c.pain ?? [],
    feelings: c.feelings ?? [],
    note: c.note ?? "",
  };
}

/** Newest first. */
export function sortCheckIns(list: CheckIn[]): CheckIn[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function listOut(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** What the check-in says, in their voice: "I feel bad. My lower belly
 *  hurts. It feels crampy… It started a few days ago." */
export function checkInSentences(c: CheckIn): string[] {
  if (c.ownWords?.length) return c.ownWords;
  const out: string[] = [];
  const where = c.bodyParts.length
    ? ` in my ${listOut(c.bodyParts.map((id) => bodyPart(id).sentence))}`
    : "";
  if (c.overall || where) {
    out.push(`I feel ${c.overall ? feeling(c.overall).sentence : "not right"}${where}.`);
  }
  const feelings = (c.feelings ?? []).filter((f) => f !== "dont-know" && f !== "mood-swings");
  if (feelings.length) {
    out.push(`I feel ${listOut(feelings.map((f) => EMOTIONS.find((e) => e.id === f)!.label.toLowerCase()))}.`);
  } else if (c.feelings?.includes("dont-know")) {
    out.push("I don't know how I feel.");
  }
  if (c.feelings?.includes("mood-swings")) out.push("My mood has been going up and down.");
  out.push(...(c.pain ?? []).map(painSpotSentence));
  if (c.since) out.push(`It started ${sinceOption(c.since).sentence}.`);
  return out;
}

export function buildSentence(c: CheckIn): string {
  return checkInSentences(c).join(" ");
}

/** "Oct 9: So-so  ·  Oct 14: Good  ·  Oct 20: Bad", oldest first, for the
 *  printed summary. Empty unless at least two check-ins have a face. */
export function feelingsOverTime(list: CheckIn[]): string {
  const withFace = list
    .filter((c) => c.overall)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (withFace.length < 2) return "";
  return withFace
    .map((c) => {
      const day = new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return `${day}: ${feeling(c.overall!).short}`;
    })
    .join("  ·  ");
}

/** Everything the check-in knows, as lines the PDF/summary can print. */
export function checkInLines(c: CheckIn): string[] {
  const lines = checkInSentences(c);
  // Their own words from Practice My Visit don't say how they feel overall.
  if (c.ownWords?.length && c.overall) {
    lines.push(`Overall today: ${feeling(c.overall).label.replace(/^I feel /, "")}.`);
  }
  if (c.note.trim()) lines.push(c.note.trim());
  if (c.hasVoiceNote) lines.push("They also recorded a voice note about this.");
  return lines;
}

// ---- Visit walkthrough ----

export type WalkthroughCard = {
  id: string;
  icon: IconName;
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
    icon: "door",
    short: "I arrive",
    title: "First, I arrive",
    body: "We walk in and tell the front desk my name. Someone will say hello.",
    inShortSequence: true,
  },
  {
    id: "wait",
    icon: "chair",
    short: "I wait",
    title: "Then I wait",
    body: "We sit in the waiting room. I can bring something I like. Waiting is the boring part — that's okay.",
    inShortSequence: true,
  },
  {
    id: "vitals",
    icon: "thermometer",
    short: "They check me",
    title: "A nurse checks a few things",
    body: "They may check my height, my weight, and how warm I am. It doesn't hurt.",
    inShortSequence: false,
  },
  {
    id: "talk",
    icon: "talk",
    short: "I talk",
    title: "The doctor talks with me",
    body: "The doctor asks how I feel. I can tell them, or show them what I made here. They should talk to me, not only to the person who came with me.",
    inShortSequence: true,
  },
  {
    id: "exam",
    icon: "stethoscope",
    short: "Maybe a shot",
    title: "There might be an exam or a shot",
    body: "The doctor may listen to my chest or look in my ears. Sometimes there is a shot. It's quick. I can ask them to count to three first.",
    inShortSequence: true,
  },
  {
    id: "done",
    icon: "celebrate",
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

export type StickerId =
  | "told-my-doctor"
  | "said-how-i-feel"
  | "knows-the-visit"
  | "used-my-voice"
  | "practiced-my-visit"
  | "logged-my-day";

export type StickerKind = {
  id: StickerId;
  art: IconName;
  label: string;
  /** Why it was earned — phrased as the action, never as a streak. */
  earnedFor: string;
};

export const STICKER_KINDS: StickerKind[] = [
  {
    id: "told-my-doctor",
    art: "sticker-told",
    label: "I told my doctor something",
    earnedFor: "You made a sentence to tell your doctor. That is self-advocacy.",
  },
  {
    id: "said-how-i-feel",
    art: "sticker-feel",
    label: "I said how I feel",
    earnedFor: "You finished a check-in and said how your body feels.",
  },
  {
    id: "knows-the-visit",
    art: "sticker-map",
    label: "I know what happens at a visit",
    earnedFor: "You looked through the whole visit, start to finish.",
  },
  {
    id: "used-my-voice",
    art: "sticker-voice",
    label: "I used my own voice",
    earnedFor: "You recorded your voice instead of typing.",
  },
  {
    id: "practiced-my-visit",
    art: "sticker-map",
    label: "I practiced my visit",
    earnedFor: "You practiced your visit from start to finish.",
  },
  {
    id: "logged-my-day",
    art: "calendar",
    label: "I logged how I am",
    earnedFor: "You put something on your calendar. Your doctor can see the whole picture.",
  },
];

export function stickerKind(id: StickerId): StickerKind {
  return STICKER_KINDS.find((s) => s.id === id) ?? STICKER_KINDS[0];
}

export type EarnedSticker = {
  id: StickerId;
  at: string;
};

// ---- "Where does it hurt?" body map ----
//
// A pain report is a list of spots, each one a place on the body plus a
// picture for how it feels and a face for how bad. It lives on this device
// only (see MyVoiceContext) and is read from there by the Appointment Prep
// summary and PDF — it never rides along on a draft into the account.

export type PainView = "front" | "back";

export type PainAreaId =
  | "head"
  | "neck"
  | "chest"
  | "upper-belly"
  | "lower-belly"
  | "head-back"
  | "neck-back"
  | "upper-back"
  | "lower-back"
  | "bottom"
  | "arm-right"
  | "arm-left"
  | "hand-right"
  | "hand-left"
  | "leg-right"
  | "leg-left"
  | "leg-right-back"
  | "leg-left-back"
  | "foot-right"
  | "foot-left";

export type PainArea = {
  id: PainAreaId;
  short: string;
  /** Lower-case, as it reads inside a sentence: "my lower belly". */
  label: string;
  /** Extra words at the full-sentence tier, e.g. where period pain is. */
  hint?: string;
};

export const PAIN_AREAS: PainArea[] = [
  { id: "head", short: "Head", label: "my head" },
  { id: "neck", short: "Neck", label: "my neck or throat" },
  { id: "chest", short: "Chest", label: "my chest" },
  { id: "upper-belly", short: "Upper belly", label: "my upper belly" },
  {
    id: "lower-belly",
    short: "Lower belly",
    label: "my lower belly",
    hint: "Below the belly button. Period pain is often here.",
  },
  { id: "head-back", short: "Back of head", label: "the back of my head" },
  { id: "neck-back", short: "Back of neck", label: "the back of my neck" },
  { id: "upper-back", short: "Upper back", label: "my upper back" },
  { id: "lower-back", short: "Lower back", label: "my lower back" },
  { id: "bottom", short: "Bottom", label: "my bottom" },
  { id: "arm-right", short: "Right arm", label: "my right arm" },
  { id: "arm-left", short: "Left arm", label: "my left arm" },
  { id: "hand-right", short: "Right hand", label: "my right hand" },
  { id: "hand-left", short: "Left hand", label: "my left hand" },
  { id: "leg-right", short: "Right leg", label: "my right leg" },
  { id: "leg-left", short: "Left leg", label: "my left leg" },
  { id: "leg-right-back", short: "Back of right leg", label: "the back of my right leg" },
  { id: "leg-left-back", short: "Back of left leg", label: "the back of my left leg" },
  { id: "foot-right", short: "Right foot", label: "my right foot" },
  { id: "foot-left", short: "Left foot", label: "my left foot" },
];

export function painArea(id: PainAreaId): PainArea {
  return PAIN_AREAS.find((a) => a.id === id) ?? PAIN_AREAS[0];
}

/** A tappable place on the outline, in the outline's 100 x 200 units. Arms,
 *  hands and feet appear on both views with the same id, so marking one shows
 *  on both. Left and right are the person's own: on the front view their
 *  right arm is on the viewer's left. */
export type PainHotspot = { area: PainAreaId; x: number; y: number; w: number; h: number };

export const PAIN_HOTSPOTS: Record<PainView, PainHotspot[]> = {
  front: [
    { area: "head", x: 50, y: 20, w: 30, h: 28 },
    { area: "neck", x: 50, y: 40.5, w: 18, h: 11 },
    { area: "chest", x: 50, y: 54.5, w: 40, h: 15 },
    { area: "upper-belly", x: 50, y: 71, w: 40, h: 16 },
    { area: "lower-belly", x: 50, y: 89.5, w: 40, h: 19 },
    { area: "arm-right", x: 19, y: 72, w: 13, h: 34 },
    { area: "arm-left", x: 81, y: 72, w: 13, h: 34 },
    { area: "hand-right", x: 18, y: 99, w: 16, h: 15 },
    { area: "hand-left", x: 82, y: 99, w: 16, h: 15 },
    { area: "leg-right", x: 41, y: 136, w: 14, h: 62 },
    { area: "leg-left", x: 59, y: 136, w: 14, h: 62 },
    { area: "foot-right", x: 41, y: 186, w: 18, h: 14 },
    { area: "foot-left", x: 59, y: 186, w: 18, h: 14 },
  ],
  back: [
    { area: "head-back", x: 50, y: 20, w: 30, h: 28 },
    { area: "neck-back", x: 50, y: 40.5, w: 18, h: 11 },
    { area: "upper-back", x: 50, y: 58, w: 40, h: 22 },
    { area: "lower-back", x: 50, y: 80, w: 40, h: 20 },
    { area: "bottom", x: 50, y: 99, w: 36, h: 16 },
    { area: "arm-left", x: 19, y: 72, w: 13, h: 34 },
    { area: "arm-right", x: 81, y: 72, w: 13, h: 34 },
    { area: "hand-left", x: 18, y: 99, w: 16, h: 15 },
    { area: "hand-right", x: 82, y: 99, w: 16, h: 15 },
    { area: "leg-left-back", x: 41, y: 139, w: 14, h: 54 },
    { area: "leg-right-back", x: 59, y: 139, w: 14, h: 54 },
    { area: "foot-left", x: 41, y: 186, w: 18, h: 14 },
    { area: "foot-right", x: 59, y: 186, w: 18, h: 14 },
  ],
};

/** The view an area is drawn on first — where its dot goes on the PDF. */
export function painAreaView(id: PainAreaId): PainView {
  return PAIN_HOTSPOTS.front.some((h) => h.area === id) ? "front" : "back";
}

export type PainKindId = "sharp" | "achy" | "burning" | "heavy" | "cramping" | "itchy";

export type PainKind = {
  id: PainKindId;
  icon: IconName;
  short: string;
  /** What gets read aloud, and the full-sentence label. */
  label: string;
  /** How it reads inside "It feels ___." */
  sentence: string;
};

export const PAIN_KINDS: PainKind[] = [
  { id: "sharp", icon: "pain-sharp", short: "Sharp", label: "Sharp, like a poke or a zap", sentence: "sharp" },
  { id: "achy", icon: "pain-achy", short: "Achy", label: "Achy and sore", sentence: "achy" },
  { id: "burning", icon: "pain-burning", short: "Burning", label: "Burning or hot", sentence: "like burning" },
  { id: "heavy", icon: "pain-heavy", short: "Heavy", label: "Heavy, like something pressing", sentence: "heavy" },
  { id: "cramping", icon: "pain-cramping", short: "Cramping", label: "Cramping, like squeezing", sentence: "crampy" },
  { id: "itchy", icon: "pain-itchy", short: "Itchy", label: "Itchy", sentence: "itchy" },
];

export function painKind(id: PainKindId): PainKind {
  return PAIN_KINDS.find((k) => k.id === id) ?? PAIN_KINDS[0];
}

export type PainLevel = 1 | 2 | 3 | 4 | 5;

export const PAIN_LEVELS: {
  level: PainLevel;
  icon: IconName;
  short: string;
  /** How it reads inside "It hurts ___." */
  sentence: string;
  tone: string;
}[] = [
  { level: 1, icon: "face-good", short: "A little bit", sentence: "a little bit", tone: "bg-sky-tint" },
  { level: 2, icon: "face-okay", short: "A little more", sentence: "a little more", tone: "bg-butter/40" },
  { level: 3, icon: "face-bad", short: "Even more", sentence: "even more", tone: "bg-coral/30" },
  { level: 4, icon: "face-awful", short: "A whole lot", sentence: "a whole lot", tone: "bg-coral/50" },
  { level: 5, icon: "face-worst", short: "The worst", sentence: "the worst it can", tone: "bg-coral/70" },
];

export function painLevel(level: PainLevel) {
  return PAIN_LEVELS[level - 1] ?? PAIN_LEVELS[0];
}

export type PainSpot = {
  area: PainAreaId;
  kind: PainKindId | null;
  level: PainLevel | null;
};

export type PainReport = {
  createdAt: string;
  spots: PainSpot[];
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "My lower belly hurts. It feels crampy. It hurts a whole lot — 4 out of 5." */
export function painSpotSentence(spot: PainSpot): string {
  const where = painArea(spot.area).label;
  const parts = [spot.kind === "itchy" ? `${capitalize(where)} is itchy.` : `${capitalize(where)} hurts.`];
  if (spot.kind && spot.kind !== "itchy") parts.push(`It feels ${painKind(spot.kind).sentence}.`);
  if (spot.level) {
    const verb = spot.kind === "itchy" ? "It bothers me" : "It hurts";
    parts.push(`${verb} ${painLevel(spot.level).sentence} — ${spot.level} out of 5.`);
  }
  return parts.join(" ");
}

export function painSentences(report: PainReport | null): string[] {
  return report ? report.spots.map(painSpotSentence) : [];
}

/** One line per spot for the summary and PDF, written for the clinician. */
export function painSummaryLine(spot: PainSpot): { title: string; detail: string } {
  const area = painArea(spot.area);
  return {
    title: area.short,
    detail: [
      spot.kind ? `Feels: ${painKind(spot.kind).short.toLowerCase()}` : "",
      spot.level ? `How bad: ${spot.level} of 5 (${painLevel(spot.level).short.toLowerCase()})` : "",
    ]
      .filter(Boolean)
      .join("   ·   "),
  };
}
