// Data + vocabulary for "Practice My Visit": rehearse a doctor visit before it
// happens, build a sentence to say, and keep speak-up cards ready.
//
// Everything here is scripted on purpose. The walkthrough text, the practice
// doctor's question and the sentence builder never generate anything — the
// sentence only repeats back what the person tapped, so nothing can drift
// into diagnosis or advice.

import type { IconName } from "../components/icons/Icon";
import {
  BodyPartId,
  CheckIn,
  ReadingLevel,
  SinceId,
  bodyPart,
  emptyCheckIn,
} from "./myVoice";

// ---- Visit types (one JSON file each in src/data/visits) ----

export type NoticeKind = "feel" | "hear" | "see" | "know";

export type VisitStep = {
  id: string;
  icon: IconName;
  /** Short label, used at the pictures-only tier and for the step dots. */
  short: string;
  title: string;
  body: string;
  notice: { kind: NoticeKind; text: string }[];
};

export type VisitType = {
  id: string;
  label: string;
  icon: IconName;
  steps: VisitStep[];
};

// A new visit type is a new JSON file — no code change needed. The known ones
// keep the order from the spec; anything added later goes on the end.
const ORDER = ["checkup", "blood-test", "dentist", "eye-doctor", "hearing", "new-doctor"];

const modules = import.meta.glob<VisitType>("../data/visits/*.json", {
  eager: true,
  import: "default",
});

export const VISIT_TYPES: VisitType[] = Object.values(modules).sort((a, b) => {
  const ia = ORDER.indexOf(a.id);
  const ib = ORDER.indexOf(b.id);
  return (ia === -1 ? ORDER.length : ia) - (ib === -1 ? ORDER.length : ib) || a.label.localeCompare(b.label);
});

export function visitType(id: string | null): VisitType | null {
  return VISIT_TYPES.find((v) => v.id === id) ?? null;
}

export const NOTICE_META: Record<NoticeKind, { icon: IconName; prefix: string }> = {
  feel: { icon: "hand", prefix: "Feel:" },
  hear: { icon: "ear", prefix: "Hear:" },
  see: { icon: "eye", prefix: "See:" },
  know: { icon: "check", prefix: "" },
};

export function noticeText(n: { kind: NoticeKind; text: string }): string {
  const prefix = NOTICE_META[n.kind].prefix;
  return prefix ? `${prefix} ${n.text}` : n.text;
}

/** What gets read aloud for a step, matching what the tier shows. */
export function stepSpoken(step: VisitStep, level: ReadingLevel): string {
  if (level === "icon") return step.short;
  return `${step.title} ${step.body}`;
}

// ---- Practice talking ----

export type HowMuchId = "little" | "medium" | "lot";

export const HOW_MUCH: { id: HowMuchId; icon: IconName; label: string; sentence: string }[] = [
  { id: "little", icon: "face-okay", label: "A little", sentence: "a little" },
  { id: "medium", icon: "face-bad", label: "Medium", sentence: "quite a bit" },
  { id: "lot", icon: "face-awful", label: "A lot", sentence: "a lot" },
];

export type PracticeSinceId = "today" | "few-days" | "weeks" | "long-time";

export const PRACTICE_SINCE: {
  id: PracticeSinceId;
  icon: IconName;
  label: string;
  sentence: string;
  /** The closest My Voice check-in value, so the doctor sheet keeps one shape. */
  checkIn: SinceId;
}[] = [
  { id: "today", icon: "since-today", label: "Today", sentence: "It started today.", checkIn: "today" },
  { id: "few-days", icon: "since-few-days", label: "A few days", sentence: "It started a few days ago.", checkIn: "few-days" },
  { id: "weeks", icon: "since-week", label: "Weeks", sentence: "It started weeks ago.", checkIn: "week-plus" },
  { id: "long-time", icon: "since-week", label: "A long time", sentence: "I have felt this for a long time.", checkIn: "week-plus" },
];

export type PracticeAnswers = {
  where: BodyPartId[];
  howMuch: HowMuchId | null;
  since: PracticeSinceId | null;
  isNew: boolean | null;
};

export function emptyAnswers(): PracticeAnswers {
  return { where: [], howMuch: null, since: null, isNew: null };
}

const PLURAL_PARTS: BodyPartId[] = ["eyes", "ears", "arms", "hands", "legs", "feet"];

function listOut(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** The person's taps, said back as short first-person sentences. Only ever
 *  repeats what was picked — it never says what a symptom could mean. */
export function practiceSentences(a: PracticeAnswers): string[] {
  const lines: string[] = [];
  const amount = HOW_MUCH.find((h) => h.id === a.howMuch);

  if (a.where.length) {
    const words = a.where.map((id) => bodyPart(id).sentence);
    const plural = a.where.length > 1 || PLURAL_PARTS.includes(a.where[0]);
    const verb = plural ? "hurt" : "hurts";
    lines.push(`My ${listOut(words)} ${verb}${amount ? ` ${amount.sentence}` : ""}.`);
  } else if (amount) {
    lines.push(`It hurts ${amount.sentence}.`);
  }

  const since = PRACTICE_SINCE.find((s) => s.id === a.since);
  if (since) lines.push(since.sentence);

  if (a.isNew === true) lines.push("This is new for me.");
  if (a.isNew === false) lines.push("This is not new for me.");

  return lines;
}

/** Severe pain that started today: stop and point to a trusted grown-up or
 *  911 before anything else, the same rule the AI assistant follows. */
export function needsEmergencyRedirect(a: PracticeAnswers): boolean {
  return a.howMuch === "lot" && a.since === "today";
}

/** The approved sentence as a My Voice check-in, so it reaches the doctor
 *  sheet (Appointment Prep + PDF) through the same path as everything else. */
export function answersToCheckIn(a: PracticeAnswers): CheckIn {
  return {
    ...emptyCheckIn(),
    bodyParts: a.where,
    since: PRACTICE_SINCE.find((s) => s.id === a.since)?.checkIn ?? null,
    ownWords: practiceSentences(a),
  };
}

// ---- Speak-up cards ----

export type SpeakUpCard = { id: string; icon: IconName; text: string };

export const DEFAULT_CARDS: SpeakUpCard[] = [
  { id: "talk-to-me", icon: "talk", text: "Please talk to me." },
  { id: "slower", icon: "since-week", text: "Can you say that slower?" },
  { id: "show-me", icon: "eye", text: "Can you show me first?" },
  { id: "break", icon: "breath", text: "I need a break." },
  { id: "not-usual", icon: "face-bad", text: "This is not how I usually feel." },
  { id: "helper", icon: "person", text: "I want my helper to stay." },
];

/** Pictures someone can pick for a card they make themselves. */
export const CARD_ICONS: IconName[] = [
  "card",
  "talk",
  "hand",
  "face-good",
  "face-bad",
  "breath",
  "person",
  "ear",
  "eye",
  "stop",
  "check",
  "celebrate",
];

// ---- After my visit ----

export type AfterVisit = {
  createdAt: string;
  visitType: string | null;
  howItWent: "good" | "okay" | "hard" | null;
  doctorTalkedToMe: "yes" | "little" | "no" | null;
  saidWhatIWanted: "yes" | "some" | "not-yet" | null;
  note: string;
};

export function emptyAfterVisit(visitTypeId: string | null): AfterVisit {
  return {
    createdAt: new Date().toISOString(),
    visitType: visitTypeId,
    howItWent: null,
    doctorTalkedToMe: null,
    saidWhatIWanted: null,
    note: "",
  };
}

// ---- The upcoming visit (for the countdown) ----

export type PlannedVisit = {
  /** yyyy-mm-dd, local. */
  date: string;
  doctor: string;
};

/** Whole days from today to the visit; negative once it has passed. */
export function daysUntil(date: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const visit = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((visit.getTime() - today.getTime()) / 86_400_000);
}

export function countdownText(days: number): string {
  if (days === 0) return "My visit is today";
  if (days === 1) return "My visit is tomorrow";
  if (days > 1) return `My visit is in ${days} days`;
  return "My visit already happened";
}

// ---- Local storage ----
// Everything Practice My Visit keeps stays on this device. Nothing here is
// uploaded; the only thing that leaves the screen is a sentence the person
// says yes to, and that goes through My Voice's own saved check-in.

export const PRACTICE_KEYS = {
  progress: "verity-practice-visit-progress",
  plan: "verity-practice-visit-plan",
  cards: "verity-practice-visit-cards",
  log: "verity-practice-visit-log",
  after: "verity-practice-visit-after",
};

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Blocked or full storage: the practice still works, it just won't resume.
  }
}

/** How many practices were finished in the last seven days. */
export function practicesThisWeek(log: string[], now = Date.now()): number {
  return log.filter((at) => now - new Date(at).getTime() < 7 * 86_400_000).length;
}
